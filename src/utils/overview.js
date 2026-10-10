import { diasRestantes } from './dates';
import { montoReal } from './money';
import { hasUnconfirmedDue, isAutomaticDebit } from './paymentStatus';

export const ATTENTION_FILTERS = [
  { id: 'urgent', label: 'Vencidos y hoy', icon: 'alert', empty: 'Sin urgencias' },
  { id: 'soon', label: 'Próximos 3 días', icon: 'calendar', empty: 'Sin próximos' },
  { id: 'debits', label: 'Verificar débitos', icon: 'repeat', empty: 'Sin verificaciones' },
  { id: 'review', label: 'Por revisar', icon: 'edit', empty: 'Sin revisiones' },
];

export const allExpenses = data => Object.entries(data.gastos || {})
  .flatMap(([mesKey, expenses]) => expenses.map(expense => ({ ...expense, mesKey })));

// One task per expense: urgency takes precedence over an amount review.
// Estimated, missing and invalid dates cannot become confirmed overdue payments.
export function buildOverview(expenses, tc, today = new Date()) {
  const groups = { urgent: [], soon: [], debits: [], review: [], later: [] };
  const pending = [], dated = [];
  for (const expense of expenses) {
    const isPending = expense.estado === 'pendiente';
    if (!isPending && !expense.requiereRevision) continue;
    const daysRemaining = hasUnconfirmedDue(expense) ? null : diasRestantes(expense.vencimiento, today);
    const item = { ...expense, daysRemaining };
    if (isPending) pending.push(item);
    if (isPending && daysRemaining !== null) dated.push(item);
    const group = !isPending || daysRemaining === null ? 'review'
      : daysRemaining <= 0 ? (isAutomaticDebit(item) ? 'debits' : 'urgent')
      : daysRemaining <= 3 ? 'soon'
      : item.requiereRevision ? 'review' : 'later';
    groups[group].push(item);
  }
  const byDue = (a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity)
    || String(a.mesKey || '').localeCompare(String(b.mesKey || ''))
    || String(a.servicio || '').localeCompare(String(b.servicio || ''), 'es');
  Object.values(groups).forEach(items => items.sort(byDue));
  const sum = items => items.reduce((total, item) => total + montoReal(item, tc), 0);
  const summaries = Object.fromEntries(Object.entries(groups).map(([id, items]) => [id, { count: items.length, amount: sum(items) }]));
  return {
    groups, summaries, pending, pendingTotal: sum(pending),
    attentionCount: ATTENTION_FILTERS.reduce((total, { id }) => total + groups[id].length, 0),
    next: dated.filter(item => item.daysRemaining >= 0).sort(byDue)[0] || null,
  };
}
