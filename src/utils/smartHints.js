import { normalizedPayment, isAutomaticDebit, hasUnconfirmedDue } from './paymentStatus';
import { obtenerDetalleMovimiento } from './money';
import { compareAmounts } from './comparisons';
import { medioPagoDesdeCategoriaLegacy } from './legacy';

const conceptId = item => item.conceptoId || item.concepto_id;
const sameConcept = (a, b) => conceptId(a) && conceptId(b)
  ? conceptId(a) === conceptId(b)
  : !!normalizedPayment(a.servicio) && normalizedPayment(a.servicio) === normalizedPayment(b.servicio);
const accountId = item => {
  const id = item.medioPagoId || item.medio_pago_id || medioPagoDesdeCategoriaLegacy(item.categoria);
  return id === 'mp_sin_definir' ? '' : id;
};
const sameAccount = (a, b) => {
  const first = accountId(a), second = accountId(b);
  if (first && second) return first === second;
  const name = normalizedPayment(a.medioPagoNombre || a.medioPago);
  return !!name && name === normalizedPayment(b.medioPagoNombre || b.medioPago);
};

// Compare original currencies; exchange-rate changes do not change a bill's native amount.
export function nativeAmounts(item) {
  const details = obtenerDetalleMovimiento(item);
  const totals = {};
  for (const row of details.length ? details : [item]) {
    const currency = String(row.moneda || item.moneda || 'ARS').toUpperCase();
    const amount = Number(row.monto ?? row.montoUSD);
    if (!['ARS', 'USD'].includes(currency) || !Number.isFinite(amount) || amount <= 0) return null;
    totals[currency] = (totals[currency] || 0) + amount;
  }
  return Object.fromEntries(Object.entries(totals).map(([currency, amount]) => [currency, Math.round(amount * 100) / 100]));
}

export function findPossibleDuplicate(draft, records) {
  const amounts = nativeAmounts(draft);
  if (!amounts) return null;
  return records.find(item => {
    if ((draft.id && draft.id === item.id) || !sameConcept(draft, item) || !sameAccount(draft, item)) return false;
    const sameDay = Number.isInteger(Number(draft.dia)) && Number(draft.dia) > 0 && Number(draft.dia) === Number(item.dia);
    const sameDue = !hasUnconfirmedDue(draft) && !hasUnconfirmedDue(item) && draft.vencimiento === item.vencimiento;
    if (!sameDay && !sameDue) return false;
    const other = nativeAmounts(item);
    return !!other && Object.keys(amounts).length === Object.keys(other).length
      && Object.entries(amounts).every(([currency, amount]) => other[currency] === amount);
  }) || null;
}

export function recurringIncreases(current, previous) {
  const matching = (a, b) => sameConcept(a, b) && sameAccount(a, b);
  return current.flatMap(item => {
    // Ambiguous repeated charges and unconfirmed amounts are intentionally omitted.
    const matches = previous.filter(old => matching(item, old));
    if (matches.length !== 1 || current.filter(other => matching(item, other)).length !== 1) return [];
    const old = matches[0];
    if (item.requiereRevision || old.requiereRevision || !(item.esRecurrente || old.esRecurrente || isAutomaticDebit(item) || isAutomaticDebit(old))) return [];
    const now = nativeAmounts(item), before = nativeAmounts(old);
    if (!now || !before || Object.keys(now).length !== 1 || Object.keys(before).length !== 1) return [];
    const currency = Object.keys(now)[0];
    if (!before[currency] || now[currency] <= before[currency]) return [];
    const change = compareAmounts(now[currency], before[currency]);
    return [{ item, previous: old, currency, currentAmount: now[currency], previousAmount: before[currency], ...change }];
  }).sort((a, b) => b.percent - a.percent || String(a.item.servicio).localeCompare(String(b.item.servicio), 'es'));
}

export function nextAction(overview) {
  const { urgent, debits, soon, review } = overview.groups;
  if (urgent.length) {
    const overdue = urgent.filter(item => item.daysRemaining < 0).length;
    const today = urgent.length - overdue;
    const total = urgent.length + debits.length;
    return { filter: debits.length ? 'all' : 'urgent', tone: 'urgent', icon: 'alert',
      title: `Tenés ${total} ${total === 1 ? 'pago para atender' : 'pagos para atender'}`,
      detail: [overdue && `${overdue} ${overdue === 1 ? 'vencido' : 'vencidos'}`, today && `${today} ${today === 1 ? 'vence' : 'vencen'} hoy`, debits.length && `${debits.length} ${debits.length === 1 ? 'débito por verificar' : 'débitos por verificar'}`].filter(Boolean).join(' · ') };
  }
  if (debits.length) return { filter: 'debits', tone: 'debits', icon: 'repeat', title: `Verificá ${debits.length} ${debits.length === 1 ? 'débito automático' : 'débitos automáticos'}`, detail: 'Confirmá el cobro al verlo en tu cuenta.' };
  if (soon.length) return { filter: 'soon', tone: 'soon', icon: 'calendar', title: 'Prepará tus próximos pagos', detail: `${soon[0].servicio} ${soon[0].daysRemaining === 1 ? 'vence mañana' : `vence en ${soon[0].daysRemaining} días`}` };
  if (review.length) return { filter: 'review', tone: 'review', icon: 'edit', title: `Confirmá ${review.length} ${review.length === 1 ? 'registro' : 'registros'}`, detail: 'Revisá el importe o la fecha antes de seguir.' };
  return null;
}
