import { useState } from 'react';
import { montoReal, montoUSDReal } from '../utils/money';
import { fmtARS, fmtUSD, fmtMonto, fmtFecha } from '../utils/formatters';
import UiIcon from './UiIcon';
import ExpenseBadges from './ExpenseBadges';
import { hasUnconfirmedDue, isAutomaticDebit } from '../utils/paymentStatus';
export default function MovementRow({ item, tc, month, onEdit, onToggle, onDelete, onConvert, busy }) {
  const [expanded,setExpanded]=useState(false);
  const paid=item.estado==='pagado';
  const details=item.subconceptos || [];
  const meta=[`Día ${item.dia}/${month+1}`, item.instrumentoNombre || item.formaPago].filter(Boolean).join(' · ');
  return <article className="movement-row">
    <button className="summary-row" onClick={()=>onEdit(item)} aria-label={`Editar ${item.servicio}`}><span className="row-copy"><strong>{item.servicio}</strong><small>{meta}</small></span><span className="movement-amount"><strong className="money">{fmtARS(montoReal(item,tc))}</strong>{montoUSDReal(item)>0&&<small>{fmtUSD(montoUSDReal(item))} USD</small>}</span><UiIcon name="chevron" size={15}/></button>
    <ExpenseBadges item={item}/>
    <div className="row-actions"><button className="text-button" onClick={()=>onEdit(item)}><UiIcon name="edit" size={16}/>Editar</button><button className="text-button delete-link" aria-label={`Eliminar ${item.servicio}`} onClick={()=>onDelete(item)}><UiIcon name="trash" size={16}/>Eliminar</button><button className={`status-button ${paid?'paid':'pending'}`} disabled={busy} onClick={()=>onToggle(item.id)} aria-label={`${paid?'Marcar pendiente':'Marcar como pagado'}: ${item.servicio}`}>{paid?'Marcar pendiente':isAutomaticDebit(item)?'Confirmar débito':'Marcar pagado'}</button></div>
    {details.length>0&&<button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Ocultar desglose':`Desglose · ${details.length}`}</button>}
    {onConvert&&<details className="movement-more"><summary>Más opciones</summary><button className="text-button" onClick={()=>onConvert(item)}><UiIcon name="savings" size={17}/>Convertir en ahorro</button></details>}
    {item.vencimiento&&<p className="small muted">{!paid&&hasUnconfirmedDue(item)?'Fecha estimada, por confirmar':isAutomaticDebit(item)?'Débito previsto':'Vencimiento'}: {fmtFecha(item.vencimiento)}</p>}{item.observacion&&<p className="small muted" style={{marginTop:5}}>{item.observacion}</p>}
    {expanded&&<div className="movement-breakdown">{details.map((s,i)=><div key={s.id||i}><div className="section-line small"><span>{s.nombre}</span><strong className="money">{fmtMonto(Number(s.monto??s.montoUSD??0),s.moneda||item.moneda||'ARS')}</strong></div>{s.observacion&&<p className="small muted">{s.observacion}</p>}</div>)}</div>}
  </article>;
}
