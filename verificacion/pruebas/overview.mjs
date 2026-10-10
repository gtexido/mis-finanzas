// Overview calculations use synthetic records only. No backend or credentials required.
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true } });
const { buildOverview, allExpenses } = await server.ssrLoadModule('/src/utils/overview.js');
const { diasRestantes, fechaValida } = await server.ssrLoadModule('/src/utils/dates.js');
const today = new Date(2026, 9, 5, 12);
const item = (id, extra = {}) => ({ id, servicio: id, estado: 'pendiente', monto: 100, moneda: 'ARS', vencimiento: '2026-10-05', ...extra });
const results = [];
function test(id, title, run) { try { run(); results.push({ id, title, status: 'correcto' }); } catch (error) { results.push({ id, title, status: 'fallo', error: error.message }); } }
test('PAN-01', 'Pendientes de otros meses mantienen su período y no se pierden', () => {
  const expenses = allExpenses({ gastos: { '2026-09': [item('old', { vencimiento: '2026-09-29' })], '2026-10': [item('current')], '2026-11': [item('future', { vencimiento: '2026-11-03' })] } });
  const o = buildOverview(expenses, 1000, today);
  assert.equal(o.groups.urgent.length, 2); assert.equal(o.groups.urgent[0].mesKey, '2026-09'); assert.equal(o.pendingTotal, 300); assert.equal(o.groups.later.length, 1);
});
test('PAN-02', 'Avisos sin duplicación: urgencia primero, fechas estimadas a revisión', () => {
  const o = buildOverview([item('urgent-review', { requiereRevision: true, motivoRevision: 'MONTO' }), item('estimated', { vencimiento: '2026-09-01', requiereRevision: true, origenMovimiento: 'REPLICA_MES' }), item('soon-review', { vencimiento: '2026-10-08', requiereRevision: true, motivoRevision: 'MONTO' })], 1000, today);
  assert.deepEqual(o.groups.urgent.map(g => g.id), ['urgent-review']); assert.deepEqual(o.groups.review.map(g => g.id), ['estimated']); assert.equal(o.summaries.soon.count, 1); assert.equal(o.attentionCount, 3); assert.equal(new Set(Object.values(o.groups).flat().map(g => g.id)).size, 3);
});
test('PAN-03', 'Débitos alcanzados requieren verificar; pagados no vuelven a vencer', () => {
  const o = buildOverview([item('auto', { formaPago: 'Débito automático', vencimiento: '2026-10-04' }), item('auto-paid', { formaPago: 'Débito automático', estado: 'pagado' }), item('auto-soon', { formaPago: 'Débito automático', vencimiento: '2026-10-06' })], 1000, today);
  assert.equal(o.groups.urgent.length, 0); assert.equal(o.summaries.debits.count, 1); assert.equal(o.summaries.soon.count, 1); assert.equal(o.pendingTotal, 200);
});
test('PAN-04', 'Pagados por revisar visibles sin aumentar la deuda pendiente', () => {
  const o = buildOverview([item('paid-review', { estado: 'pagado', requiereRevision: true, monto: 450 }), item('pending')], 1000, today);
  assert.equal(o.pendingTotal, 100); assert.equal(o.summaries.review.amount, 450); assert.equal(o.attentionCount, 2);
});
test('PAN-05', 'Importes ARS, USD y desgloses respetan la conversión existente', () => {
  const o = buildOverview([item('ars', { monto: 120.5 }), item('usd', { moneda: 'USD', monto: 10, tipoCambio: 1500 }), item('detail', { monto: 99999, subconceptos: [{ monto: 100.25, moneda: 'ARS' }, { monto: 2, moneda: 'USD', tipoCambio: 1200 }] })], 1000, today);
  assert.equal(o.pendingTotal, 17620.75); assert.equal(o.summaries.urgent.amount, 17620.75);
});
test('PAN-06', 'Fechas ausentes o imposibles piden revisión y nunca generan NaN', () => {
  for (const date of ['', null, 'no-fecha', '2026-02-30']) { assert.equal(fechaValida(date), false); const o = buildOverview([item('invalid', { vencimiento: date })], 1000, today); assert.equal(o.summaries.review.count, 1); assert.equal(o.next, null); }
  assert.equal(fechaValida('2028-02-29'), true);
});
test('PAN-07', 'Ventana de tres días y próximo pago cruzan meses correctamente', () => {
  const o = buildOverview([item('next-month', { vencimiento: '2026-11-01' }), item('four-days', { vencimiento: '2026-11-03' }), item('estimated', { vencimiento: '2026-10-31', requiereRevision: true, origenMovimiento: 'REPLICA_MES' })], 1000, new Date(2026, 9, 30, 23));
  assert.equal(o.next.id, 'next-month'); assert.equal(o.next.daysRemaining, 2); assert.equal(o.summaries.soon.count, 1); assert.equal(o.groups.later.length, 1);
  assert.equal(diasRestantes('2026-03-09', new Date(2026, 2, 8, 12)), 1);
});
test('PAN-08', 'Sin registros o todo pagado: cero tareas sin importes ficticios', () => {
  for (const expenses of [[], [item('paid', { estado: 'pagado' })]]) { const o = buildOverview(expenses, 1000, today); assert.equal(o.attentionCount, 0); assert.equal(o.pendingTotal, 0); assert.equal(o.next, null); }
});
await mkdir('verificacion/panorama', { recursive: true });
await writeFile('verificacion/panorama/calculos.json', JSON.stringify(results, null, 2));
for (const result of results) console.log(result.id, result.status, result.error || '');
await server.close(); if (results.some(result => result.status === 'fallo')) process.exitCode = 1;
