import { useState } from 'react';
import { fmtARS, fmtUSD } from '../utils/formatters';
import { montoReal, montoUSDReal } from '../utils/money';
import UiIcon from './UiIcon';
import { isAutomaticDebit, normalizedPayment } from '../utils/paymentStatus';
import { categoriaLegacyDesdeMedioPagoId, formaPagoLegacyDesdeInstrumentoId } from '../utils/legacy';

// Shared presentation for create/edit. Values stay as strings until saving.
export default function ExpenseFields({ value: f, setValue, config, tc, maxDay = 31, suggestions = [], onSelectConcept, onBreakdown, advanced, setAdvanced, isEditing = false, onRemember }) {
  const [searching, setSearching] = useState(false);
  const change = (key, value) => setValue(p => ({ ...p, [key]: value, ...(key === 'medioPagoId' ? { categoria: categoriaLegacyDesdeMedioPagoId(value) } : {}), ...(key === 'instrumentoId' ? { formaPago: formaPagoLegacyDesdeInstrumentoId(value), instrumentoNombre: '', instrumento: '', ...(!isEditing && isAutomaticDebit({instrumentoId:value},config)?{estado:'pendiente'}:{}) } : {}) }));
  const automatic = isAutomaticDebit(f, config);
  const autoInstrument = (config.instrumentosPago || []).find(i => i.activo !== false && normalizedPayment(i.nombre || i.id).includes('debitoautomatico'));
  const toggleAutomatic = checked => setValue(p => ({...p, instrumentoId: checked ? autoInstrument?.id || p.instrumentoId : '', instrumentoNombre:'', instrumento:'', formaPago:checked?'Débito automático':'', ...(!isEditing && checked ? {estado:'pendiente'} : {})}));
  const detailed = f.tipoGasto === 'detalle' || !!f.subconceptos?.length;
  const candidates = suggestions.filter(c => !f.servicio || c.nombre.toLocaleLowerCase().includes(f.servicio.toLocaleLowerCase())).slice(0, 6);
  const review = () => setValue(p => ({ ...p, requiereRevision: !p.requiereRevision, motivoRevision: !p.requiereRevision ? 'REVISAR_MANUAL' : null, origenMovimiento: !p.requiereRevision ? 'CARGA_MANUAL' : p.origenMovimiento }));
  return <div className="expense-fields">
    <div className="field">
      <label htmlFor="expense-concept">¿Qué gasto querés registrar?</label>
      <input id="expense-concept" className="inf" placeholder="Ej: Alquiler, supermercado, internet" value={f.servicio || ''} onFocus={() => setSearching(true)} onChange={e => { setSearching(true); setValue(p => ({ ...p, servicio: e.target.value, conceptoId: '', crearConceptoPendiente: false, guardarComoConceptoFrecuente: false, ...(!isEditing ? { categoriaGastoId: '', etiquetasIds: [] } : {}) })); }} />
      {(!isEditing || searching) && !f.conceptoId && candidates.length > 0 && <div className="suggestions" aria-label="Conceptos sugeridos">{candidates.map(c => <button type="button" key={c.id} onClick={() => { onSelectConcept(c); setSearching(false); }}>{c.nombre}</button>)}</div>}
      {f.servicio?.trim() && !f.conceptoId && onRemember && <label className="check-line"><input type="checkbox" checked={!!(f.crearConceptoPendiente || f.guardarComoConceptoFrecuente)} onChange={onRemember}/>Recordar este concepto</label>}
    </div>

    <section className="amount-field">
      <div className="section-line"><label htmlFor="expense-amount">Importe</label><div className="currency-switch" aria-label="Moneda">{['ARS', 'USD'].map(mon => <button type="button" key={mon} aria-pressed={(f.moneda || 'ARS') === mon} onClick={() => change('moneda', mon)}>{mon}</button>)}</div></div>
      {detailed ? <><div className="money amount-value">{fmtARS(montoReal(f, tc))}</div><div className="muted small">{f.subconceptos?.length || 0} ítems · Total en pesos{montoUSDReal(f) > 0 ? ` · Incluye ${fmtUSD(montoUSDReal(f))} USD` : ''}</div></> : <div className="amount-input"><span>{f.moneda === 'USD' ? 'US$' : '$'}</span><input id="expense-amount" aria-label="Importe" type="number" step="any" min="0" inputMode="decimal" placeholder="0" value={f.monto ?? ''} onChange={e => change('monto', e.target.value)}/></div>}
      <button type="button" className="text-button" onClick={onBreakdown}><UiIcon name={detailed ? 'movements' : 'plus'} size={17}/>{detailed ? 'Editar desglose' : 'Agregar desglose'}</button>
      {!detailed && f.moneda === 'USD' && <p className="muted small">Equivalente estimado: {fmtARS(Number(f.monto || 0) * Number(tc || 1))} · Cambio {fmtARS(tc)}</p>}
    </section>

    <div className="field-grid">
      <div className="field"><label htmlFor="expense-account">Cuenta o medio de pago</label><select id="expense-account" className="inf" value={f.medioPagoId || ''} onChange={e => change('medioPagoId', e.target.value)}><option value="">Elegí una cuenta</option>{(config.mediosPago || []).filter(m => (m.activo !== false && m.id !== 'mp_sin_definir') || m.id === f.medioPagoId).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
      <div className="field"><label htmlFor="expense-method">Forma de pago</label><select id="expense-method" className="inf" disabled={automatic} value={f.instrumentoId || ''} onChange={e => change('instrumentoId', e.target.value)}><option value="">Elegí una opción</option>{(config.instrumentosPago || []).filter(m => (m.activo !== false && !m.id.includes('sin_definir')) || m.id === f.instrumentoId).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
    </div>
    <label className={`check-line automatic-line ${automatic ? 'active' : ''}`}><input type="checkbox" checked={automatic} disabled={!autoInstrument && !automatic} onChange={e => toggleAutomatic(e.target.checked)}/><span><strong>Débito automático</strong><small>{!autoInstrument && !automatic ? 'Pedí al administrador que habilite esta forma de pago.' : 'Identifica el servicio adherido. Confirmá el pago cuando veas el débito.'}</small></span><UiIcon name="repeat" size={21}/></label>
    <div className="field-grid state-grid">
      <div className="field"><label>Estado</label><div className="segmented"><button type="button" aria-pressed={f.estado === 'pagado'} onClick={() => change('estado', 'pagado')}>Pagado</button><button type="button" aria-pressed={f.estado === 'pendiente'} onClick={() => change('estado', 'pendiente')}>Pendiente</button></div></div>
      <div className="field"><label htmlFor="expense-day">Día del registro</label><input id="expense-day" className="inf" type="number" min="1" max={maxDay} inputMode="numeric" value={f.dia ?? ''} onChange={e => change('dia', e.target.value)}/></div>
    </div>
    {(f.estado === 'pendiente' || advanced || f.vencimiento) && <div className="field"><label htmlFor="expense-due">Vencimiento</label><input id="expense-due" className="inf" type="date" value={f.vencimiento || ''} onChange={e => change('vencimiento', e.target.value)}/>{f.estado === 'pendiente' && !f.vencimiento && <p className="muted small">Elegí la fecha o activá «Revisar después» si todavía no la sabés.</p>}</div>}
    <button type="button" className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><span>Más opciones</span><UiIcon name="plus" size={18} style={{ transform: advanced ? 'rotate(45deg)' : undefined }}/></button>
    {(advanced || f.requiereRevision || f.estado === 'pendiente') && <label className="check-line review-line"><input type="checkbox" checked={!!f.requiereRevision} onChange={review}/><span>Revisar después<small>Controlar importe, factura o fecha más adelante.</small></span></label>}
    {advanced && <><div className="field"><label htmlFor="expense-note">Nota <span className="muted">· opcional</span></label><input id="expense-note" className="inf" placeholder="Ej: Cuota 2 de 6" value={f.observacion || ''} onChange={e => change('observacion', e.target.value)}/></div><label className="check-line"><input type="checkbox" checked={!!f.esRecurrente} onChange={e => change('esRecurrente', e.target.checked)}/>Se repite todos los meses</label></>}
  </div>;
}
