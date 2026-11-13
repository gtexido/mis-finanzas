import { useState } from 'react';
import { fmtARS, fmtUSD, fmtFecha } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { isAutomaticDebit } from '../utils/paymentStatus';
import UiIcon from './UiIcon';
import ReplicateAction from './ReplicateAction';
import AttentionSummary from './AttentionSummary';
import { formatPercent } from '../utils/comparisons';
import { proyectarMes } from '../utils/proyeccion';
import { plural } from '../utils/formatters';

const DIAS_CORTOS = ['dom','lun','mar','mié','jue','vie','sáb'];
/** Nombre del movimiento más grande y cuántos más hay ese día: "Prevencion y 1 más". */
const resumenNombres = (items) => {
  const mayor = [...items].sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto))[0];
  return items.length > 1 ? `${mayor.nombre} y ${items.length - 1} más` : mayor.nombre;
};
/** "Hoy", "Mañana" o "vie 20" para una fecha AAAA-MM-DD respecto de hoy. */
const etiquetaFecha = (fecha, hoy) => {
  const d = new Date(`${fecha}T12:00:00`), h = new Date(`${hoy}T12:00:00`);
  const dias = Math.round((d - h) / 86400000);
  return dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
};

export default function PremiumHome({ userId, savings, savingsStatus, onSavings, increases = [], previousLabel, gastos, ingresos, totalGastos, saldo, pendiente, tc, overview, monthLabel, onOpenAttention, onNavigate, onEdit, onReplicate, nextMonth, replicaPendientes, hoy, mesKey, esMesActual = false, ingresosLista = [] }) {
  const recent = [...gastos].sort((a, b) => Number(b.dia) - Number(a.dia)).slice(0, 3);
  const used = ingresos > 0 ? Math.round(totalGastos / ingresos * 100) : null;
  const next = overview.next;
  const savingsReady = savingsStatus === 'ready';
  const available = savingsReady ? saldo - savings.net : saldo;
  const largest = Object.values(gastos.reduce((groups,item)=>{const key=item.conceptoId || String(item.servicio||'Sin concepto').trim().toLowerCase();if(!groups[key])groups[key]={key,name:item.servicio || 'Sin concepto',total:0};groups[key].total+=montoReal(item,tc);return groups;},Object.create(null))).sort((a,b)=>b.total-a.total).slice(0,3);
  const privacyKey = `mf_home_amounts_hidden_${userId}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(privacyKey) === 'true'; } catch { return false; }
  });
  const togglePrivacy = () => {
    const value = !hidden;
    setHidden(value);
    try { localStorage.setItem(privacyKey, String(value)); } catch {}
  };
  const money = (value, currency = 'ARS') => hidden ? '••••' : currency === 'USD' ? fmtUSD(value) : fmtARS(value);
  const bBalance = (
    <section className="balance-card" aria-label={`Balance de ${monthLabel}`}>
      <div className="section-line"><span className="eyebrow">{savingsReady?'Disponible':'Balance'} de {monthLabel}</span><button className="icon-button privacy-toggle" aria-label={hidden ? "Mostrar importes del inicio" : "Ocultar importes del inicio"} aria-pressed={hidden} onClick={togglePrivacy}><UiIcon name={hidden ? "eye-off" : "eye"} size={20}/></button></div>
      <div className={`money balance-value ${!hidden ? available < 0 ? 'negative' : 'positive' : ''}`} aria-label={hidden ? "Balance oculto" : undefined}>{money(available)}</div>
      <p className="balance-caption">{hidden ? "Importes ocultos solo en Inicio." : savingsReady ? "Ingresos − gastos − aportes + retiros de ahorro." : "Ingresos menos gastos. Ahorros aún sin verificar."}</p>
      <div className="balance-split"><button onClick={() => onNavigate('ingresos')}><span><UiIcon name="down" size={14}/>Ingresos</span><strong className="money">{money(ingresos)}</strong></button><button onClick={() => onNavigate('resumen')}><span><UiIcon name="up" size={14}/>Gastos</span><strong className="money">{money(totalGastos)}</strong></button></div>
      {!hidden && used !== null && <div className={`balance-progress ${saldo < 0 ? 'over-budget' : ''}`}><div className="progress-track"><span style={{ width: `${Math.min(Math.max(used, 0), 100)}%` }}/></div><span>{saldo < 0 ? `Los gastos superan tus ingresos en ${money(-saldo)}.` : `${used}% de tus ingresos en gastos`}</span></div>}
      {!ingresos && <button className="balance-hint" onClick={() => onNavigate('ingresos')}><UiIcon name="plus" size={15}/>{gastos.length ? 'Agregá tus ingresos para completar el panorama' : 'Empezá agregando un ingreso'}<UiIcon name="chevron" size={14}/></button>}
    </section>
  );
  const bHoy = (
    <section className="today-overview" aria-labelledby="today-title">
      <div className="section-line"><h2 id="today-title">Para atender</h2><span className="scope-label">De todos los meses</span></div>
      <AttentionSummary overview={overview} hidden={hidden} onSelect={onOpenAttention} />
      {!overview.attentionCount && <p className="overview-clear"><UiIcon name="check" size={16}/>{overview.pending.length ? 'Sin tareas urgentes. Tus próximos pagos están abajo.' : 'Sin tareas pendientes entre tus registros.'}</p>}
    </section>
  );
  const bProximo = next && (<section className="next-payment surface" aria-label="Próximo pago con fecha confirmada">
      <button className="summary-row" onClick={() => onEdit(next, next.mesKey)}>
        <span className="row-icon"><UiIcon name={isAutomaticDebit(next) ? 'repeat' : 'calendar'} size={20}/></span>
        <span className="row-copy"><small>{isAutomaticDebit(next) ? 'Próximo débito' : 'Próximo pago'} · {next.daysRemaining === 0 ? 'hoy' : next.daysRemaining === 1 ? 'mañana' : fmtFecha(next.vencimiento)}</small><strong>{next.servicio}</strong></span>
        <span className="money">{money(montoReal(next, tc))}</span><UiIcon name="chevron" size={15}/>
      </button>
    </section>);
  const bPendiente = <button className="monthly-pending por-pagar" onClick={() => onOpenAttention('all', 'month')}><span>Por pagar en {monthLabel}<small>Ya está incluido en el balance</small></span><strong className="money">{money(pendiente)}</strong><UiIcon name="chevron" size={15}/></button>;
  // "¿Llegás a fin de mes?": solo en el mes en curso. Reemplaza a "Por pagar" porque ya incluye ese total y lleva a los mismos pagos.
  const p = esMesActual && hoy ? proyectarMes({ gastos, tc, disponible: available, hoy, mesKey, ingresos: ingresosLista }) : null;
  const veredicto = !p ? '' : p.cantidad === 0
    ? (p.finDeMes >= 0 ? `Ya pagaste todo. Te quedan ${money(p.finDeMes)}.` : `Ya pagaste todo. Gastaste ${money(-p.finDeMes)} más de lo que ingresó.`)
    : p.llega ? `Sí. Después de pagar todo te quedan ${money(p.finDeMes)}.`
    : p.minimo.fecha ? `No alcanza. ${(() => { const e = etiquetaFecha(p.minimo.fecha, hoy); return e === 'Hoy' || e === 'Mañana' ? e : `El ${e}`; })()} te faltarían ${money(-p.minimo.saldo)}.`
    : `No alcanza. Te faltarían ${money(-p.minimo.saldo)} para pagar todo.`;
  const bProyeccion = p && (<section className={`llego surface${p.llega ? '' : ' no-llega'}`} aria-labelledby="llego-title">
      <div className="section-line"><h2 id="llego-title">¿Llegás a fin de mes?</h2>{p.cantidad > 0 && <button className="text-button" onClick={() => onOpenAttention('all', 'month')}>Ver pagos<UiIcon name="chevron" size={15}/></button>}</div>
      <p className="llego-veredicto">{veredicto}</p>
      {p.cantidad > 0 && <p className="small muted llego-resumen">En mano hoy <span className="money">{money(p.enMano)}</span> · por pagar <span className="money">{money(p.porPagar)}</span> en {plural(p.cantidad, 'pago')}</p>}
      {p.pasos.slice(0, 3).map(paso => <div className={`llego-paso${paso.saldo < 0 ? ' negativo' : ''}`} key={paso.fecha}>
        <span className="llego-fecha">{etiquetaFecha(paso.fecha, hoy)}</span>
        <span className="llego-nombres">{resumenNombres(paso.items)}</span>
        <span className="llego-montos"><strong className="money">{paso.cobros > paso.pagos ? `+${money(paso.cobros - paso.pagos)}` : `−${money(paso.pagos - paso.cobros)}`}</strong><small className="money">quedan {money(paso.saldo)}</small></span>
      </div>)}
      {p.pasos.length > 3 && <p className="small muted llego-mas">y {plural(p.pasos.length - 3, 'fecha')} más hasta fin de mes</p>}
      {p.sinFecha && <div className="llego-paso sin-fecha"><span className="llego-fecha">Sin fecha</span><span className="llego-nombres">{resumenNombres(p.sinFecha.items)}</span><span className="llego-montos"><strong className="money">−{money(p.sinFecha.total)}</strong></span></div>}
    </section>);
  const bAhorro = <button className="savings-home" onClick={onSavings}><span className="row-icon"><UiIcon name="savings" size={23}/></span><span className="row-copy"><strong>Tu ahorro</strong><small>{savingsReady ? `Acumulado: ${money(savings.ars)} · ${money(savings.usd,'USD')}` : savingsStatus==='error' ? 'No se pudo actualizar. Tocá para reintentar.' : 'Cargando tus ahorros…'}</small>{savingsReady&&savings.net!==0&&<small>{savings.net>0?'Apartado neto del mes: ':'Retirado neto del mes: '}{money(Math.abs(savings.net))}</small>}</span><UiIcon name="chevron" size={18}/></button>;
  const bCargar = <button className="primary home-add" onClick={() => onNavigate('cargar')}><UiIcon name="plus" size={20}/>Cargar<UiIcon name="arrow" size={20}/></button>;
  const bReplicar = gastos.length > 0 && <ReplicateAction nextMonth={nextMonth} onClick={onReplicate} pendientes={replicaPendientes}/>;
  const bCambios = !!increases.length && <section className="home-section bill-increases" aria-labelledby="bill-increases-title"><div className="section-line"><h2 id="bill-increases-title">Cambios en gastos habituales</h2></div><p className="small muted">Comparación con {previousLabel}, en la moneda del gasto.</p><div className="surface">{increases.slice(0,2).map(change => <button className="bill-increase" key={change.item.id} onClick={() => onEdit(change.item)}><span className="section-line"><strong>{change.item.servicio}</strong><span className="increase-percent">{hidden ? 'Importe mayor' : formatPercent(change.percent)}</span></span><span className="bill-increase-detail">{hidden ? 'Importes ocultos' : `Registraste ${money(change.delta,change.currency)} más.`}</span><small>Antes {money(change.previousAmount,change.currency)} · Ahora {money(change.currentAmount,change.currency)}</small></button>)}</div>{increases.length>2 && <button className="text-button" onClick={() => onNavigate('analisis')}>Ver comparaciones en Informes<UiIcon name="arrow" size={16}/></button>}</section>;
  const bLargest = !!largest.length&&<details className="home-largest"><summary>En qué más gastaste<UiIcon name="chart" size={18}/></summary>{largest.map(item=><div className="largest-item" key={item.key}><div className="section-line"><strong>{item.name}</strong><span className="money">{money(item.total)}</span></div>{!hidden&&<div className="largest-bar"><span style={{width:`${totalGastos>0?item.total/totalGastos*100:0}%`}}/></div>}</div>)}<button className="text-button" onClick={()=>onNavigate('analisis')}>Ver distribución completa<UiIcon name="arrow" size={16}/></button></details>;
  const bRecientes = <section className="home-section"><div className="section-line"><h2>Últimos movimientos</h2><button className="text-button" onClick={() => onNavigate('resumen')}>Ver todos<UiIcon name="chevron" size={15}/></button></div><div className="surface">{recent.length ? recent.map(g => <button className="summary-row" key={g.id} onClick={() => onEdit(g)}><span className="row-icon">{String(g.servicio || 'G').slice(0, 1).toUpperCase()}</span><span className="row-copy"><strong>{g.servicio}</strong><small>Día {g.dia} · {g.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</small></span><span className="money">{money(montoReal(g, tc))}</span></button>) : <div className="empty-state"><UiIcon name="wallet" size={30}/><h3>Tu mes empieza acá</h3><p>Cargá tu primer gasto para seguir sus pagos desde el inicio.</p></div>}</div></section>;
  return <div className="home-view panorama-home inicio-nuevo">
    {bBalance}{bCargar}{bProyeccion || bPendiente}{bHoy}{bProximo}{bAhorro}{bReplicar}{bCambios}{bLargest}{bRecientes}
  </div>;
}
