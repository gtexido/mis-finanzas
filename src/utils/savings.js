// A savings allocation is separate from consumption. ARS cash-flow equivalents
// are fixed at entry time; the accumulated balance stays in its native currency.
export const savingsKinds = { aporte: 'Apartar ahorro', retiro: 'Retirar ahorro', inicial: 'Ahorro que ya tenía' };
export const savingsKey = item => JSON.stringify([item.currency, ...[item.destination, item.goal].map(value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())]);
export const cents = value => Math.round(Number(value) * 100);
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function savingsSummary(records = [], period, cutoff = '9999-12-31') {
  const active = records.filter(row => row.active !== false && row.date <= cutoff);
  const pockets = new Map();
  let contributions = 0, withdrawals = 0;
  for (const row of active) {
    const key = savingsKey(row), pocket = pockets.get(key) || { key, destination: row.destination, goal: row.goal, currency: row.currency, balanceCents: 0 };
    pocket.balanceCents += cents(row.amount) * (row.kind === 'retiro' ? -1 : 1);
    pockets.set(key, pocket);
    if (row.date.startsWith(period || '') && row.kind !== 'inicial') {
      if (row.kind === 'aporte') contributions += cents(row.impactARS);
      else withdrawals += cents(-row.impactARS);
    }
  }
  const values = [...pockets.values()].map(pocket => ({...pocket, balance: pocket.balanceCents / 100}));
  return { pockets: values, ars: values.filter(p=>p.currency==='ARS').reduce((n,p)=>n+p.balanceCents,0)/100, usd: values.filter(p=>p.currency==='USD').reduce((n,p)=>n+p.balanceCents,0)/100, contributions: contributions/100, withdrawals: withdrawals/100, net: (contributions-withdrawals)/100 };
}
export function validateSavingsLedger(records) {
  const pockets = new Map();
  for (const row of records.filter(row => row.active !== false)) {
    const key = savingsKey(row), pocket = pockets.get(key) || { initials: 0, days: new Map(), label: row.goal || row.destination };
    if (row.kind === 'inicial' && ++pocket.initials > 1) throw new Error('Ese ahorro ya tiene un saldo inicial. Editá el existente o registrá un aporte.');
    pocket.days.set(row.date, (pocket.days.get(row.date) || 0) + cents(row.amount) * (row.kind === 'retiro' ? -1 : 1));
    pockets.set(key, pocket);
  }
  for (const pocket of pockets.values()) {
    let balance = 0;
    for (const [, delta] of [...pocket.days].sort(([a],[b])=>a.localeCompare(b))) {
      balance += delta;
      if (balance < 0) throw new Error(`El movimiento dejaría sin fondos a «${pocket.label}» para un retiro. Revisá importe, moneda y fecha.`);
    }
  }
}
