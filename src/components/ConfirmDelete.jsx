import { useEffect, useRef } from 'react';
import { fmtARS } from '../utils/formatters';
import UiIcon from './UiIcon';

export default function ConfirmDelete({item, amount, busy, error, onClose, onConfirm}) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.querySelector('button')?.focus();
    return () => {document.body.style.overflow = overflow; previous?.focus?.();};
  }, []);
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
      <h2 id="delete-title">¿Eliminar {item.tipo === 'gastos' ? 'este gasto' : item.tipo === 'sueldo' ? 'el sueldo' : 'este ingreso'}?</h2>
      <p className="delete-detail">{item.servicio || item.fuente || 'Sueldo'}<strong className="money">{fmtARS(amount)}</strong></p>
      <p className="muted small">Se eliminará de {item.periodo}. Los demás meses y el concepto quedan guardados. Esta acción no se puede deshacer.</p>
      {error && <p className="error-note" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Eliminando…' : 'Eliminar'}</button></div>
    </section>
  </div>;
}
