import { useEffect, useRef } from 'react';
import { fmtARS } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { isAutomaticDebit } from '../utils/paymentStatus';
import UiIcon from './UiIcon';
export default function ReplicateModal({step,items,included,excluded,copied,nextMonth,tc,busy,onClose,onToggle,onSelectAll,onNext,onBack,onConfirm,onView,hasSource}) {
  const panel=useRef(null);
  useEffect(()=>{const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus();return()=>{document.body.style.overflow=overflow;previous?.focus?.();};},[]);
  const keys=e=>{
    if(e.key==='Escape'&&!busy)onClose();
    if(e.key!=='Tab')return;
    const elements=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    const first=elements[0],last=elements.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus();}
    if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  };
  return <div className="ov" style={{zIndex:980}} onClick={()=>!busy&&onClose()}><section ref={panel} tabIndex={-1} className="modal-sheet replicate-sheet" role="dialog" aria-modal="true" aria-labelledby="replicate-title" onKeyDown={keys} onClick={e=>e.stopPropagation()}>
    <header className="modal-header"><div><span className="eyebrow muted">PREPARÁ EL PRÓXIMO MES</span><h2 id="replicate-title">Replicar a {nextMonth}</h2></div><button className="icon-button" aria-label="Cerrar replicación" disabled={busy} onClick={onClose}><UiIcon name="close"/></button></header>
    {step==='informacion'?<><div className="empty-state"><UiIcon name="check" size={30}/><h3>{hasSource?'Ya están cargados':'Todavía no hay gastos'}</h3><p>{hasSource?'Los gastos de este mes ya tienen una coincidencia en el siguiente.':'Elegí un mes con gastos para preparar el siguiente.'}</p></div>{hasSource&&<button className="primary full-width" onClick={onView}>Ver {nextMonth}<UiIcon name="arrow"/></button>}</>:step==='done'?<><div className="empty-state"><UiIcon name="check" size={32}/><h3>{copied} {copied===1?'gasto copiado':'gastos copiados'}</h3><p>Quedaron pendientes, con importe y fecha por confirmar. Se conservó la indicación de débito automático.</p></div><button className="primary full-width" onClick={onView}>Revisar {nextMonth}<UiIcon name="arrow"/></button></>:step==='confirmar'?<>
      <div className="replicate-review"><UiIcon name="repeat" size={28}/><h3>Vas a copiar {included.length} gastos</h3><strong className="money">{fmtARS(included.reduce((sum,g)=>sum+montoReal(g,tc),0))}</strong><p className="muted small">Es un importe de referencia. Se copiarán como pendientes y por revisar; las fechas se trasladan al mes siguiente como estimadas. Se omiten las coincidencias que ya estén cargadas.</p></div>
      <div className="dialog-actions"><button className="secondary" disabled={busy} onClick={onBack}>Volver</button><button className="primary" disabled={busy||!included.length} onClick={onConfirm}>{busy?'Copiando…':'Confirmar copia'}</button></div>
    </>:<>
      <p className="muted small">Elegí los gastos que se repiten. Mostramos solo los que faltan en {nextMonth.toLowerCase()}.</p>
      <div className="section-line replicate-select"><span>{included.length} de {items.length} seleccionados</span><button className="text-button" onClick={()=>onSelectAll(included.length!==items.length)}>{included.length===items.length?'Desmarcar todos':'Seleccionar todos'}</button></div>
      <div className="replicate-list">{items.map(g=><label className="replicate-item" key={g.id}><input type="checkbox" checked={!excluded.has(g.id)} onChange={()=>onToggle(g.id)}/><span><strong>{g.servicio}</strong><small>{[g.medioPagoNombre||g.medioPago,isAutomaticDebit(g)?'Débito automático':g.esRecurrente?'Se repite cada mes':null].filter(Boolean).join(' · ')}</small></span><strong className="money">{fmtARS(montoReal(g,tc))}</strong></label>)}</div>
      <button className="primary full-width" disabled={!included.length} onClick={onNext}>Continuar con {included.length} gastos<UiIcon name="arrow" size={18}/></button>
    </>}
  </section></div>;
}
