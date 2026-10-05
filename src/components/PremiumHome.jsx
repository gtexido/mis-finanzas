import { fmtARS, fmtFecha } from '../utils/formatters';
import { diasRestantes } from '../utils/dates';
import { montoReal } from '../utils/money';
import UiIcon from './UiIcon';
import ReplicateAction from './ReplicateAction';
import ExpenseBadges from './ExpenseBadges';
import { hasUnconfirmedDue, isAutomaticDebit } from '../utils/paymentStatus';

export default function PremiumHome({ gastos, ingresos, totalGastos, saldo, pendiente, tc, onNavigate, onEdit, onReplicate, nextMonth }) {
  const due = gastos.filter(g => g.estado === 'pendiente' && !hasUnconfirmedDue(g)).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
  const overdue = due.filter(g => !isAutomaticDebit(g) && diasRestantes(g.vencimiento) <= 0);
  const verifying = due.filter(g => isAutomaticDebit(g) && diasRestantes(g.vencimiento) <= 0);
  const review = gastos.filter(g => g.requiereRevision || (g.estado === 'pendiente' && hasUnconfirmedDue(g)));
  const attention = [...new Map([...overdue,...verifying,...review].map(g => [g.id,g])).values()];
  const next = due.filter(g => diasRestantes(g.vencimiento) >= 0).slice(0, 3);
  const recent = [...gastos].sort((a, b) => Number(b.dia) - Number(a.dia)).slice(0, 3);
  const used = ingresos > 0 ? Math.round(totalGastos / ingresos * 100) : null;
  return <div className="home-view">
    <section className="balance-card">
      <div className="section-line"><span className="eyebrow">Balance del mes</span><span className="balance-symbol"><UiIcon name="wallet" size={21}/></span></div>
      <div className={`money balance-value ${saldo < 0 ? 'negative' : ''}`}>{fmtARS(saldo)}</div>
      <p className="balance-caption">Ingresos menos gastos registrados</p>
      <div className="balance-split"><button onClick={() => onNavigate('ingresos')}><span><UiIcon name="down" size={16}/>Ingresos</span><strong className="money">{fmtARS(ingresos)}</strong></button><button onClick={() => onNavigate('resumen')}><span><UiIcon name="up" size={16}/>Gastos</span><strong className="money">{fmtARS(totalGastos)}</strong></button></div>
      {used !== null && <div className="balance-progress"><div className="progress-track"><span style={{ width: `${Math.min(used, 100)}%` }}/></div><span>{used}% de tus ingresos en gastos</span></div>}
    </section>
    <button className="primary home-add" onClick={() => onNavigate('cargar')}><UiIcon name="plus" size={20}/>Cargar un gasto<UiIcon name="arrow" size={20}/></button>
    <ReplicateAction nextMonth={nextMonth} onClick={onReplicate}/>
    {!!attention.length && <section className="attention-panel"><div className="section-line"><h2>Para resolver <span>{attention.length}</span></h2><UiIcon name="alert" size={19}/></div><p className="small muted">Lo que necesita tu atención este mes.</p>{attention.slice(0,3).map(g=><button className="attention-item" key={g.id} onClick={()=>onEdit(g)}><span className="section-line"><strong>{g.servicio}</strong><span className="money">{fmtARS(montoReal(g,tc))}</span></span><ExpenseBadges item={g}/></button>)}{attention.length>3&&<button className="text-button" onClick={()=>onNavigate('vencimientos')}>Ver pendientes<UiIcon name="arrow" size={16}/></button>}</section>}
    <section className="home-section"><div className="section-line"><h2>Próximos pagos</h2><button className="text-button" onClick={() => onNavigate('vencimientos')}>Ver todos<UiIcon name="chevron" size={15}/></button></div><div className="surface">{next.length ? next.map(g => <button className="summary-row" key={g.id} onClick={() => onEdit(g)}><span className="row-icon"><UiIcon name="calendar" size={20}/></span><span className="row-copy"><strong>{g.servicio}</strong><small>{isAutomaticDebit(g)?`Débito previsto · ${fmtFecha(g.vencimiento)}`:diasRestantes(g.vencimiento) === 0 ? 'Vence hoy' : `Vence ${fmtFecha(g.vencimiento)}`}</small></span><span className="money">{fmtARS(montoReal(g, tc))}</span></button>) : <div className="quiet-state"><UiIcon name="check" size={22}/><span>No hay próximos vencimientos en este mes.</span></div>}{pendiente > 0 && <button className="surface-footer" onClick={() => onNavigate('vencimientos')}>Pendiente del mes<strong className="money">{fmtARS(pendiente)}</strong></button>}</div></section>
    <section className="home-section"><div className="section-line"><h2>Últimos movimientos</h2><button className="text-button" onClick={() => onNavigate('resumen')}>Ver todos<UiIcon name="chevron" size={15}/></button></div><div className="surface">{recent.length ? recent.map(g => <button className="summary-row" key={g.id} onClick={() => onEdit(g)}><span className="row-icon">{String(g.servicio || 'G').slice(0, 1).toUpperCase()}</span><span className="row-copy"><strong>{g.servicio}</strong><small>Día {g.dia} · {g.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</small></span><span className="money">{fmtARS(montoReal(g, tc))}</span></button>) : <div className="empty-state"><UiIcon name="wallet" size={30}/><h3>Tu mes empieza acá</h3><p>Sumá un ingreso o tu primer gasto para ver el balance.</p><button className="text-button" onClick={() => onNavigate('ingresos')}>Agregar ingresos<UiIcon name="arrow" size={16}/></button></div>}</div></section>
  </div>;
}
