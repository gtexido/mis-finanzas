import { useMemo, useState } from "react";
import { fmtARS, fmtUSD } from "../utils/formatters";

const normalizarMoneda = (moneda) => {
  return String(moneda || "ARS").trim().toUpperCase();
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const crearIdTemporal = () =>
  `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function SubconceptosModal({ gasto, tc, onSave, onClose }) {
  const monedaMovimiento = normalizarMoneda(gasto?.moneda || "ARS");
  const tipoCambioActual = toNumber(tc, 1);

  const calcularMontoARS = (monto, moneda, tipoCambio = tipoCambioActual) => {
    const n = toNumber(monto);
    const mon = normalizarMoneda(moneda);

    if (mon === "USD") {
      return n * toNumber(tipoCambio, 1);
    }

    return n;
  };

  const normalizarItem = (item, index = 0) => {
    const monedaItem = normalizarMoneda(item?.moneda || monedaMovimiento);
    const monto = toNumber(item?.monto ?? item?.montoUSD ?? 0);

    const tipoCambio =
      item?.tipoCambio !== null && item?.tipoCambio !== undefined && item?.tipoCambio !== ""
        ? toNumber(item.tipoCambio, null)
        : item?.tipo_cambio !== null && item?.tipo_cambio !== undefined && item?.tipo_cambio !== ""
          ? toNumber(item.tipo_cambio, null)
          : monedaItem === "USD"
            ? tipoCambioActual
            : null;

    const montoARSCalculado =
      item?.montoARSCalculado !== null &&
      item?.montoARSCalculado !== undefined &&
      item?.montoARSCalculado !== ""
        ? toNumber(item.montoARSCalculado, null)
        : item?.monto_ars_calculado !== null &&
          item?.monto_ars_calculado !== undefined &&
          item?.monto_ars_calculado !== ""
          ? toNumber(item.monto_ars_calculado, null)
          : calcularMontoARS(monto, monedaItem, tipoCambio);

    return {
      ...item,
      id: item?.id || item?.detalleId || item?.detalle_id || `sc_exist_${index}_${crearIdTemporal()}`,
      detalleId: item?.detalleId || item?.detalle_id || item?.id || "",
      nombre: item?.nombre || item?.nombreItem || item?.nombre_item || "",
      monto,
      moneda: monedaItem,
      tipoCambio,
      montoARSCalculado,
      observacion: item?.observacion || "",
      orden: item?.orden || index + 1,
    };
  };

  const [items, setItems] = useState(
    Array.isArray(gasto?.subconceptos)
      ? gasto.subconceptos.map((item, index) => normalizarItem(item, index))
      : []
  );

  const [nuevoItem, setNuevoItem] = useState({
    nombre: "",
    monto: "",
    moneda: monedaMovimiento,
    observacion: "",
  });

  const fmtMonto = (monto, mon = "ARS") => {
    const n = toNumber(monto);
    return normalizarMoneda(mon) === "USD" ? fmtUSD(n) : fmtARS(n);
  };

  const actualizarItem = (id, patch) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const siguiente = {
          ...item,
          ...patch,
        };

        const moneda = normalizarMoneda(siguiente.moneda);
        const monto = toNumber(siguiente.monto);
        const tipoCambio = moneda === "USD" ? toNumber(siguiente.tipoCambio || tipoCambioActual, 1) : null;

        return {
          ...siguiente,
          moneda,
          monto,
          tipoCambio,
          montoARSCalculado: calcularMontoARS(monto, moneda, tipoCambio),
        };
      })
    );
  };

  const eliminarItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const limpiarNuevoItem = () => {
    setNuevoItem({
      nombre: "",
      monto: "",
      moneda: monedaMovimiento,
      observacion: "",
    });
  };

  const agregarItem = () => {
    const nombre = String(nuevoItem.nombre || "").trim();
    const monto = toNumber(nuevoItem.monto, null);
    const moneda = normalizarMoneda(nuevoItem.moneda);

    if (!nombre || !Number.isFinite(monto) || monto <= 0) {
      return;
    }

    const tipoCambio = moneda === "USD" ? tipoCambioActual : null;

    setItems((prev) => [
      ...prev,
      {
        id: crearIdTemporal(),
        nombre,
        monto,
        moneda,
        tipoCambio,
        montoARSCalculado: calcularMontoARS(monto, moneda, tipoCambio),
        observacion: String(nuevoItem.observacion || "").trim(),
        orden: prev.length + 1,
      },
    ]);

    limpiarNuevoItem();
  };

  const itemsValidos = useMemo(
    () =>
      items
        .map((item, index) => {
          const nombre = String(item.nombre || item.nombreItem || "").trim();
          const moneda = normalizarMoneda(item.moneda);
          const monto = toNumber(item.monto, null);
          const tipoCambio = moneda === "USD" ? toNumber(item.tipoCambio || tipoCambioActual, 1) : null;

          if (!nombre || !Number.isFinite(monto) || monto <= 0) {
            return null;
          }

          return {
            ...item,
            id: item.id,
            detalleId: item.detalleId || item.detalle_id || "",
            nombre,
            monto,
            moneda,
            tipoCambio,
            montoARSCalculado: calcularMontoARS(monto, moneda, tipoCambio),
            observacion: String(item.observacion || "").trim(),
            orden: index + 1,
          };
        })
        .filter(Boolean),
    [items, tipoCambioActual]
  );

  const totalARS = itemsValidos.reduce(
    (acc, item) => acc + calcularMontoARS(item.monto, item.moneda, item.tipoCambio),
    0
  );

  const totalUSD = itemsValidos.reduce(
    (acc, item) => normalizarMoneda(item.moneda) === "USD" ? acc + toNumber(item.monto) : acc,
    0
  );

  const totalARSDirecto = itemsValidos.reduce(
    (acc, item) => normalizarMoneda(item.moneda) === "ARS" ? acc + toNumber(item.monto) : acc,
    0
  );

  const tieneUSD = totalUSD > 0;
  const tieneARS = totalARSDirecto > 0;
  const tieneMonedaMixta = tieneUSD && tieneARS;
  const hayItemsInvalidos = items.length !== itemsValidos.length;
  const puedeGuardar = itemsValidos.length > 0 && !hayItemsInvalidos;

  const inputStyle = {
    width: "100%",
    background: "#1a1a24",
    border: "1.5px solid #2a2a3e",
    borderRadius: 12,
    padding: "10px 12px",
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
    fontFamily: "'DM Sans',sans-serif",
  };

  const labelStyle = {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 960,
      }}
      onClick={() => {}}
    >
      <div
        style={{
          background: "#13131a",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px",
          width: "100%",
          maxWidth: 480,
          border: "1px solid #1e3a5f",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#e2e8f0" }}>
              🧾 Desglose
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {gasto?.servicio || "Gasto"}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#1e1e2e",
              border: "none",
              color: "#94a3b8",
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              fontWeight: 700,
            }}
          >
            Cancelar
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.45 }}>
          Editá los ítems de este pago · ARS/USD
          {tipoCambioActual ? ` · TC $${tipoCambioActual.toLocaleString("es-AR")}` : ""}
        </div>

        <div style={{ background:"rgba(30,58,95,.16)",border:"1px solid #38bdf8",borderRadius:14,padding:"10px 12px",fontSize:12,color:"#cbd5e1",lineHeight:1.45,marginBottom:16 }}>
          Los ítems se guardan dentro de este gasto. Podés modificar nombres, montos, moneda, observaciones o eliminar ítems. Después tocá <b>Guardar desglose y volver</b> y guardá el gasto principal.
        </div>

        <div
          style={{
            background: "#0f1a2e",
            border: "1px solid #1e3a5f",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>
                TOTAL EN PESOS
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#38bdf8",
                }}
              >
                {fmtARS(totalARS)}
              </div>
            </div>

            {tieneUSD && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>
                  TOTAL USD
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#a78bfa",
                  }}
                >
                  {fmtUSD(totalUSD)}
                </div>
              </div>
            )}
          </div>

          {tieneMonedaMixta && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
              ARS directo: {fmtARS(totalARSDirecto)} · USD convertido: {fmtARS(totalARS - totalARSDirecto)}
            </div>
          )}
        </div>

        {items.length === 0 && (
          <div
            style={{
              background: "#0f0f18",
              border: "1px dashed #334155",
              borderRadius: 16,
              padding: "18px 14px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Todavía no hay ítems. Agregá el primer detalle abajo.
          </div>
        )}

        {items.map((item, index) => {
          const moneda = normalizarMoneda(item.moneda);
          const montoValido = toNumber(item.monto, null);
          const nombreValido = String(item.nombre || "").trim();
          const itemInvalido = !nombreValido || !Number.isFinite(montoValido) || montoValido <= 0;

          return (
            <div
              key={item.id}
              style={{
                background: itemInvalido ? "#211617" : "#0f0f18",
                border: itemInvalido ? "1px solid #f8717144" : "1px solid #1e1e2e",
                borderRadius: 16,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900 }}>
                  Ítem {index + 1}
                </div>

                <button
                  onClick={() => eliminarItem(item.id)}
                  style={{
                    background: "#2a1a1a",
                    border: "none",
                    color: "#f87171",
                    borderRadius: 9,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 800,
                  }}
                >
                  Eliminar
                </button>
              </div>

              <div style={{ marginBottom: 9 }}>
                <div style={labelStyle}>Nombre</div>
                <input
                  style={inputStyle}
                  value={item.nombre}
                  placeholder="Ej: Netflix, Shell, Carrefour..."
                  onChange={(e) => actualizarItem(item.id, { nombre: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 8, marginBottom: 9 }}>
                <div>
                  <div style={labelStyle}>Moneda</div>
                  <select
                    value={moneda}
                    onChange={(e) => actualizarItem(item.id, { moneda: e.target.value })}
                    style={{
                      ...inputStyle,
                      padding: "10px 8px",
                      borderColor: moneda === "USD" ? "#38bdf866" : "#2a2a3e",
                      fontWeight: 800,
                    }}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>Monto</div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    style={{
                      ...inputStyle,
                      borderColor: itemInvalido ? "#f8717166" : "#2a2a3e",
                      fontFamily: "'Space Mono',monospace",
                      fontWeight: 800,
                    }}
                    value={item.monto === "" ? "" : item.monto}
                    placeholder="0.00"
                    onChange={(e) => actualizarItem(item.id, { monto: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 9 }}>
                <div style={labelStyle}>Observación del ítem</div>
                <input
                  style={inputStyle}
                  value={item.observacion || ""}
                  placeholder="Opcional"
                  onChange={(e) => actualizarItem(item.id, { observacion: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: "#64748b" }}>
                <span>
                  {moneda}
                  {moneda === "USD" ? ` · TC $${toNumber(item.tipoCambio || tipoCambioActual).toLocaleString("es-AR")}` : ""}
                </span>
                <span style={{ color: moneda === "USD" ? "#a78bfa" : "#38bdf8", fontWeight: 800 }}>
                  {fmtMonto(item.monto, moneda)}
                  {moneda === "USD" ? ` · ${fmtARS(calcularMontoARS(item.monto, moneda, item.tipoCambio))}` : ""}
                </span>
              </div>

              {itemInvalido && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#f87171", fontWeight: 800 }}>
                  Completá nombre y monto mayor a cero para poder guardar.
                </div>
              )}
            </div>
          );
        })}

        <div
          style={{
            marginTop: 16,
            background: "#0f0f18",
            borderRadius: 16,
            padding: 14,
            border: "1px solid #1e1e2e",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            + AGREGAR ÍTEM MANUAL
          </div>

          <input
            style={{
              ...inputStyle,
              marginBottom: 8,
            }}
            placeholder="Nombre del ítem..."
            value={nuevoItem.nombre}
            onChange={(e) => setNuevoItem((p) => ({ ...p, nombre: e.target.value }))}
          />

          <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 48px", gap: 8, marginBottom: 8 }}>
            <select
              value={nuevoItem.moneda}
              onChange={(e) => setNuevoItem((p) => ({ ...p, moneda: e.target.value }))}
              style={{
                ...inputStyle,
                padding: "10px 8px",
                borderColor: nuevoItem.moneda === "USD" ? "#38bdf866" : "#2a2a3e",
                fontWeight: 800,
              }}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              style={{
                ...inputStyle,
                fontFamily: "'Space Mono',monospace",
                fontWeight: 800,
              }}
              placeholder="0.00"
              value={nuevoItem.monto}
              onChange={(e) => setNuevoItem((p) => ({ ...p, monto: e.target.value }))}
            />

            <button
              onClick={agregarItem}
              style={{
                background: "#1e3a5f",
                border: "none",
                color: "#38bdf8",
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              +
            </button>
          </div>

          <input
            style={{
              ...inputStyle,
            }}
            placeholder="Observación opcional del ítem..."
            value={nuevoItem.observacion}
            onChange={(e) => setNuevoItem((p) => ({ ...p, observacion: e.target.value }))}
          />

          {nuevoItem.monto && nuevoItem.moneda === "USD" && (
            <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 6 }}>
              ≈ {fmtARS(toNumber(nuevoItem.monto) * tipoCambioActual)}
            </div>
          )}
        </div>

        {hayItemsInvalidos && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#f87171", lineHeight: 1.45, fontWeight: 800 }}>
            Hay ítems incompletos. Corregilos o eliminalos antes de guardar.
          </div>
        )}

        <button
          disabled={!puedeGuardar}
          onClick={() => onSave(itemsValidos)}
          style={{
            width: "100%",
            background: puedeGuardar ? "#1e3a5f" : "#1e1e2e",
            border: puedeGuardar ? "1px solid #38bdf844" : "1px solid #334155",
            color: puedeGuardar ? "#38bdf8" : "#64748b",
            borderRadius: 14,
            padding: 16,
            cursor: puedeGuardar ? "pointer" : "not-allowed",
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 800,
            fontSize: 16,
            marginTop: 16,
          }}
        >
          Guardar desglose y volver
        </button>
      </div>
    </div>
  );
}
