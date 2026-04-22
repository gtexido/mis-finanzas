import React, { useEffect } from "react";
import { diasRestantes, semaforo } from "../utils/dates";
import { fmtARS, fmtUSD } from "../utils/formatters";

export default function EditModal({
  gasto,
  config,
  tc,
  onSave,
  onClose,
  onAbrirSubconceptos,
}) {
  const [f, setF] = React.useState({ vencimiento: "", ...gasto });

useEffect(() => {
  setF({ vencimiento: "", ...gasto });
}, [gasto]);

  const esDolar =
    config.conceptosDolar?.includes(f.servicio) ||
    (f.subconceptos && f.subconceptos.length > 0);

  const totalUSD =
    esDolar && f.subconceptos
      ? f.subconceptos.reduce((a, s) => a + s.montoUSD, 0)
      : 0;

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
            onChange={(e) => setF((p) => ({ ...p, servicio: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={EL2}>CATEGORÍA</div>
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
          <div style={EL2}>FORMA DE PAGO</div>
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

        {esDolar ? (
          <div
            style={{
              marginBottom: 14,
              background: "#0f1a2e",
              border: "1px solid #1e3a5f",
              borderRadius: 16,
              padding: "14px 16px",
            }}
          >
            <div style={EL2}>💵 DESGLOSE EN DÓLARES</div>

            {f.subconceptos && f.subconceptos.length > 0 ? (
              <>
                {f.subconceptos.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#e2e8f0" }}>{s.nombre}</span>
                    <span
                      style={{
                        color: "#38bdf8",
                        fontFamily: "'Space Mono',monospace",
                      }}
                    >
                      {fmtUSD(s.montoUSD)}
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    borderTop: "1px solid #1e3a5f",
                    marginTop: 8,
                    paddingTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#64748b", fontSize: 13 }}>Total</span>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 14,
                        color: "#38bdf8",
                        fontWeight: 700,
                      }}
                    >
                      {fmtUSD(totalUSD)}
                    </div>
                    <div style={{ fontSize: 11, color: "#a78bfa" }}>
                      {fmtARS(totalUSD * tc)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "#64748b", fontSize: 13 }}>Sin ítems aún</div>
            )}

            <button
              onClick={() => onAbrirSubconceptos(f)}
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
          <div style={{ marginBottom: 14 }}>
            <div style={EL2}>MONTO Y MONEDA</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
  		type="number"
 		inputMode="numeric"
  		style={{ ...EI2, flex: 2 }}
  		value={f.monto === 0 ? "" : (f.monto ?? "")}
  		onChange={(e) => {
    		const val = e.target.value;
    		setF((p) => ({
      		...p,
      		monto: val === "" ? "" : Number(val),
    		}));
  		}}
		/>
              <button
                onClick={() => setF((p) => ({ ...p, moneda: "ARS" }))}
                style={{
                  border:
                    f.moneda === "ARS"
                      ? "2px solid #7c3aed"
                      : "2px solid transparent",
                  borderRadius: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: "#1e1e2e",
                  color: f.moneda === "ARS" ? "#e2e8f0" : "#64748b",
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
                    f.moneda === "USD"
                      ? "2px solid #38bdf8"
                      : "2px solid transparent",
                  borderRadius: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: f.moneda === "USD" ? "#1e3a5f" : "#1e1e2e",
                  color: f.moneda === "USD" ? "#38bdf8" : "#64748b",
                  fontFamily: "'DM Sans',sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                💵
              </button>
            </div>
          </div>
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
            onChange={(e) =>
              setF((p) => ({ ...p, vencimiento: e.target.value }))
            }
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
            onChange={(e) =>
              setF((p) => ({ ...p, observacion: e.target.value }))
            }
            placeholder="Opcional..."
          />
        </div>

        <button
  onClick={() => {
    console.log("CLICK BOTON GUARDAR CAMBIOS", f);
    onSave(f);
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