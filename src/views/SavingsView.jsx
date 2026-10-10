import { useEffect, useRef, useState } from 'react';
import { fmtARS, fmtUSD, fmtFecha } from '../utils/formatters';
import { localDate, savingsKinds, savingsKey, savingsSummary } from '../utils/savings';
import UiIcon from '../components/UiIcon';
import { MESES } from '../utils/dates';

const requestId = () => globalThis.crypto.randomUUID().replaceAll('-','');
const amountText = row => row.currency === 'USD' ? fmtUSD(row.amount) : fmtARS(row.amount);
export default function SavingsView({records, status, error, onRetry, period, seed, accounts, onSave}) {
  const today = localDate();
  const end = new Date(Number(period.slice(0,4)),Number(period.slice(5)),0);
  const cutoff = localDate(end) < today ? localDate(end) : today;
  const summary = savingsSummary(records,period,cutoff);
  const allBalances = savingsSummary(records,'',today);
  const items = records.filter(row=>row.active!==false && row.date.startsWith(period)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  const emptyForm = kind => ({kind,amount:'',currency:'ARS',date:today,destination:'',goal:'',rate:'',requestId:requestId()});
  const [form,setForm] = useState(null);
  const [busy,setBusy] = useState(false);
  const [formError,setFormError] = useState('');
  const [deleting,setDeleting] = useState(null);
  const busyRef = useRef(false), alive = useRef(true), formRef = useRef(null), dialogRef=useRef(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const open = draft => {setForm(draft);setFormError('');setTimeout(()=>formRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),0);};
  useEffect(()=>{if(seed)open({...emptyForm('aporte'),...seed});},[seed]);
  useEffect(()=>{
    if(!deleting)return;
    const previous=document.activeElement;dialogRef.current?.focus();
    const key=e=>{if(e.key==='Escape'&&!busyRef.current){setDeleting(null);setFormError('');}if(e.key==='Tab'){const controls=[...dialogRef.current.querySelectorAll('button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.isConnected&&previous.focus();};
  },[deleting]);
  const change = (key,value) => setForm(previous=>({...previous,[key]:value}));
  const pocketOptions = allBalances.pockets.filter(p=>p.balance>0 || (form && p.key===savingsKey(form)));
  async function commit(method,payload) {
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setFormError('');
    try {await onSave(method,payload);if(alive.current){setForm(null);setDeleting(null);}}
    catch(err){if(alive.current)setFormError(err.message || 'No se pudo guardar. Tus datos siguen en el formulario.');}
    finally{busyRef.current=false;if(alive.current)setBusy(false);}
  }
  const submit = event => {event.preventDefault();commit(form.id?'PUT':'POST',{...form,amount:Number(form.amount),rate:form.rate===''?null:Number(form.rate)});};
  return <div className="savings-view">
    <section className="savings-hero" aria-label="Ahorro acumulado">
      <div className="section-line"><span className="eyebrow">Tu ahorro, separado</span><UiIcon name="savings" size={25}/></div>
      <p>Acumulado hasta {fmtFecha(cutoff)}</p>
      <div className="savings-currencies"><div><span>Pesos</span><strong className="money">{status==='ready'?fmtARS(summary.ars):'—'}</strong></div><div><span>Dólares</span><strong className="money">{status==='ready'?fmtUSD(summary.usd):'—'}</strong></div></div>
      <small>Se conserva de un mes al siguiente. No se suma a tus gastos.</small>
    </section>
    {status!=='ready' ? <div className="savings-load-error" role="status"><p>{status==='loading'?'Cargando tus ahorros…':error || 'No se pudieron cargar los ahorros.'}</p>{status==='error'&&<button className="text-button" onClick={onRetry}>Reintentar</button>}</div> : <>
      <div className="savings-month"><div><span>Apartaste este mes</span><strong className="money">{fmtARS(summary.contributions)}</strong></div><div><span>Volvió al disponible</span><strong className="money">{fmtARS(summary.withdrawals)}</strong></div></div>
      <p className="small muted savings-rate-note">Los movimientos en dólares usan la cotización guardada en cada operación para su equivalente en pesos.</p>
      <div className="savings-actions"><button className="primary" onClick={()=>open(emptyForm('aporte'))}><UiIcon name="plus" size={18}/>Apartar ahorro</button><button className="secondary" onClick={()=>open(emptyForm('retiro'))}>Retirar</button></div>
      {!records.some(r=>r.kind==='inicial')&&<button className="text-button initial-savings" onClick={()=>open(emptyForm('inicial'))}>Ya tenía ahorros antes de usar la app<UiIcon name="arrow" size={16}/></button>}
      {form&&<section ref={formRef} className="surface savings-form" aria-labelledby="savings-form-title">
        <div className="section-line"><h2 id="savings-form-title">{form.sourceId?'Convertir gasto en ahorro':form.id?'Editar movimiento':savingsKinds[form.kind]}</h2><button className="icon-button" disabled={busy} aria-label="Cerrar formulario de ahorro" onClick={()=>{setForm(null);setFormError('');}}><UiIcon name="close"/></button></div>
        {form.sourceId&&<p className="conversion-note">{form.sourceTitle} dejará de contarse como gasto y pasará a tu ahorro. Confirmá dónde lo guardaste.</p>}
        {!form.id&&!form.sourceId&&<div className="segmented savings-kind" aria-label="Movimiento de ahorro">{Object.entries(savingsKinds).map(([key,label])=><button key={key} disabled={busy} aria-pressed={form.kind===key} onClick={()=>open({...emptyForm(key),requestId:form.requestId})}>{key==='inicial'?'Ya lo tenía':key==='aporte'?'Apartar':'Retirar'}</button>)}</div>}
        <p className="small muted savings-form-hint">{form.kind==='inicial'?'Solo suma al ahorro acumulado. No cambia tus ingresos ni el disponible del mes.':form.kind==='retiro'?'Vuelve al disponible del mes sin sumarse a tus ingresos. Si lo gastás, registrá ese gasto una sola vez.':'Reduce el disponible del mes. La app registra el ahorro; no mueve dinero en tu banco.'}</p>
        <form onSubmit={submit}><fieldset disabled={busy} className="expense-form-fields">
          {form.kind==='retiro'&&<div className="field"><label htmlFor="savings-pocket">¿De qué ahorro retirás?</label><select id="savings-pocket" className="inf" required value={pocketOptions.some(p=>p.key===savingsKey(form))?savingsKey(form):''} onChange={e=>{const pocket=pocketOptions.find(p=>p.key===e.target.value);if(pocket)setForm(p=>({...p,currency:pocket.currency,destination:pocket.destination,goal:pocket.goal,rate:''}));}}><option value="">Elegí un ahorro</option>{pocketOptions.map(p=><option key={p.key} value={p.key}>{p.goal || p.destination}{p.goal?` · ${p.destination}`:''} · {p.currency==='USD'?fmtUSD(p.balance):fmtARS(p.balance)}</option>)}</select>{!pocketOptions.length&&<p className="small muted">Primero registrá un aporte o el ahorro que ya tenías.</p>}</div>}
          <div className="savings-fields"><div className="field"><label htmlFor="savings-amount">Importe</label><input id="savings-amount" className="inf" inputMode="decimal" type="number" min="0.01" step="0.01" required placeholder="0" value={form.amount} disabled={!!form.sourceId} onChange={e=>change('amount',e.target.value)}/></div><div className="field"><label htmlFor="savings-currency">Moneda</label><select id="savings-currency" className="inf" value={form.currency} disabled={!!form.sourceId || form.kind==='retiro'} onChange={e=>{change('currency',e.target.value);change('rate','');}}><option value="ARS">Pesos</option><option value="USD">Dólares</option></select></div></div>
          <div className="field"><label htmlFor="savings-date">Fecha</label><input id="savings-date" className="inf" type="date" max={today} required value={form.date} disabled={!!form.sourceId} onChange={e=>change('date',e.target.value)}/></div>
          {form.kind!=='retiro'&&<><div className="field"><label htmlFor="savings-destination">¿Dónde lo guardás?</label><input id="savings-destination" className="inf" list="savings-destinations" maxLength={120} required placeholder="Cuenta, billetera o efectivo" value={form.destination} onChange={e=>change('destination',e.target.value)}/><datalist id="savings-destinations">{[...new Set(['Efectivo',...accounts,...records.map(r=>r.destination)])].map(x=><option value={x} key={x}/>)}</datalist></div><div className="field"><label htmlFor="savings-goal">Objetivo <span className="muted">· opcional</span></label><input id="savings-goal" className="inf" list="savings-goals" maxLength={120} placeholder="Vacaciones, reserva, un proyecto…" value={form.goal} onChange={e=>change('goal',e.target.value)}/><datalist id="savings-goals">{[...new Set(records.map(r=>r.goal).filter(Boolean))].map(x=><option key={x} value={x}/>)}</datalist></div></>}
          {form.currency==='USD'&&form.kind!=='inicial'&&<div className="field"><label htmlFor="savings-rate">Cotización de esta operación <span className="muted">· pesos por dólar</span></label><input id="savings-rate" className="inf" type="number" inputMode="decimal" min="0.000001" step="0.000001" required placeholder="Ingresá la cotización que usaste" value={form.rate ?? ''} onChange={e=>change('rate',e.target.value)}/><p className="small muted">Queda guardada. No se reemplaza por la cotización de la tarjeta.{Number(form.amount)>0&&Number(form.rate)>0?` Equivale a ${fmtARS(Number(form.amount)*Number(form.rate))}.`:''}</p></div>}
          {formError&&!deleting&&<><p className="form-error" role="alert">{formError}</p><button type="button" className="text-button" onClick={onRetry}>Actualizar saldos</button></>}
          <button className="primary" disabled={busy || (form.kind==='retiro'&&!form.destination)}>{busy?'Guardando…':form.sourceId?'Confirmar conversión':form.id?'Guardar cambios':form.kind==='retiro'?'Registrar retiro':form.kind==='inicial'?'Guardar ahorro inicial':'Guardar ahorro'}</button>
        </fieldset></form>
      </section>}
      {!!summary.pockets.length&&<section className="home-section"><div className="section-line"><h2>Dónde está tu ahorro</h2></div><div className="surface savings-pockets">{summary.pockets.map(p=><div className="savings-pocket" key={p.key}><span className="row-icon"><UiIcon name="savings" size={20}/></span><span className="row-copy"><strong>{p.goal || p.destination}</strong><small>{p.goal?p.destination:p.currency==='USD'?'Dólares':'Pesos'}</small></span><strong className="money">{p.currency==='USD'?fmtUSD(p.balance):fmtARS(p.balance)}</strong></div>)}</div></section>}
      <section className="home-section"><div className="section-line"><h2>Movimientos de ahorro</h2><span className="small muted">{MESES[Number(period.slice(5))-1]} {period.slice(0,4)}</span></div><div className="surface savings-history">{items.map(row=><article key={row.id} className="saving-row"><div className="section-line"><span className="row-copy"><strong>{row.goal || row.destination}</strong><small>{savingsKinds[row.kind]} · {fmtFecha(row.date)}</small></span><strong className={`money ${row.kind==='retiro'?'savings-out':'savings-in'}`}>{row.kind==='retiro'?'−':'+'}{amountText(row)}</strong></div><p className="small muted">{row.destination}{row.currency==='USD'&&row.kind!=='inicial'?` · ${fmtARS(Math.abs(row.impactARS))} al registrar`:''}</p>{row.convertedFrom&&<p className="small muted">Convertido desde: {row.originalTitle || 'un gasto'}</p>}<div className="row-actions"><button className="text-button" aria-label={`Editar ahorro ${row.goal || row.destination}`} onClick={()=>open({...row,amount:String(row.amount),rate:row.rate==null?'':String(row.rate)})}><UiIcon name="edit" size={15}/>Editar</button><button className="text-button delete-link" aria-label={`Eliminar ahorro ${row.goal || row.destination}`} onClick={()=>{setFormError('');setDeleting(row);}}><UiIcon name="trash" size={15}/>Eliminar</button></div></article>)}{!items.length&&<div className="empty-state"><UiIcon name="savings" size={28}/><h3>{records.length?'Sin movimientos este mes':'Tu próximo objetivo empieza acá'}</h3><p>{records.length?'El ahorro acumulado se conserva aunque este mes no hagas aportes.':'Registrá lo que apartás o el ahorro que ya tenías.'}</p></div>}</div></section>
    </>}
    {deleting&&<div className="modal-overlay" onClick={()=>{if(!busy)setDeleting(null);}}><section ref={dialogRef} tabIndex={-1} className="modal-sheet confirm-delete" role="dialog" aria-modal="true" aria-labelledby="delete-saving-title" onClick={e=>e.stopPropagation()}><h2 id="delete-saving-title">¿Eliminar este movimiento?</h2><p>{savingsKinds[deleting.kind]} · {deleting.goal || deleting.destination}</p><div className="delete-detail"><span>{fmtFecha(deleting.date)}</span><strong className="money">{amountText(deleting)}</strong></div><p className="small muted">Se recalcularán tu ahorro y el disponible del mes.{deleting.convertedFrom?' El gasto original no vuelve a activarse.':''}</p>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={()=>setDeleting(null)}>Cancelar</button><button className="danger-button" disabled={busy} onClick={()=>commit('DELETE',{id:deleting.id,revision:deleting.revision})}>{busy?'Eliminando…':'Eliminar'}</button></div></section></div>}
  </div>;
}
