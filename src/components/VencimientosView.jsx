import { useRef, useState } from 'react';
import { diasRestantes, getMesKey, MESES } from '../utils/dates';
import { fmtARS, fmtFecha } from '../utils/formatters';
import { montoReal } from '../utils/money';
import UiIcon from './UiIcon';
export default function VencimientosView({ data, mesActual, tc, onEdit, onMarcarPagado }) {
  const [soloMes, setSoloMes] = useState(false);
  const [saving, setSaving] = useState(null);
  const savingRef = useRef(false);
  const key = getMesKey(mesActual.y, mesActual.m);
  const pending = Object.entries(data.gastos || {}).flatMap(([mesKey, gastos]) => gastos.map(g => ({ ...g, mesKey }))).filter(g => g.estado === 'pendiente' && (!soloMes || g.mesKey === key));
  const dated = pending.filter(g => g.vencimiento).sort((a,b) => a.vencimiento.localeCompare(b.vencimiento));
  const overdue = dated.filter(g => diasRestantes(g.vencimiento) < 0);
  const upcoming = dated.filter(g => diasRestantes(g.vencimiento) >= 0);
  const undated = pending.filter(g => !g.vencimiento);
  const next = upcoming[0];
  async function pay(g) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(g.id);
    try { await onMarcarPagado(g.id, g.mesKey); }
    finally { savingRef.current = false; setSaving(null); }
  }
  const group = (title, items, isOverdue = false) => items.length > 0 && <section className="due-section"><h2 style={{color:isOverdue?'var(--danger)':undefined}}>{title} <span className="muted">· {items.length}</span></h2>{items.map(g => <article className="due-item" key={`${g.mesKey}_${g.id}`}>
    <button className="summary-row" onClick={() => onEdit(g,g.mesKey)} aria-label={`Editar ${g.servicio}`}><span className="row-icon"><UiIcon name="calendar" size={19}/></span><span className="row-copy"><strong>{g.servicio || 'Sin concepto'}</strong><small>{g.vencimiento ? fmtFecha(g.vencimiento) : 'Fecha por confirmar'} · {g.mesKey}{g.requiereRevision?' · Revisar':''}</small></span><span className="money">{fmtARS(montoReal(g,tc))}</span></button>
    <footer><span>{!g.vencimiento?'Revisá los datos':isOverdue?`Venció hace ${Math.abs(diasRestantes(g.vencimiento))} días`:diasRestantes(g.vencimiento)===0?'Vence hoy':`En ${diasRestantes(g.vencimiento)} días`}</span><button disabled={saving!==null} onClick={() => pay(g)}>{saving===g.id?'Guardando…':'Marcar como pagado'}</button></footer>
  </article>)}</section>;
  return <>
    <div className="filter-chips" aria-label="Alcance de vencimientos"><button aria-pressed={!soloMes} onClick={() => setSoloMes(false)}>Todos los meses</button><button aria-pressed={soloMes} onClick={() => setSoloMes(true)}>Solo {MESES[mesActual.m].toLowerCase()}</button></div>
    <section className="report-total"><span className="eyebrow muted">Total pendiente · {soloMes?'mes seleccionado':'todos los meses'}</span><div className="money">{fmtARS(pending.reduce((sum,g) => sum+montoReal(g,tc),0))}</div></section>
    <div className="due-summary"><div><small>Pagos vencidos</small><strong style={{color:overdue.length?'var(--danger)':'var(--mint)'}}>{overdue.length}</strong></div><div><small>Próximo pago</small><strong>{next?(diasRestantes(next.vencimiento)===0?'Hoy':`En ${diasRestantes(next.vencimiento)} días`):'Sin próximos'}</strong></div></div>
    {group('Vencidos',overdue,true)}{group('Próximos pagos',upcoming)}{group('Por confirmar',undated)}
    {!pending.length&&<div className="empty-state"><UiIcon name="check" size={32}/><h3>Todo al día</h3><p>No hay pagos pendientes en este período.</p></div>}
  </>;
}
