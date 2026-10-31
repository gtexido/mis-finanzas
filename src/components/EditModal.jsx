import React, { useEffect, useRef, useState } from "react";
import { montoReal } from "../utils/money";
import { conceptoDesdeGasto } from "../utils/gastos";
import ExpenseFields from "./ExpenseFields";
import UiIcon from "./UiIcon";

export default function EditModal({
  gasto,
  config,
  tc,
  onSave,
  onDelete,
  periodo,
  onClose,
  onAbrirSubconceptos,
}) {
  const guardandoRef = useRef(false);
  const [advanced, setAdvanced] = useState(false);
  const sheetRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus({preventScroll:true});
    return () => { document.body.style.overflow=previousOverflow; previous?.focus?.({preventScroll:true}); };
  }, []);
  const handleKeys = (event) => {
    if(event.key === "Escape" && !guardandoRef.current) { event.preventDefault(); onClose(); }
    if(event.key !== "Tab") return;
    const controls = [...sheetRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheetRef.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState("");
  const normalizarEtiquetasIniciales = (g) => {
    if (Array.isArray(g?.etiquetasIds)) return g.etiquetasIds.filter(Boolean);

    if (Array.isArray(g?.etiquetas)) {
      return g.etiquetas
        .map((e) => e.id || e.etiquetaId || e.etiqueta_id)
        .filter(Boolean);
    }

    return [];
  };

  const categoriaGastoIdInicial = (g = {}) =>
    conceptoDesdeGasto(g, config.conceptos)?.categoriaGastoId ||
    g?.categoriaGastoId ||
    g?.categoria_gasto_id ||
    "";

  const [f, setF] = React.useState({
    vencimiento: "",
    moneda: "ARS",
    etiquetasIds: normalizarEtiquetasIniciales(gasto),
    conceptoId: gasto?.conceptoId || gasto?.concepto_id || "",
    medioPagoId: gasto?.medioPagoId || gasto?.medio_pago_id || "",
    instrumentoId: gasto?.instrumentoId || gasto?.instrumento_id || "",
    categoriaGastoId: categoriaGastoIdInicial(gasto),
    guardarComoConceptoFrecuente: false,
    ...gasto,
  });

  useEffect(() => {
    setF({
      vencimiento: "",
      moneda: "ARS",
      etiquetasIds: normalizarEtiquetasIniciales(gasto),
      conceptoId: gasto?.conceptoId || gasto?.concepto_id || "",
      medioPagoId: gasto?.medioPagoId || gasto?.medio_pago_id || "",
      instrumentoId: gasto?.instrumentoId || gasto?.instrumento_id || "",
      categoriaGastoId: categoriaGastoIdInicial(gasto),
      guardarComoConceptoFrecuente: false,
      ...gasto,
    });
  }, [gasto, config.conceptos]);





  const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalizarMoneda = (moneda) => {
    return String(moneda || "ARS").trim().toUpperCase();
  };

  const legacyCategoriaDesdeMedioPagoId = (medioPagoId, fallback = "") => {
    const map = {
      mp_bancon: "bancon",
      mp_santander: "santander",
      mp_personal_pay: "personal_pay",
      mp_mercado_pago: "mercado_pago",
    };

    return map[medioPagoId] || fallback || "otros";
  };

  const legacyFormaPagoDesdeInstrumentoId = (instrumentoId, fallback = "") => {
    const map = {
      ins_manual: "Manual",
      ins_tarjeta_credito: "Tarjeta",
      ins_debito: "Manual",
      ins_debito_automatico: "Débito automático",
      ins_transferencia: "Manual",
      ins_efectivo: "Manual",
    };

    return map[instrumentoId] || fallback || "Manual";
  };

  const aplicarConcepto = (concepto) => {
    if (!concepto) return;

    setF((p) => ({
      ...p,
      conceptoId: concepto.id || concepto.conceptoId,
      guardarComoConceptoFrecuente: false,
      servicio: concepto.nombre || concepto.label || p.servicio,
      medioPagoId: concepto.medioPagoId || p.medioPagoId,
      instrumentoId: concepto.instrumentoId || p.instrumentoId,
      instrumentoNombre: "", instrumento: "",
      categoriaGastoId: concepto.categoriaGastoId || p.categoriaGastoId,
      etiquetasIds: concepto.etiquetasIds?.length
        ? concepto.etiquetasIds
        : p.etiquetasIds || [],
      moneda: concepto.monedaDefault || p.moneda || "ARS",

      // Compatibilidad legacy mientras seguimos migrando.
      categoria: legacyCategoriaDesdeMedioPagoId(
        concepto.medioPagoId,
        p.categoria
      ),
      formaPago: legacyFormaPagoDesdeInstrumentoId(
        concepto.instrumentoId,
        p.formaPago
      ),
    }));
  };


  const tieneDesglose = Array.isArray(f.subconceptos) && f.subconceptos.length > 0;
  const moneda = normalizarMoneda(f.moneda || "ARS");
  const tipoCambioActual = toNumber(tc, 1);





  const totalDetalleARS = tieneDesglose ? montoReal(f, tipoCambioActual) : 0;



  // QA-14.1: si un gasto queda marcado para revisar, puede no tener vencimiento definitivo.
  // La validación de vencimiento obligatorio aplica solo a pendientes confirmados.
  const pendienteSinVencimiento =
    String(f.estado || "").toLowerCase() === "pendiente" &&
    !String(f.vencimiento || "").trim() &&
    !f.requiereRevision;

  return <div className="ov" style={{zIndex:950}} onClick={()=>!guardandoRef.current && onClose()}>
    <section ref={sheetRef} tabIndex={-1} onKeyDown={handleKeys} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={e=>e.stopPropagation()}>
      <header className="modal-header"><h2 id="edit-title">Editar gasto</h2><button className="icon-button" aria-label="Cerrar edición" onClick={()=>!guardandoRef.current && onClose()}><UiIcon name="close"/></button></header>
      <ExpenseFields value={f} setValue={setF} config={config} tc={tc} maxDay={periodo?new Date(Number(periodo.slice(0,4)),Number(periodo.slice(5,7)),0).getDate():31} suggestions={config.conceptos || []} onSelectConcept={aplicarConcepto} onBreakdown={()=>onAbrirSubconceptos({...f,moneda})} advanced={advanced} setAdvanced={setAdvanced} isEditing onRemember={()=>setF(p=>({...p,guardarComoConceptoFrecuente:!p.guardarComoConceptoFrecuente}))}/>
      {pendienteSinVencimiento&&<p className="error-note">Agregá el vencimiento o marcá Revisar después para guardar.</p>}
      {errorGuardado&&<div className="error-note" role="alert">{errorGuardado}</div>}
      <button className="primary form-submit" disabled={guardando||pendienteSinVencimiento}
          onClick={async () => {
            if (guardandoRef.current || pendienteSinVencimiento) {
              return;
            }

            const totalFinal = tieneDesglose
              ? totalDetalleARS
              : Number(f.monto || 0);
            if (!Number.isFinite(totalFinal) || totalFinal <= 0) {
              setErrorGuardado("Ingresá un importe mayor a cero.");
              return;
            }
            guardandoRef.current = true;
            setGuardando(true);
            setErrorGuardado("");
            try {
            await onSave({
              ...f,
              moneda,
              monto: totalFinal,
              conceptoId: f.conceptoId || "",
              medioPagoId: f.medioPagoId || "",
              instrumentoId: f.instrumentoId || "",
              categoriaGastoId: f.categoriaGastoId || "",
              etiquetasIds: f.etiquetasIds || [],
              guardarComoConceptoFrecuente: !!f.guardarComoConceptoFrecuente && !f.conceptoId,
              requiereRevision: !!f.requiereRevision,
              motivoRevision: f.requiereRevision ? (f.motivoRevision || "REVISAR_MANUAL") : null,
              origenMovimiento: f.origenMovimiento || null,
            });
            } catch (error) {
              setErrorGuardado(error.message || "No se pudieron guardar los cambios.");
              sheetRef.current?.focus({preventScroll:true});
            } finally {
              guardandoRef.current = false;
              setGuardando(false);
            }
          }}
      >{guardando?"Guardando…":"Guardar cambios"}<UiIcon name="check" size={18}/></button>
      {onDelete && <button className="text-button delete-link full-width" disabled={guardando} onClick={onDelete}><UiIcon name="trash" size={17}/>Eliminar este gasto</button>}
    </section>
  </div>;
}
