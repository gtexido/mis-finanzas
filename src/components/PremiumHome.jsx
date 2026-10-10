import { useState } from 'react';
import { fmtARS, fmtUSD, fmtFecha } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { isAutomaticDebit } from '../utils/paymentStatus';
import UiIcon from './UiIcon';
import ReplicateAction from './ReplicateAction';
import AttentionSummary from './AttentionSummary';
import { nextAction } from '../utils/smartHints';
import { formatPercent } from '../utils/comparisons';

export default function PremiumHome({ userId, increases = [], previousLabel, gastos, ingresos, totalGastos, saldo, pendiente, tc, overview, monthLabel, onOpenAttention, onNavigate, onEdit, onReplicate, nextMonth }) {
  const recent = [...gastos].sort((a, b) => Number(b.dia) - Number(a.dia)).slice(0, 3);
  const used = ingresos > 0 ? Math.round(totalGastos / ingresos * 100) : null;
  const next = overview.next;
  const action = nextAction(overview);
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
  return <div className="home-view panorama-home">
    <section className="balance-card" aria-label={`Balance de ${monthLabel}`}>
      <div className="section-line"><span className="eyebrow">Balance de {monthLabel}</span><button className="icon-button privacy-toggle" aria-label={hidden ? "Mostrar importes del inicio" : "Ocultar importes del inicio"} aria-pressed={hidden} onClick={togglePrivacy}><UiIcon name={hidden ? "eye-off" : "eye"} size={20}/></button></div>
      <div className={`money balance-value ${!hidden && saldo < 0 ? 'negative' : ''}`} aria-label={hidden ? "Balance oculto" : undefined}>{money(saldo)}</div>
      <p className="balance-caption">{hidden ? "Importes ocultos solo en Inicio." : "Ingresos menos todos los gastos del mes."}</p>
      <div className="balance-split"><button onClick={() => onNavigate('ingresos')}><span><UiIcon name="down" size={14}/>Ingresos</span><strong className="money">{money(ingresos)}</strong></button><button onClick={() => onNavigate('resumen')}><span><UiIcon name="up" size={14}/>Gastos</span><strong className="money">{money(totalGastos)}</strong></button></div>
      {!hidden && used !== null && <div className={`balance-progress ${saldo < 0 ? 'over-budget' : ''}`}><div className="progress-track"><span style={{ width: `${Math.min(Math.max(used, 0), 100)}%` }}/></div><span>{saldo < 0 ? `Los gastos superan tus ingresos en ${money(-saldo)}.` : `${used}% de tus ingresos en gastos`}</span></div>}
      {!ingresos && <button className="balance-hint" onClick={() => onNavigate('ingresos')}><UiIcon name="plus" size={15}/>{gastos.length ? 'Agregá tus ingresos para completar el panorama' : 'Empezá agregando un ingreso'}<UiIcon name="chevron" size={14}/></button>}
    </section>
    <section className="today-overview" aria-labelledby="today-title">
      <div className="section-line"><h2 id="today-title">Hoy, lo importante</h2><span className="scope-label">Todos los meses</span></div>
      {action && <button className={`next-action ${action.tone}`} onClick={() => onOpenAttention(action.filter)}><UiIcon name={action.icon} size={18}/><span><strong>{action.title}</strong><small>{action.detail}</small></span><UiIcon name="chevron" size={16}/></button>}
      <AttentionSummary overview={overview} hidden={hidden} onSelect={onOpenAttention}/>
      {!overview.attentionCount && <p className="overview-clear"><UiIcon name="check" size={16}/>{overview.pending.length ? 'Sin tareas urgentes. Tus próximos pagos están abajo.' : 'Sin tareas pendientes entre tus registros.'}</p>}
    </section>
    {next && <section className="next-payment surface" aria-label="Próximo pago con fecha confirmada">
      <button className="summary-row" onClick={() => onEdit(next, next.mesKey)}>
        <span className="row-icon"><UiIcon name={isAutomaticDebit(next) ? 'repeat' : 'calendar'} size={20}/></span>
        <span className="row-copy"><small>{isAutomaticDebit(next) ? 'Próximo débito' : 'Próximo pago'} · {next.daysRemaining === 0 ? 'hoy' : next.daysRemaining === 1 ? 'mañana' : fmtFecha(next.vencimiento)}</small><strong>{next.servicio}</strong></span>
        <span className="money">{money(montoReal(next, tc))}</span><UiIcon name="chevron" size={15}/>
      </button>
    </section>}
    <button className="monthly-pending" onClick={() => onOpenAttention('all', 'month')}><span>Pendiente de {monthLabel}<small>Ya incluido en los gastos del balance</small></span><strong className="money">{money(pendiente)}</strong><UiIcon name="chevron" size={15}/></button>
    <button className="primary home-add" onClick={() => onNavigate('cargar')}><UiIcon name="plus" size={20}/>Cargar un gasto<UiIcon name="arrow" size={20}/></button>
    <ReplicateAction nextMonth={nextMonth} onClick={onReplicate}/>
    {!!increases.length && <section className="home-section bill-increases" aria-labelledby="bill-increases-title"><div className="section-line"><h2 id="bill-increases-title">Cambios en gastos habituales</h2></div><p className="small muted">Comparación con {previousLabel}, en la moneda del gasto.</p><div className="surface">{increases.slice(0,2).map(change => <button className="bill-increase" key={change.item.id} onClick={() => onEdit(change.item)}><span className="section-line"><strong>{change.item.servicio}</strong><span className="increase-percent">{hidden ? 'Importe mayor' : formatPercent(change.percent)}</span></span><span className="bill-increase-detail">{hidden ? 'Importes ocultos' : `Registraste ${money(change.delta,change.currency)} más.`}</span><small>Antes {money(change.previousAmount,change.currency)} · Ahora {money(change.currentAmount,change.currency)}</small></button>)}</div>{increases.length>2 && <button className="text-button" onClick={() => onNavigate('analisis')}>Ver comparaciones en Informes<UiIcon name="arrow" size={16}/></button>}</section>}
    <section className="home-section"><div className="section-line"><h2>Últimos movimientos</h2><button className="text-button" onClick={() => onNavigate('resumen')}>Ver todos<UiIcon name="chevron" size={15}/></button></div><div className="surface">{recent.length ? recent.map(g => <button className="summary-row" key={g.id} onClick={() => onEdit(g)}><span className="row-icon">{String(g.servicio || 'G').slice(0, 1).toUpperCase()}</span><span className="row-copy"><strong>{g.servicio}</strong><small>Día {g.dia} · {g.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</small></span><span className="money">{money(montoReal(g, tc))}</span></button>) : <div className="empty-state"><UiIcon name="wallet" size={30}/><h3>Tu mes empieza acá</h3><p>Cargá tu primer gasto para seguir sus pagos desde el inicio.</p></div>}</div></section>
  </div>;
}
