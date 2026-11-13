// =============================================================================
// src/components/MovementRowCompacta.jsx
// Fila de gasto compacta para Movimientos (detrás de ?movimientos=nuevo).
//
// Qué muestra: nombre, importe, día, medio de pago, vencimiento y un solo aviso
// de estado. Marcar pagado es un toque en el círculo de la izquierda; el resto de
// las acciones (editar, desglose, convertir en ahorro, eliminar) están en el menú.
// Usa los mismos manejadores que la fila de siempre: no cambia ningún guardado.
// =============================================================================
import { useEffect, useState } from 'react';
import { etiquetaCuota } from '../utils/cuotas';
import { montoReal, montoUSDReal } from '../utils/money';
import { fmtARS, fmtUSD, fmtMonto, fmtFecha } from '../utils/formatters';
import { expenseAttention, hasUnconfirmedDue, isAutomaticDebit, reviewLabel } from '../utils/paymentStatus';
import UiIcon from './UiIcon';

export default function MovementRowCompacta({ item, tc, month, onEdit, onToggle, onDelete, onConvert, busy }) {
  const [menu, setMenu] = useState(false);
  const [desglose, setDesglose] = useState(false);
  const pagado = item.estado === 'pagado';
  const detalle = item.subconceptos || [];
  const aviso = expenseAttention(item);
  const revision = reviewLabel(item);
  const textoToggle = pagado ? 'Marcar pendiente' : isAutomaticDebit(item) ? 'Confirmar débito' : 'Marcar como pagado';
  const vence = item.vencimiento && !hasUnconfirmedDue(item) ? `${isAutomaticDebit(item) ? 'Cobro' : 'Vence'} ${fmtFecha(item.vencimiento).slice(0, 5)}` : '';
  const meta = [etiquetaCuota(item), `Día ${item.dia}`, item.instrumentoNombre || item.formaPago, vence].filter(Boolean).join(' · ');

  useEffect(() => {
    if (!menu) return undefined;
    const cerrar = e => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [menu]);

  const elegir = accion => () => { setMenu(false); accion(); };

  return <article className={`mv-fila${pagado ? ' pagado' : ''}`}>
    <button className={`mv-check${pagado ? ' on' : ''}`} disabled={busy} onClick={() => onToggle(item.id)} aria-label={`${textoToggle}: ${item.servicio}`} title={textoToggle}>{pagado && <UiIcon name="check" size={15} />}</button>
    <button className="mv-cuerpo" onClick={() => onEdit(item)} aria-label={`Editar ${item.servicio}`}>
      <span className="mv-linea1"><strong>{item.servicio}</strong><span className="mv-monto"><b className="money">{fmtARS(montoReal(item, tc))}</b></span></span>
      <span className="mv-linea2">{meta}{montoUSDReal(item) > 0 && ` · ${fmtUSD(montoUSDReal(item))}`}</span>
      {(!pagado || revision) && <span className="mv-avisos">
        {!pagado && <span className={`expense-badge ${aviso.kind}`}><UiIcon name={aviso.icon} size={13} />{aviso.kind === 'review' && revision ? revision : aviso.label}</span>}
        {pagado && revision && <span className="expense-badge review"><UiIcon name="edit" size={13} />{revision}</span>}
      </span>}
    </button>
    <div className="mv-menu-caja">
      <button className="mv-mas" aria-haspopup="menu" aria-expanded={menu} aria-label={`Más acciones: ${item.servicio}`} onClick={() => setMenu(!menu)}><UiIcon name="more" size={20} /></button>
      {menu && <>
        <button className="mv-cierre" aria-label="Cerrar menú" onClick={() => setMenu(false)} />
        <div className="mv-menu" role="menu">
          <button role="menuitem" onClick={elegir(() => onEdit(item))}><UiIcon name="edit" size={16} />Editar</button>
          {detalle.length > 0 && <button role="menuitem" onClick={elegir(() => setDesglose(!desglose))}><UiIcon name="movements" size={16} />{desglose ? 'Ocultar desglose' : `Ver desglose (${detalle.length})`}</button>}
          {onConvert && <button role="menuitem" onClick={elegir(() => onConvert(item))}><UiIcon name="savings" size={16} />Convertir en ahorro</button>}
          <button role="menuitem" className="peligro" onClick={elegir(() => onDelete(item))}><UiIcon name="trash" size={16} />Eliminar</button>
        </div>
      </>}
    </div>
    {(item.observacion || desglose) && <div className="mv-extra">
      {item.observacion && <p className="small muted">{item.observacion}</p>}
      {desglose && detalle.map((s, i) => <div key={s.id || i} className="section-line small"><span>{s.nombre}</span><strong className="money">{fmtMonto(Number(s.monto ?? s.montoUSD ?? 0), s.moneda || item.moneda || 'ARS')}</strong></div>)}
    </div>}
  </article>;
}
