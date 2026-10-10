import { compareAmounts, formatPercent } from '../utils/comparisons';
import { fmtARS } from '../utils/formatters';

export default function MonthComparison({current, previous, hasPrevious, hasCurrent = true, previousLabel, partial = false, income = false}) {
  if (!hasPrevious || !hasCurrent) return <div className="comparison-note">{!hasCurrent ? 'Todavía no hay registros en el mes seleccionado.' : `Sin registros en ${previousLabel} para comparar.`}</div>;
  const {delta, percent} = compareAmounts(current, previous);
  return <section className="month-comparison" aria-label="Comparación con el mes anterior">
    <div><span className="small muted">Diferencia con {previousLabel}</span><strong className={`money ${delta > 0 ? (income?'decrease':'increase') : delta < 0 ? (income?'increase':'decrease') : ''}`}>{delta === 0 ? 'Sin cambios' : `${delta > 0 ? '+' : '−'}${fmtARS(Math.abs(delta))}`}</strong></div>
    <span className={`comparison-percent ${delta===0?'unchanged':''}`}>{formatPercent(percent)}</span>
    <p className="small muted">Anterior: {fmtARS(previous)}{partial && <span className="comparison-caution">Mes en curso: se compara lo registrado hasta hoy con el total registrado del mes anterior.</span>}</p>
  </section>;
}
