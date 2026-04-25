import { useState } from "react";
import { fmtARS, fmtUSD } from "../utils/formatters";

const SUBCONCEPTOS_SUGERIDOS = [
  "Google One",
  "YouTube",
  "ChatGPT",
  "Netflix",
  "Spotify",
  "Microsoft 365",
  "Apple",
  "Amazon",
  "iCloud",
  "Disney+",
  "HBO",
  "Canva",
  "Notion",
  "Dropbox",
  "Shell",
  "YPF",
  "Axion",
  "Carrefour",
  "Chango Mas",
  "Dino",
  "Otro",
];

const normalizarMoneda = (moneda) => {
  return String(moneda || "ARS").trim().toUpperCase();
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function SubconceptosModal({ gasto, tc, onSave, onClose }) {
  const monedaMovimiento = normalizarMoneda(gasto.moneda || "ARS");
  const tipoCambioActual = toNumber(tc, 1);

  const calcularMontoARS = (monto, moneda, tipoCambio = tipoCambioActual) => {
    const n = toNumber(monto);
    const mon = normalizarMoneda(moneda);

    if (mon === "USD") {
      return n * toNumber(tipoCambio, 1);
    }

    return n;
  };

  const normalizarItem = (item) => {
    const monedaItem = normalizarMoneda(item.moneda || monedaMovimiento);
    const monto = toNumber(item.monto ?? item.montoUSD ?? 0);

    const tipoCambio =
      item.tipoCambio !== null && item.tipoCambio !== undefined && item.tipoCambio !== ""
        ? toNumber(item.tipoCambio, null)
        : item.tipo_cambio !== null && item.tipo_cambio !== undefined && item.tipo_cambio !== ""
          ? toNumber(item.tipo_cambio, null)
          : monedaItem === "USD"
            ? tipoCambioActual
            : null;

    const montoARSCalculado =
      item.montoARSCalculado !== null &&
      item.montoARSCalculado !== undefined &&
      item.montoARSCalculado !== ""
        ? toNumber(item.montoARSCalculado, null)
        : item.monto_ars_calculado !== null &&
          item.monto_ars_calculado !== undefined &&
          item.monto_ars_calculado !== ""
          ? toNumber(item.monto_ars_calculado, null)
          : calcularMontoARS(monto, monedaItem, tipoCambio);

    return {
      ...item,
      id: item.id || item.detalleId || `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nombre: item.nombre || item.nombreItem || item.nombre_item || "",
      monto,
      moneda: monedaItem,
      tipoCambio,
      montoARSCalculado,
    };
  };

  const [items, setItems] = useState(
    gasto.subconceptos ? gasto.subconceptos.map(normalizarItem) : []
  );

  const [newNombre, setNewNombre] = useState("");
  const [newMonto, setNewMonto] = useState("");
  const [newMoneda, setNewMoneda] = useState(monedaMovimiento);
  const [sugerido, setSugerido] = useState("");

  const fmtMonto = (monto, mon = "ARS") => {
    const n = toNumber(monto);
    return normalizarMoneda(mon) === "USD" ? fmtUSD(n) : fmtARS(n);
  };

  const totalARS = items.reduce((acc, item) => {
    return acc + calcularMontoARS(item.monto, item.moneda, item.tipoCambio);
  }, 0);

  const totalUSD = items.reduce((acc, item) => {
    return normalizarMoneda(item.moneda) === "USD" ? acc + toNumber(item.monto) : acc;
  }, 0);

  const totalARSDirecto = items.reduce((acc, item) => {
    return normalizarMoneda(item.moneda) === "ARS" ? acc + toNumber(item.monto) : acc;
  }, 0);

  const tieneUSD = totalUSD > 0;
  const tieneARS = totalARSDirecto > 0;
  const tieneMonedaMixta = tieneUSD && tieneARS;

  const buildNuevoItem = () => {
    const nombre = (sugerido || newNombre || "").trim();
    const monto = toNumber(newMonto);
    const moneda = normalizarMoneda(newMoneda);

    if (!nombre || !newMonto) return null;

    const tipoCambio = moneda === "USD" ? tipoCambioActual : null;
    const montoARSCalculado = calcularMontoARS(monto, moneda, tipoCambio);

    return {
      id: `sc_${Date.now()}`,
      nombre,
      monto,
      moneda,
      tipoCambio,
      montoARSCalculado,
    };
  };

  const addItem = () => {
    const nuevo = buildNuevoItem();
    if (!nuevo) return;

    setItems((prev) => [...prev, nuevo]);
    setNewNombre("");
    setNewMonto("");
    setSugerido("");
  };

  const delItem = (id) => setItems((prev) => prev.filter((s) => s.id !== id));

  const prepararItemsParaGuardar = (itemsFinales) => {
    return itemsFinales.map((item, index) => {
      const moneda = normalizarMoneda(item.moneda);
      const monto = toNumber(item.monto);
      const tipoCambio = moneda === "USD" ? toNumber(item.tipoCambio || tipoCambioActual, 1) : null;
      const montoARSCalculado = calcularMontoARS(monto, moneda, tipoCambio);

      return {
        ...item,
        nombre: item.nombre || item.nombreItem || "Item",
        monto,
        moneda,
        tipoCambio,
        montoARSCalculado,
        orden: index + 1,
      };
    });
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
      onClick={onClose}
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
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            🧾 {gasto.servicio}
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
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
          Desglose por ítem · ARS/USD
          {tipoCambioActual ? ` · TC $${tipoCambioActual.toLocaleString("es-AR")}` : ""}
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
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                TOTAL EN PESOS
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#38bdf8",
                }}
              >
                {fmtARS(totalARS)}
              </div>
            </div>

            {tieneUSD && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                  TOTAL USD
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 16,
                    fontWeight: 700,
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

        {items.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #1e1e2e",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.nombre}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                {normalizarMoneda(s.moneda)}
                {normalizarMoneda(s.moneda) === "USD" ? ` · TC $${toNumber(s.tipoCambio || tipoCambioActual).toLocaleString("es-AR")}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 13,
                    color: "#38bdf8",
                    fontWeight: 700,
                  }}
                >
                  {fmtMonto(s.monto, s.moneda)}
                </div>

                {normalizarMoneda(s.moneda) === "USD" && (
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {fmtARS(calcularMontoARS(s.monto, s.moneda, s.tipoCambio))}
                  </div>
                )}
              </div>

              <button
                onClick={() => delItem(s.id)}
                style={{
                  background: "#2a1a1a",
                  border: "none",
                  color: "#f87171",
                  borderRadius: 8,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

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
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            + AGREGAR ÍTEM
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {SUBCONCEPTOS_SUGERIDOS.filter((s) => !items.some((i) => i.nombre === s))
              .slice(0, 8)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => setSugerido(s === sugerido ? "" : s)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: 600,
                    fontSize: 12,
                    background: sugerido === s ? "#1e3a5f" : "#1e1e2e",
                    color: sugerido === s ? "#38bdf8" : "#64748b",
                  }}
                >
                  {s}
                </button>
              ))}
          </div>

          <input
            style={{
              width: "100%",
              background: "#1a1a24",
              border: "1.5px solid #2a2a3e",
              borderRadius: 12,
              padding: "10px 13px",
              color: "#e2e8f0",
              fontSize: 14,
              outline: "none",
              fontFamily: "'DM Sans',sans-serif",
              marginBottom: 8,
            }}
            placeholder="O escribí el nombre..."
            value={sugerido || newNombre}
            onChange={(e) => {
              setSugerido("");
              setNewNombre(e.target.value);
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 92 }}>
              <select
                value={newMoneda}
                onChange={(e) => setNewMoneda(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1a1a24",
                  border: "1.5px solid #1e3a5f",
                  borderRadius: 12,
                  padding: "10px 8px",
                  color: "#e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 700,
                  height: "100%",
                }}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#38bdf8",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {newMoneda === "USD" ? "USD" : "$"}
              </span>

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                style={{
                  width: "100%",
                  background: "#1a1a24",
                  border: "1.5px solid #1e3a5f",
                  borderRadius: 12,
                  padding: "10px 13px 10px 52px",
                  color: "#e2e8f0",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "'DM Sans',sans-serif",
                }}
                placeholder="0.00"
                value={newMonto}
                onChange={(e) => setNewMonto(e.target.value)}
              />
            </div>

            <button
              onClick={addItem}
              style={{
                background: "#1e3a5f",
                border: "none",
                color: "#38bdf8",
                borderRadius: 12,
                padding: "10px 18px",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              +
            </button>
          </div>

          {newMonto && newMoneda === "USD" && (
            <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 6 }}>
              ≈ {fmtARS(toNumber(newMonto) * tipoCambioActual)}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const nuevoPendiente = buildNuevoItem();

            const itemsFinales = nuevoPendiente
              ? [...items, nuevoPendiente]
              : items;

            onSave(prepararItemsParaGuardar(itemsFinales));

            if (nuevoPendiente) {
              setNewNombre("");
              setNewMonto("");
              setSugerido("");
            }
          }}
          style={{
            width: "100%",
            background: "#1e3a5f",
            border: "1px solid #38bdf844",
            color: "#38bdf8",
            borderRadius: 14,
            padding: 16,
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 700,
            fontSize: 16,
            marginTop: 16,
          }}
        >
          Guardar desglose
        </button>
      </div>
    </div>
  );
}