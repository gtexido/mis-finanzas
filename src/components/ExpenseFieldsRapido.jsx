import { useState } from 'react';
import { fmtARS, fmtUSD } from '../utils/formatters';
import { montoReal, montoUSDReal } from '../utils/money';
import UiIcon from './UiIcon';
import { isAutomaticDebit, normalizedPayment } from '../utils/paymentStatus';
import { categoriaLegacyDesdeMedioPagoId, formaPagoLegacyDesdeInstrumentoId } from '../utils/legacy';

// Pantalla Cargar nueva (detrás de interruptor). Misma data y mismos campos que
// ExpenseFields; cambia la presentación: atajos, resumen de pago, fechas rápidas.
// Los valores siguen siendo strings hasta guardar.
export default function ExpenseFieldsRapido({
  value: f, setValue, config, tc, maxDay = 31, suggestions = [], atajos = [], comparacion = null,
  etiquetaMesAnterior = 'el mes pasado', diasRapidos = [], vencimientos = [],
  onSelectConcept, onSelectAtajo, onBreakdown, advanced, setAdvanced, onRemember, onDescartar,
}) {
  const [cambiarPago, setCambiarPago] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  const [otraFecha, setOtraFecha] = useState(false);

  const change = (key, value) => setValue(p => ({ ...p, [key]: value, ...(key === 'medioPagoId' ? { categoria: categoriaLegacyDesdeMedioPagoId(value) } : {}), ...(key === 'instrumentoId' ? { formaPago: formaPagoLegacyDesdeInstrumentoId(value), instrumentoNombre: '', instrumento: '', ...(isAutomaticDebit({ instrumentoId: value }, config) ? { estado: 'pendiente' } : {}) } : {}) }));
  const automatic = isAutomaticDebit(f, config);
  const autoInstrument = (config.instrumentosPago || []).find(i => i.activo !== false && normalizedPayment(i.nombre || i.id).includes('debitoautomatico'));
  const toggleAutomatic = checked => setValue(p => ({ ...p, instrumentoId: checked ? autoInstrument?.id || p.instrumentoId : '', instrumentoNombre: '', instrumento: '', formaPago: checked ? 'Débito automático' : '', ...(checked ? { estado: 'pendiente' } : {}) }));
  const detailed = f.tipoGasto === 'detalle' || !!f.subconceptos?.length;
  const candidates = suggestions.filter(c => !f.servicio || c.nombre.toLocaleLowerCase().includes(f.servicio.toLocaleLowerCase())).slice(0, 6);
  const review = () => setValue(p => ({ ...p, requiereRevision: !p.requiereRevision, motivoRevision: !p.requiereRevision ? 'REVISAR_MANUAL' : null, origenMovimiento: !p.requiereRevision ? 'CARGA_MANUAL' : p.origenMovimiento }));
  const descartar = () => { setCambiarPago(false); setOtroDia(false); setOtraFecha(false); onDescartar(); };

  const medio = (config.mediosPago || []).find(m => m.id === f.medioPagoId);
  const instrumento = (config.instrumentosPago || []).find(i => i.id === f.instrumentoId);
  const pagoCompleto = !!f.medioPagoId && f.medioPagoId !== 'mp_sin_definir' && !!f.instrumentoId && !String(f.instrumentoId).includes('sin_definir');
  const mostrarSelects = cambiarPago || !pagoCompleto;
  const textoConcepto = f.servicio?.trim();
  const mostrarAtajos = !f.conceptoId && !textoConcepto && atajos.length > 0;

  const usaOtroDia = otroDia || diasRapidos.length === 0 || !diasRapidos.some(d => d.dia === String(f.dia));
  const usaOtraFecha = otraFecha || (!!f.vencimiento && !vencimientos.some(v => v.fecha === f.vencimiento));

  const montoAtajo = a => (a.ultimo ? fmtARS(a.ultimo.monto) : 'Sin cargas');

  return <div className="expense-fields cr">
    {f.conceptoId
      ? <div className="cr-concepto"><div><small>Gasto elegido</small><strong>{f.servicio}</strong></div><button type="button" className="text-button" onClick={descartar}>Cambiar</button></div>
      : <div className="field">
        <label htmlFor="expense-concept">{mostrarAtajos ? 'Tus gastos de siempre' : '¿Qué gasto querés registrar?'}</label>
        {mostrarAtajos && <div className="cr-atajos">{atajos.map(a => {
          const med = (config.mediosPago || []).find(m => m.id === a.ultimo?.medioPagoId);
          const auto = a.ultimo?.instrumentoId ? isAutomaticDebit({ instrumentoId: a.ultimo.instrumentoId }, config) : false;
          return <button type="button" key={a.nombre} onClick={() => onSelectAtajo(a)}><strong>{a.nombre}</strong><span className="money">{montoAtajo(a)}</span><small>{med?.nombre || 'Sin cuenta'}{auto ? ' · débito aut.' : ''}</small></button>;
        })}</div>}
        {mostrarAtajos && <p className="cr-o">¿Es otro gasto?</p>}
        <input id="expense-concept" className="inf" placeholder="Ej: Alquiler, supermercado, internet" value={f.servicio || ''} onChange={e => setValue(p => ({ ...p, servicio: e.target.value, conceptoId: '', crearConceptoPendiente: false, guardarComoConceptoFrecuente: false, categoriaGastoId: '', etiquetasIds: [], accionCompuesto: 'nuevo', decisionManual: false }))} />
        {!f.conceptoId && textoConcepto && candidates.length > 0 && <div className="suggestions" aria-label="Conceptos sugeridos">{candidates.map(c => <button type="button" key={c.id} onClick={() => onSelectConcept(c)}>{c.nombre}</button>)}</div>}
        {(textoConcepto || f.monto) && !f.conceptoId && <button type="button" className="text-button" onClick={descartar}>Borrar y empezar de nuevo</button>}
        {textoConcepto && !f.conceptoId && onRemember && <label className="check-line"><input type="checkbox" checked={!!(f.crearConceptoPendiente || f.guardarComoConceptoFrecuente)} onChange={onRemember} />Recordar este concepto</label>}
      </div>}

    <section className="amount-field">
      <div className="section-line"><label htmlFor="expense-amount">Importe</label><div className="currency-switch" aria-label="Moneda">{['ARS', 'USD'].map(mon => <button type="button" key={mon} aria-pressed={(f.moneda || 'ARS') === mon} onClick={() => change('moneda', mon)}>{mon}</button>)}</div></div>
      {detailed ? <><div className="money amount-value">{fmtARS(montoReal(f, tc))}</div><div className="muted small">{f.subconceptos?.length || 0} ítems · Total en pesos{montoUSDReal(f) > 0 ? ` · Incluye ${fmtUSD(montoUSDReal(f))} USD` : ''}</div></> : <div className="amount-input"><span>{f.moneda === 'USD' ? 'US$' : '$'}</span><input id="expense-amount" aria-label="Importe" type="number" step="any" min="0" inputMode="decimal" placeholder="0" value={f.monto ?? ''} onChange={e => change('monto', e.target.value)} /></div>}
      {comparacion && comparacion.estado !== 'sin_base' && <p className="cr-comparacion small">
        {comparacion.porcentaje !== null && comparacion.estado !== 'igual' && <span className={`cr-pct ${comparacion.estado === 'sube' ? 'increase' : 'decrease'}`}>{comparacion.porcentaje > 0 ? '+' : '−'}{Math.abs(comparacion.porcentaje)}%</span>}
        <span className="muted">{`En ${etiquetaMesAnterior} pagaste ${fmtARS(comparacion.anterior)}${comparacion.estado === 'igual' ? ' · igual' : ''}`}</span>
      </p>}
      <button type="button" className="text-button" onClick={onBreakdown}><UiIcon name={detailed ? 'movements' : 'plus'} size={17} />{detailed ? 'Editar desglose' : 'Agregar desglose'}</button>
      {!detailed && f.moneda === 'USD' && <p className="muted small">Equivalente estimado: {fmtARS(Number(f.monto || 0) * Number(tc || 1))} · Cambio {fmtARS(tc)}</p>}
    </section>

    <div className="cr-pago">
      {!mostrarSelects
        ? <div className="cr-pago-fila"><div><small>Se paga con</small><strong>{medio?.nombre || 'Cuenta'} · {instrumento?.nombre || 'Forma de pago'}</strong></div><button type="button" className="text-button" onClick={() => setCambiarPago(true)}>Cambiar</button></div>
        : <div className="field-grid">
          <div className="field"><label htmlFor="expense-account">Cuenta o medio de pago</label><select id="expense-account" className="inf" value={f.medioPagoId || ''} onChange={e => change('medioPagoId', e.target.value)}><option value="">Elegí una cuenta</option>{(config.mediosPago || []).filter(m => (m.activo !== false && m.id !== 'mp_sin_definir') || m.id === f.medioPagoId).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
          <div className="field"><label htmlFor="expense-method">Forma de pago</label><select id="expense-method" className="inf" disabled={automatic} value={f.instrumentoId || ''} onChange={e => change('instrumentoId', e.target.value)}><option value="">Elegí una opción</option>{(config.instrumentosPago || []).filter(m => (m.activo !== false && !m.id.includes('sin_definir')) || m.id === f.instrumentoId).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
        </div>}
      {mostrarSelects && pagoCompleto && <button type="button" className="text-button" onClick={() => setCambiarPago(false)}>Listo</button>}
      <div className="cr-switch-fila"><span><strong>Débito automático</strong><small>{!autoInstrument && !automatic ? 'Pedí al administrador que habilite esta forma de pago.' : 'Confirmás el pago cuando veas el débito.'}</small></span><button type="button" role="switch" aria-checked={automatic} aria-label="Débito automático" disabled={!autoInstrument && !automatic} className="cr-switch" onClick={() => toggleAutomatic(!automatic)}><span /></button></div>
    </div>

    <div className="field"><label>Estado</label><div className="segmented"><button type="button" aria-pressed={f.estado === 'pagado'} onClick={() => change('estado', 'pagado')}>Pagado</button><button type="button" aria-pressed={f.estado === 'pendiente'} onClick={() => change('estado', 'pendiente')}>Pendiente</button></div></div>

    <div className="field">
      <label htmlFor={usaOtroDia ? 'expense-day' : undefined}>{diasRapidos.length ? '¿Cuándo fue?' : 'Día del registro'}</label>
      {diasRapidos.length > 0 && <div className="cr-chips">{diasRapidos.map(d => <button type="button" key={d.id} aria-pressed={!usaOtroDia && String(f.dia) === d.dia} onClick={() => { setOtroDia(false); change('dia', d.dia); }}><strong>{d.label}</strong><small>{d.detalle}</small></button>)}<button type="button" aria-pressed={usaOtroDia} onClick={() => setOtroDia(true)}><strong>Otro día</strong><small>elegir</small></button></div>}
      {usaOtroDia && <input id="expense-day" className="inf" type="number" min="1" max={maxDay} inputMode="numeric" value={f.dia ?? ''} onChange={e => change('dia', e.target.value)} />}
    </div>

    {(f.estado === 'pendiente' || advanced || f.vencimiento) && <div className="field">
      <label htmlFor={usaOtraFecha ? 'expense-due' : undefined}>¿Cuándo vence?</label>
      <div className="cr-chips">{vencimientos.map(v => <button type="button" key={v.id} aria-pressed={f.vencimiento === v.fecha} onClick={() => { setOtraFecha(false); change('vencimiento', v.fecha); }}><strong>{v.label}</strong><small>{v.detalle}</small></button>)}<button type="button" aria-pressed={usaOtraFecha} onClick={() => setOtraFecha(true)}><strong>Elegir fecha</strong><small>calendario</small></button></div>
      {usaOtraFecha && <input id="expense-due" className="inf" type="date" value={f.vencimiento || ''} onChange={e => change('vencimiento', e.target.value)} />}
      {f.estado === 'pendiente' && !f.vencimiento && <p className="muted small">Elegí la fecha o activá «Revisar después» si todavía no la sabés.</p>}
    </div>}

    {(advanced || f.requiereRevision || f.estado === 'pendiente') && <label className="check-line review-line"><input type="checkbox" checked={!!f.requiereRevision} onChange={review} /><span>{f.estado === 'pendiente' && !f.vencimiento ? 'Todavía no sé la fecha: revisar después' : 'Revisar después'}<small>Controlar importe, factura o fecha más adelante.</small></span></label>}

    <button type="button" className="disclosure" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><span>Más opciones <small className="muted">· nota, se repite</small></span><UiIcon name="plus" size={18} style={{ transform: advanced ? 'rotate(45deg)' : undefined }} /></button>
    {advanced && <><div className="field"><label htmlFor="expense-note">Nota <span className="muted">· opcional</span></label><input id="expense-note" className="inf" placeholder="Ej: Cuota 2 de 6" value={f.observacion || ''} onChange={e => change('observacion', e.target.value)} /></div><label className="check-line"><input type="checkbox" checked={!!f.esRecurrente} onChange={e => change('esRecurrente', e.target.checked)} />Se repite todos los meses</label></>}
  </div>;
}
