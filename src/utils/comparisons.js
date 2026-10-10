export function compareAmounts(current, previous) {
  const delta = Math.round((Number(current) - Number(previous)) * 100) / 100;
  return {delta, percent: Number(previous) > 0 ? delta / Number(previous) * 100 : null};
}

export function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) return 'Sin base para %';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('es-AR', {maximumFractionDigits:1})}%`;
}

export function previousPeriod({y,m}) {
  const date = new Date(y, m - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
}
