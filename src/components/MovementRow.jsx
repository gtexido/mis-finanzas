import { useState } from 'react';
import { montoReal, montoUSDReal } from '../utils/money';
import { fmtARS, fmtUSD, fmtMonto, fmtFecha } from '../utils/formatters';
import UiIcon from './UiIcon';
export default function MovementRow({ item, tc, month, onEdit, onToggle, onDelete }) {
  const [expanded,setExpanded]=useState(false);
  const paid=item.estado==='pagado';
  const details=item.subconceptos || [];
  const meta=[`Día ${item.dia}/${month+1}`, item.instrumentoNombre || item.formaPago].filter(Boolean).join(' · ');
  return <article className="movement-row">
    <button className="summary-row" onClick={()=>onEdit(item)} aria-label={`Editar ${item.servicio}`}><span className="row-copy"><strong>{item.servicio}</strong><small>{meta}</small></span><span className="movement-amount"><strong className="money">{fmtARS(montoReal(item,tc))}</strong>{montoUSDReal(item)>0&&<small>{fmtUSD(montoUSDReal(item))} USD</small>}</span><UiIcon name="chevron" size={15}/></button>
    <div className="movement-actions"><button className={`status-button ${paid?'paid':'pending'}`} onClick={()=>onToggle(item.id)} aria-label={`${paid?'Marcar pendiente':'Marcar como pagado'}: ${item.servicio}`}>{paid?'Pagado':'Pendiente'}</button>{item.requiereRevision&&<span className="small muted">Revisar</span>}{details.length>0&&<button className="text-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Ocultar desglose':`Desglose · ${details.length}`}</button>}<button className="icon-button" aria-label={`Eliminar ${item.servicio}`} onClick={()=>onDelete(item)}><UiIcon name="trash" size={17}/></button></div>
    {item.vencimiento&&<p className="small muted">Vence {fmtFecha(item.vencimiento)}</p>}{item.observacion&&<p className="small muted" style={{marginTop:5}}>{item.observacion}</p>}
    {expanded&&<div className="movement-breakdown">{details.map((s,i)=><div key={s.id||i}><div className="section-line small"><span>{s.nombre}</span><strong className="money">{fmtMonto(Number(s.monto??s.montoUSD??0),s.moneda||item.moneda||'ARS')}</strong></div>{s.observacion&&<p className="small muted">{s.observacion}</p>}</div>)}</div>}
  </article>;
}
