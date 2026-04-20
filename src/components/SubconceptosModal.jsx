import { useState } from "react";
import { fmtARS, fmtUSD } from "../utils/formatters";

const SUBCONCEPTOS_USD_SUGERIDOS = [
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
  "Otro",
];

export default function SubconceptosModal({ gasto, tc, onSave, onClose }) {
  const [items, setItems] = useState(gasto.subconceptos ? [...gasto.subconceptos] : []);
  const [newNombre, setNewNombre] = useState("");
  const [newMonto, setNewMonto] = useState("");
  const [sugerido, setSugerido] = useState("");

  const totalUSD = items.reduce((a, s) => a + s.montoUSD, 0);

  const addItem = () => {
    const nombre = sugerido || newNombre.trim();
    if (!nombre || !newMonto) return;

    setItems((prev) => [
      ...prev,
      { id: "sc" + Date.now(), nombre, montoUSD: Number(newMonto) },
    ]);

    setNewNombre("");
    setNewMonto("");
    setSugerido("");
  };

  const delItem = (id) => setItems((prev) => prev.filter((s) => s.id !== id));

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17 }}>💵 {gasto.servicio}</div>
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
          Desglose en dólares · TC ${tc.toLocaleString("es-AR")}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>TOTAL USD</div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#38bdf8",
                }}
              >
                {fmtUSD(totalUSD)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>EN PESOS</div>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#a78bfa",
                }}
              >
                {fmtARS(totalUSD * tc)}
              </div>
            </div>
          </div>
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
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.nombre}</div>
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
                  {fmtUSD(s.montoUSD)}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {fmtARS(s.montoUSD * tc)}
                </div>
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
            {SUBCONCEPTOS_USD_SUGERIDOS.filter((s) => !items.some((i) => i.nombre === s))
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
                U$D
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
                  padding: "10px 13px 10px 44px",
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

          {newMonto && (
            <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 6 }}>
              ≈ {fmtARS(Number(newMonto) * tc)}
            </div>
          )}
        </div>

        <button
          onClick={() => onSave(items)}
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