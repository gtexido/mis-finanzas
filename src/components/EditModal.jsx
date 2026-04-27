import React, { useEffect } from "react";
import { diasRestantes, semaforo } from "../utils/dates";
import { fmtARS, fmtUSD } from "../utils/formatters";
import { montoReal, montoUSDReal } from "../utils/money";

export default function EditModal({
  gasto,
  config,
  tc,
  onSave,
  onClose,
  onAbrirSubconceptos,
}) {
  const normalizarEtiquetasIniciales = (g) => {
    if (Array.isArray(g?.etiquetasIds)) return g.etiquetasIds.filter(Boolean);

    if (Array.isArray(g?.etiquetas)) {
      return g.etiquetas
        .map((e) => e.id || e.etiquetaId || e.etiqueta_id)
        .filter(Boolean);
    }

    return [];
  };

  const [f, setF] = React.useState({
    vencimiento: "",
    moneda: "ARS",
    etiquetasIds: normalizarEtiquetasIniciales(gasto),
    conceptoId: gasto?.conceptoId || gasto?.concepto_id || "",
    medioPagoId: gasto?.medioPagoId || gasto?.medio_pago_id || "",
    instrumentoId: gasto?.instrumentoId || gasto?.instrumento_id || "",
    categoriaGastoId: gasto?.categoriaGastoId || gasto?.categoria_gasto_id || "",
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
      categoriaGastoId: gasto?.categoriaGastoId || gasto?.categoria_gasto_id || "",
      ...gasto,
    });
  }, [gasto]);

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
      servicio: concepto.nombre || concepto.label || p.servicio,
      medioPagoId: concepto.medioPagoId || p.medioPagoId,
      instrumentoId: concepto.instrumentoId || p.instrumentoId,
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

  const toggleEtiqueta = (etiquetaId) => {
    setF((p) => {
      const actuales = p.etiquetasIds || [];
      const existe = actuales.includes(etiquetaId);

      return {
        ...p,
        etiquetasIds: existe
          ? actuales.filter((id) => id !== etiquetaId)
          : [...actuales, etiquetaId],
      };
    });
  };

  const tieneDesglose = Array.isArray(f.subconceptos) && f.subconceptos.length > 0;
  const moneda = normalizarMoneda(f.moneda || "ARS");
  const tipoCambioActual = toNumber(tc, 1);

  const montoItem = (item) => toNumber(item?.monto ?? item?.montoUSD ?? 0);

  const obtenerTipoCambioItem = (item) => {
    return toNumber(
      item?.tipoCambio ??
        item?.tipo_cambio ??
        f?.tipoCambio ??
        f?.tipo_cambio ??
        tipoCambioActual,
      tipoCambioActual
    );
  };

  const montoARSItem = (item) => {
    const monedaItem = normalizarMoneda(item?.moneda || moneda);
    const monto = montoItem(item);

    const montoARSGuardado =
      item?.montoARSCalculado ?? item?.monto_ars_calculado;

    if (
      montoARSGuardado !== null &&
      montoARSGuardado !== undefined &&
      montoARSGuardado !== ""
    ) {
      return toNumber(montoARSGuardado);
    }

    if (monedaItem === "USD") {
      return monto * obtenerTipoCambioItem(item);
    }

    return monto;
  };

  const fmtMonto = (monto, mon = moneda) => {
    const n = toNumber(monto);
    return normalizarMoneda(mon) === "USD" ? fmtUSD(n) : fmtARS(n);
  };

  const totalDetalleARS = tieneDesglose ? montoReal(f, tipoCambioActual) : 0;
  const totalDetalleUSD = tieneDesglose ? montoUSDReal(f) : 0;

  const totalARSDirecto = tieneDesglose
    ? f.subconceptos.reduce((acc, s) => {
        const monedaItem = normalizarMoneda(s.moneda || moneda);
        return monedaItem === "ARS" ? acc + montoItem(s) : acc;
      }, 0)
    : 0;

  const totalUSDConvertidoARS = tieneDesglose
    ? f.subconceptos.reduce((acc, s) => {
        const monedaItem = normalizarMoneda(s.moneda || moneda);
        return monedaItem === "USD" ? acc + montoARSItem(s) : acc;
      }, 0)
    : 0;

  const tieneUSDDetalle = totalDetalleUSD > 0;
  const tieneARSDetalle = totalARSDirecto > 0;
  const tieneMonedaMixta = tieneUSDDetalle && tieneARSDetalle;

  const EL2 = {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 8,
  };

  const EI2 = {
    width: "100%",
    background: "#1a1a24",
    border: "1.5px solid #2a2a3e",
    borderRadius: 12,
    padding: "11px 13px",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
    fontFamily: "'DM Sans',sans-serif",
  };

  const chipStyle = (active, color = "#7c3aed") => ({
    border: "none",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
    fontWeight: 600,
    fontSize: 12,
    background: active ? color : "#1e1e2e",
    color: active ? "#0a0a0f" : "#94a3b8",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 950,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#13131a",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px",
          width: "100%",
          maxWidth: 480,
          border: "1px solid #2a2a3e",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17 }}>✏️ Editar gasto</div>
          <button
            onClick={onClose}
            style={{
              background: "#1e1e2e",
              border: "none",
              color: "#94a3b8",
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>CONCEPTO</div>
          <input
            style={EI2}
            value={f.servicio}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                servicio: e.target.value,
                conceptoId: "",
              }))
            }
          />
        </div>

        {(config.conceptos || []).length > 0 && (
          <div
            style={{
              marginBottom: 14,
              background: "#0f1a2e",
              border: "1px solid #1e3a5f",
              borderRadius: 16,
              padding: "14px 14px",
            }}
          >
            <div style={{ ...EL2, color: "#38bdf8" }}>
              NUEVO MODELO DE ANÁLISIS
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={EL2}>CONCEPTO SUGERIDO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(config.conceptos || []).map((concepto) => {
                  const activo =
                    f.conceptoId === concepto.id ||
                    f.conceptoId === concepto.conceptoId;

                  return (
                    <button
                      key={concepto.id}
                      onClick={() => aplicarConcepto(concepto)}
                      style={chipStyle(activo, "#38bdf8")}
                    >
                      {concepto.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={EL2}>MEDIO DE PAGO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(config.mediosPago || []).map((mp) => {
                  const activo = f.medioPagoId === mp.id;

                  return (
                    <button
                      key={mp.id}
                      onClick={() =>
                        setF((p) => ({
                          ...p,
                          medioPagoId: mp.id,
                          categoria: legacyCategoriaDesdeMedioPagoId(
                            mp.id,
                            p.categoria
                          ),
                        }))
                      }
                      style={chipStyle(activo, mp.color || "#38bdf8")}
                    >
                      {mp.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={EL2}>INSTRUMENTO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(config.instrumentosPago || []).map((ins) => {
                  const activo = f.instrumentoId === ins.id;

                  return (
                    <button
                      key={ins.id}
                      onClick={() =>
                        setF((p) => ({
                          ...p,
                          instrumentoId: ins.id,
                          formaPago: legacyFormaPagoDesdeInstrumentoId(
                            ins.id,
                            p.formaPago
                          ),
                        }))
                      }
                      style={chipStyle(activo, "#7c3aed")}
                    >
                      {ins.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={EL2}>CATEGORÍA REAL</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(config.categoriasGasto || []).map((cg) => {
                  const activo = f.categoriaGastoId === cg.id;

                  return (
                    <button
                      key={cg.id}
                      onClick={() =>
                        setF((p) => ({
                          ...p,
                          categoriaGastoId: cg.id,
                        }))
                      }
                      style={chipStyle(activo, cg.color || "#38bdf8")}
                    >
                      {cg.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={EL2}>ETIQUETAS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(config.etiquetas || []).map((tag) => {
                  const activo = (f.etiquetasIds || []).includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleEtiqueta(tag.id)}
                      style={chipStyle(activo, tag.color || "#38bdf8")}
                    >
                      {tag.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>CATEGORÍA LEGACY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {config.categorias.map((c) => (
              <button
                key={c.id}
                onClick={() => setF((p) => ({ ...p, categoria: c.id }))}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  background: f.categoria === c.id ? c.color : "#1e1e2e",
                  color: f.categoria === c.id ? "#0a0a0f" : "#94a3b8",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>FORMA DE PAGO LEGACY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {config.formasPago.map((fp) => (
              <button
                key={fp}
                onClick={() => setF((p) => ({ ...p, formaPago: fp }))}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  background: f.formaPago === fp ? "#7c3aed" : "#1e1e2e",
                  color: f.formaPago === fp ? "#fff" : "#94a3b8",
                }}
              >
                {fp}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>MONEDA DEL MOVIMIENTO</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setF((p) => ({ ...p, moneda: "ARS" }))}
              style={{
                border:
                  moneda === "ARS"
                    ? "2px solid #7c3aed"
                    : "2px solid transparent",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                background: "#1e1e2e",
                color: moneda === "ARS" ? "#e2e8f0" : "#64748b",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              $ARS
            </button>

            <button
              onClick={() => setF((p) => ({ ...p, moneda: "USD" }))}
              style={{
                border:
                  moneda === "USD"
                    ? "2px solid #38bdf8"
                    : "2px solid transparent",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                background: moneda === "USD" ? "#1e3a5f" : "#1e1e2e",
                color: moneda === "USD" ? "#38bdf8" : "#64748b",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              💵 USD
            </button>
          </div>
        </div>

        {tieneDesglose ? (
          <div
            style={{
              marginBottom: 14,
              background: "#0f1a2e",
              border: "1px solid #1e3a5f",
              borderRadius: 16,
              padding: "14px 16px",
            }}
          >
            <div style={EL2}>
              🧾 DESGLOSE ARS/USD · TC ${tipoCambioActual.toLocaleString("es-AR")}
            </div>

            {f.subconceptos.map((s, idx) => {
              const monedaItem = normalizarMoneda(s.moneda || moneda);
              const esUSDItem = monedaItem === "USD";
              const tcItem = obtenerTipoCambioItem(s);

              return (
                <div
                  key={s.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "6px 0",
                    fontSize: 13,
                    borderBottom:
                      idx === f.subconceptos.length - 1
                        ? "none"
                        : "1px solid #1e3a5f55",
                  }}
                >
                  <div>
                    <div style={{ color: "#e2e8f0" }}>{s.nombre}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                      {monedaItem}
                      {esUSDItem ? ` · TC $${tcItem.toLocaleString("es-AR")}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: "#38bdf8",
                        fontFamily: "'Space Mono',monospace",
                        fontWeight: 700,
                      }}
                    >
                      {fmtMonto(montoItem(s), monedaItem)}
                    </div>

                    {esUSDItem && (
                      <div style={{ fontSize: 11, color: "#a78bfa" }}>
                        {fmtARS(montoARSItem(s))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div
              style={{
                borderTop: "1px solid #1e3a5f",
                marginTop: 8,
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#64748b", fontSize: 13 }}>Total en pesos</span>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 15,
                    color: "#38bdf8",
                    fontWeight: 700,
                  }}
                >
                  {fmtARS(totalDetalleARS)}
                </div>

                {tieneUSDDetalle && (
                  <div style={{ fontSize: 11, color: "#a78bfa" }}>
                    {fmtUSD(totalDetalleUSD)}
                  </div>
                )}

                {tieneMonedaMixta && (
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    ARS directo {fmtARS(totalARSDirecto)} · USD conv.{" "}
                    {fmtARS(totalUSDConvertidoARS)}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onAbrirSubconceptos({ ...f, moneda })}
              style={{
                width: "100%",
                background: "#1e3a5f",
                border: "none",
                color: "#38bdf8",
                borderRadius: 12,
                padding: "10px 0",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                fontSize: 14,
                marginTop: 12,
              }}
            >
              ✏️ Editar desglose
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={EL2}>MONTO</div>
              <input
                type="number"
                inputMode="numeric"
                style={{ ...EI2 }}
                value={f.monto === 0 ? "" : f.monto ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setF((p) => ({ ...p, monto: val === "" ? "" : Number(val) }));
                }}
              />

              {moneda === "USD" && f.monto && (
                <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 6 }}>
                  ≈ {fmtARS(Number(f.monto || 0) * tipoCambioActual)}
                </div>
              )}
            </div>

            <button
              onClick={() =>
                onAbrirSubconceptos({ ...f, moneda, subconceptos: [] })
              }
              style={{
                width: "100%",
                background: "#1e3a5f",
                border: "none",
                color: "#38bdf8",
                borderRadius: 12,
                padding: "10px 0",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 14,
              }}
            >
              + Convertir a desglose
            </button>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>ESTADO</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setF((p) => ({ ...p, estado: "pagado" }))}
              style={{
                border:
                  f.estado === "pagado"
                    ? "2px solid #4ade80"
                    : "2px solid transparent",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                background: f.estado === "pagado" ? "#14532d" : "#1e1e2e",
                color: f.estado === "pagado" ? "#4ade80" : "#64748b",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              ✅ Pagado
            </button>

            <button
              onClick={() => setF((p) => ({ ...p, estado: "pendiente" }))}
              style={{
                border:
                  f.estado === "pendiente"
                    ? "2px solid #fb923c"
                    : "2px solid transparent",
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                background: f.estado === "pendiente" ? "#422006" : "#1e1e2e",
                color: f.estado === "pendiente" ? "#fb923c" : "#64748b",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              ⏳ Pendiente
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>DÍA DE PAGO</div>
          <input
            type="number"
            inputMode="numeric"
            style={{ ...EI2, width: 100 }}
            value={f.dia}
            onChange={(e) => setF((p) => ({ ...p, dia: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>📅 FECHA DE VENCIMIENTO</div>
          <input
            type="date"
            style={{ ...EI2, colorScheme: "dark" }}
            value={f.vencimiento || ""}
            onChange={(e) => setF((p) => ({ ...p, vencimiento: e.target.value }))}
          />

          {f.vencimiento &&
            (() => {
              const dias = diasRestantes(f.vencimiento);
              const s = semaforo(dias);

              return s ? (
                <div
                  style={{
                    fontSize: 12,
                    color: s.color,
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  {s.icon}{" "}
                  {dias === 0
                    ? "¡Vence hoy!"
                    : dias < 0
                    ? `Venció hace ${Math.abs(dias)} días`
                    : `Faltan ${dias} días`}
                </div>
              ) : null;
            })()}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={EL2}>OBSERVACIÓN</div>
          <input
            style={EI2}
            value={f.observacion || ""}
            onChange={(e) => setF((p) => ({ ...p, observacion: e.target.value }))}
            placeholder="Opcional..."
          />
        </div>

        <button
          onClick={() => {
            const totalFinal = tieneDesglose
              ? totalDetalleARS
              : Number(f.monto || 0);

            onSave({
              ...f,
              moneda,
              monto: totalFinal,
              conceptoId: f.conceptoId || "",
              medioPagoId: f.medioPagoId || "",
              instrumentoId: f.instrumentoId || "",
              categoriaGastoId: f.categoriaGastoId || "",
              etiquetasIds: f.etiquetasIds || [],
            });
          }}
          style={{
            width: "100%",
            background: "#7c3aed",
            border: "none",
            color: "#fff",
            borderRadius: 14,
            padding: 16,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}