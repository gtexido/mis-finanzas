import { useRef, useState } from 'react';
import { getMesKey, MESES } from '../utils/dates';
import { fmtARS, fmtFecha } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { hasUnconfirmedDue, isAutomaticDebit } from '../utils/paymentStatus';
import { allExpenses, buildOverview, ATTENTION_FILTERS } from '../utils/overview';
import ExpenseBadges from './ExpenseBadges';
import UiIcon from './UiIcon';

export default function VencimientosView({ data, mesActual, tc, today, selection, onSelectionChange, onEdit, onMarcarPagado }) {
  const [saving, setSaving] = useState(null);
  const savingRef = useRef(false);
  const { filter, scope } = selection;
  const soloMes = scope === 'month';
  const key = getMesKey(mesActual.y, mesActual.m);
  const overview = buildOverview(allExpenses(data).filter(g => !soloMes || g.mesKey === key), tc, today);
  const selected = ATTENTION_FILTERS.find(item => item.id === filter);
  const visible = selected ? overview.groups[filter] : Object.values(overview.groups).flat();
  const paidReview = overview.groups.review.filter(g => g.estado === 'pagado').length;
  const amount = selected ? overview.summaries[filter].amount : overview.pendingTotal;
  async function pay(g) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(g.id);
    try { await onMarcarPagado(g.id, g.mesKey); }
    finally { savingRef.current = false; setSaving(null); }
  }
  const group = (title, items, tone = '') => items.length > 0 && <section className={`due-section ${tone}`}><h2>{title} <span className="muted">· {items.length}</span></h2>{items.map(g => <article className={`due-item ${tone}`} key={`${g.mesKey}_${g.id}`}>
    <button className="summary-row" onClick={() => onEdit(g,g.mesKey)} aria-label={`Editar ${g.servicio}`}><span className="row-icon"><UiIcon name={isAutomaticDebit(g)?'repeat':'calendar'} size={19}/></span><span className="row-copy"><strong>{g.servicio || 'Sin concepto'}</strong><small>{hasUnconfirmedDue(g)?'Fecha por confirmar':fmtFecha(g.vencimiento)} · {g.mesKey}</small></span><span className="money">{fmtARS(montoReal(g,tc))}</span></button>
    <div className="due-badges"><ExpenseBadges item={g}/></div>
    <footer><button className="text-button" onClick={()=>onEdit(g,g.mesKey)}><UiIcon name="edit" size={16}/>Revisar</button>{g.estado === 'pendiente' ? <button disabled={saving!==null} onClick={() => pay(g)}>{saving===g.id?'Guardando…':isAutomaticDebit(g)?'Confirmar débito':'Marcar como pagado'}</button> : <span>Pagado · revisá los datos</span>}</footer>
  </article>)}</section>;
  return <div className="dues-view">
    <div className="filter-chips due-scope" aria-label="Alcance de vencimientos"><button aria-pressed={!soloMes} onClick={() => onSelectionChange({ ...selection, scope: 'all' })}>Todos los meses</button><button aria-pressed={soloMes} onClick={() => onSelectionChange({ ...selection, scope: 'month' })}>Solo {MESES[mesActual.m].toLowerCase()}</button></div>
    <section className="report-total due-total" aria-live="polite"><div className="section-line"><span className="eyebrow muted">{selected ? selected.label : 'Total pendiente'}</span>{selected && <button className="text-button" onClick={() => onSelectionChange({ ...selection, filter: 'all' })}>Ver todos<UiIcon name="close" size={14}/></button>}</div><div className="money">{fmtARS(amount)}</div><p className="small muted">{selected ? `${visible.length} ${filter === 'review' ? 'registros · importe a revisar, incluso si ya se pagó' : 'pagos pendientes'}` : `${overview.pending.length} pagos pendientes${paidReview ? ` · ${paidReview} pagados por revisar` : ''}`} · {soloMes ? MESES[mesActual.m].toLowerCase() : 'todos los meses'}</p></section>
    <div className="attention-filters" aria-label="Filtrar avisos">{ATTENTION_FILTERS.map(({ id, label, icon }) => <button key={id} className={id} aria-pressed={filter === id} onClick={() => onSelectionChange({ ...selection, filter: filter === id ? 'all' : id })}><UiIcon name={icon} size={16}/><span>{label}</span><strong>{overview.summaries[id].count}</strong></button>)}</div>
    {(!selected || filter === 'urgent') && <>{group('Vencidos',overview.groups.urgent.filter(g => g.daysRemaining < 0),'urgent')}{group('Vencen hoy',overview.groups.urgent.filter(g => g.daysRemaining === 0),'urgent')}</>}
    {(!selected || filter === 'debits') && group('Verificar débitos',overview.groups.debits,'debits')}
    {(!selected || filter === 'soon') && group('Próximos 3 días',overview.groups.soon,'soon')}
    {(!selected || filter === 'review') && group('Por revisar',overview.groups.review,'review')}
    {!selected && group('Más adelante',overview.groups.later)}
    {!visible.length && <div className="empty-state"><UiIcon name="check" size={32}/><h3>{selected ? 'Sin avisos en este filtro' : 'Todo al día'}</h3><p>{selected ? 'No hay registros que necesiten esta acción en el período elegido.' : 'No hay pagos ni revisiones pendientes en este período.'}</p>{selected && <button className="text-button" onClick={() => onSelectionChange({ ...selection, filter: 'all' })}>Ver todos los pendientes<UiIcon name="arrow" size={16}/></button>}</div>}
  </div>;
}
