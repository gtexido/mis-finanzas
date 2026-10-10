import { useEffect, useRef } from 'react';
import { fmtARS, fmtUSD, fmtFecha } from '../utils/formatters';
import { hasUnconfirmedDue } from '../utils/paymentStatus';
import { nativeAmounts } from '../utils/smartHints';
import UiIcon from './UiIcon';

export default function DuplicateReview({ item, period, onResolve }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);
  const keys = event => {
    if (event.key === 'Escape') onResolve('cancel');
    if (event.key !== 'Tab') return;
    const buttons = [...panel.current.querySelectorAll('button')];
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
    if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  };
  return <div className="ov" style={{ zIndex: 980 }} onClick={() => onResolve('cancel')}>
    <section className="ob duplicate-review" ref={panel} role="dialog" aria-modal="true" aria-labelledby="duplicate-title" aria-describedby="duplicate-description" onKeyDown={keys} onClick={event => event.stopPropagation()}>
      <div className="section-line"><span className="duplicate-symbol"><UiIcon name="movements" size={25}/></span><button className="icon-button" aria-label="Cancelar y volver al formulario" onClick={() => onResolve('cancel')}><UiIcon name="close"/></button></div>
      <h2 id="duplicate-title">¿Este gasto ya está cargado?</h2>
      <p id="duplicate-description" className="small muted">Coinciden concepto, cuenta, fecha e importe en su moneda.</p>
      <div className="duplicate-record"><strong>{item.servicio}</strong><div className="duplicate-amounts">{Object.entries(nativeAmounts(item) || {}).map(([currency, amount]) => <span className="money" key={currency}>{currency === 'USD' ? fmtUSD(amount) : fmtARS(amount)}</span>)}</div><p className="small muted">Día {item.dia} · {period} · {item.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</p><p className="small muted">{item.medioPagoNombre || item.medioPago || 'Misma cuenta'}{hasUnconfirmedDue(item) ? ' · Fecha por confirmar' : ` · Vence ${fmtFecha(item.vencimiento)}`}</p></div>
      <button className="primary" onClick={() => onResolve('view')}>Ver gasto existente<UiIcon name="arrow" size={17}/></button>
      <div className="dialog-actions"><button className="secondary" onClick={() => onResolve('cancel')}>Volver al formulario</button><button className="secondary" onClick={() => onResolve('save')}>Guardar otro gasto</button></div>
      <p className="small muted duplicate-note">Guardar otro crea un registro separado. Tu borrador se conserva si volvés.</p>
    </section>
  </div>;
}
