import { useEffect, useRef } from 'react';
import { fmtARS, fmtPeriodo } from '../utils/formatters';
import UiIcon from './UiIcon';
import { etiquetaCuota, cuotasQueFaltan } from '../utils/cuotas';

export default function ConfirmDelete({item, amount, busy, error, onClose, onConfirm}) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.querySelector('button')?.focus();
    return () => {document.body.style.overflow = overflow; previous?.focus?.();};
  }, []);
  // Una cuota que no es la última puede borrarse sola o junto con las que faltan.
  const esCuota = item.tipo === 'gastos' && !!item.cuotaPlanId;
  const faltan = esCuota ? cuotasQueFaltan(item) : 0;
  const keys = e => {
    if (e.key === 'Escape' && !busy) onClose();
    if (e.key !== 'Tab') return;
    const buttons = [...panel.current.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) {e.preventDefault(); return;}
    if (e.shiftKey && document.activeElement === buttons[0]) {e.preventDefault(); buttons.at(-1).focus();}
    if (!e.shiftKey && document.activeElement === buttons.at(-1)) {e.preventDefault(); buttons[0].focus();}
  };
  return <div className="ov" style={{zIndex:980}} onClick={() => !busy && onClose()}>
    <section className="ob confirm-delete" ref={panel} role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={keys} onClick={e => e.stopPropagation()}>
      <span className="delete-symbol"><UiIcon name="trash" size={24}/></span>
      <h2 id="delete-title">¿Eliminar {esCuota ? 'esta cuota' : item.tipo === 'gastos' ? 'este gasto' : item.tipo === 'sueldo' ? 'el sueldo' : 'este ingreso'}?</h2>
      <p className="delete-detail">{item.servicio || item.fuente || 'Sueldo'}<strong className="money">{fmtARS(amount)}</strong></p>
      {esCuota
        ? <p className="muted small">{etiquetaCuota(item)} de {fmtPeriodo(item.periodo)}. {faltan > 0 ? `Después de esta ${faltan === 1 ? 'falta 1 cuota' : `faltan ${faltan} cuotas`}. ` : 'Es la última. '}No se puede deshacer.</p>
        : <p className="muted small">Se elimina solo de {fmtPeriodo(item.periodo)}. Los demás meses no cambian. No se puede deshacer.</p>}
      {error && <p className="error-note" role="alert">{error}</p>}
      {esCuota && faltan > 0
        ? <div className="dialog-actions cuota-borrar"><button className="danger-button" disabled={busy} onClick={() => onConfirm(null)}>{busy ? 'Eliminando…' : 'Solo esta cuota'}</button><button className="danger-button" disabled={busy} onClick={() => onConfirm('cuotas_restantes')}>{busy ? 'Eliminando…' : `Esta y las ${faltan === 1 ? 'que falta' : `${faltan} que faltan`}`}</button><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button></div>
        : <div className="dialog-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="danger-button" disabled={busy} onClick={() => onConfirm(null)}>{busy ? 'Eliminando…' : 'Eliminar'}</button></div>}
    </section>
  </div>;
}
