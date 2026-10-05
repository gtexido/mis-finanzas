import { diasRestantes } from './dates';

export const normalizedPayment = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function isAutomaticDebit(item = {}, config = {}) {
  const instrument = (config.instrumentosPago || []).find(i => i.id === item.instrumentoId);
  return [item.instrumentoId, item.instrumentoNombre, item.instrumento, item.formaPago, instrument?.nombre]
    .some(value => normalizedPayment(value).includes('debitoautomatico'));
}

export function hasUnconfirmedDue(item = {}) {
  return !item.vencimiento || (!!item.requiereRevision &&
    (item.origenMovimiento === 'REPLICA_MES' || String(item.motivoRevision || '').includes('VENCIMIENTO')));
}

export function expenseAttention(item, remaining = item.vencimiento ? diasRestantes(item.vencimiento) : null) {
  if (item.estado === 'pagado') return {kind:'paid', label:'Pagado', icon:'check'};
  if (hasUnconfirmedDue(item)) return {kind:'review', label:'Confirmar fecha', icon:'calendar'};
  if (isAutomaticDebit(item)) return remaining <= 0
    ? {kind:'soon', label:remaining === 0 ? 'Verificar débito · hoy' : 'Verificar débito', icon:'repeat'}
    : {kind:'neutral', label:`Débito previsto en ${remaining} día${remaining === 1 ? '' : 's'}`, icon:'calendar'};
  if (remaining < 0) return {kind:'overdue', label:`Vencido · hace ${Math.abs(remaining)} día${remaining === -1 ? '' : 's'}`, icon:'alert'};
  if (remaining === 0) return {kind:'overdue', label:'Vence hoy', icon:'alert'};
  if (remaining <= 3) return {kind:'soon', label:`Vence en ${remaining} día${remaining === 1 ? '' : 's'}`, icon:'calendar'};
  return {kind:'neutral', label:`Vence en ${remaining} días`, icon:'calendar'};
}

export function reviewLabel(item = {}) {
  if (!item.requiereRevision) return '';
  if (item.estado !== 'pagado' && hasUnconfirmedDue(item)) return 'Confirmar importe y fecha';
  if (item.origenMovimiento === 'REPLICA_MES' || String(item.motivoRevision || '').includes('MONTO')) return 'Confirmar importe';
  return 'Datos por revisar';
}

export function replicationKey(item = {}) {
  return [normalizedPayment(item.servicio || item.conceptoManual || item.conceptoNombre),
    item.medioPagoId || normalizedPayment(item.medioPagoNombre || item.medioPago || item.categoria),
    isAutomaticDebit(item) ? 'automatico' : item.instrumentoId || normalizedPayment(item.formaPago),
    item.moneda || 'ARS'].join('|');
}

// Consume matching destination rows one at a time: legitimate repeated charges remain selectable.
export function missingReplicas(source, destination) {
  const counts = new Map();
  destination.forEach(item => {const key = replicationKey(item); counts.set(key, (counts.get(key) || 0) + 1);});
  return source.filter(item => {const key = replicationKey(item), count = counts.get(key) || 0;
    if (count) {counts.set(key, count - 1); return false;} return true;});
}
