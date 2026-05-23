import React from "react";
import { MESES } from "../utils/dates";

export default function DetalleView({
  mes,
  filtroEstado,
  setFiltroEstado,
  filtroCatInicio,
  setFiltroCatInicio,
  busqueda,
  setBusqueda,
  tituloDetalle,
  cantidadDetalleFiltrada,
  totalDetalleFiltrado,
  totalPendienteDetalle,
  cantidadPendienteDetalle,
  totalRevisarDetalle,
  cantidadRevisarDetalle,
  hayFiltroActivo,
  sinRegistros,
  fmtARS,
  children,
}) {
  return (
    <>
      {/* ── Header + filter tabs ─────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>MIS FINANZAS</div>
            <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{tituloDetalle}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>
              {MESES[mes.m]} {mes.y} · {cantidadDetalleFiltrada} movimiento{cantidadDetalleFiltrada === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, width: "100%" }}>
          {[
            ["todos", "Todos", "#7c3aed"],
            ["pagado", "Pag.", "#22c55e"],
            ["pendiente", "Pend.", "#fb923c"],
            ["revisar", "Revisar", "#a78bfa"],
          ].map(([v, l, color]) => (
            <button
              key={v}
              className="tb"
              onClick={() => setFiltroEstado(v)}
              style={{
                background: filtroEstado === v ? color : "#1e1e2e",
                color: filtroEstado === v ? "#0a0a0f" : "#94a3b8",
                padding: "8px 6px",
                borderRadius: 12,
                whiteSpace: "nowrap",
                fontWeight: 800,
                fontSize: 11,
                textAlign: "center",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats card ───────────────────────────────────── */}
      <div className="card" style={{ padding: 14, marginBottom: 12, background: "linear-gradient(135deg,#111827 0%,#171226 100%)", border: "1px solid #2a1a4e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              {hayFiltroActivo ? "Resumen filtrado" : "Resumen del detalle"}
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 900, color: filtroEstado === "pendiente" ? "#fb923c" : filtroEstado === "revisar" ? "#c4b5fd" : "#4ade80" }}>
              {fmtARS(totalDetalleFiltrado)}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {cantidadDetalleFiltrada} movimiento{cantidadDetalleFiltrada === 1 ? "" : "s"} en vista
            </div>
          </div>
          {hayFiltroActivo && (
            <button
              onClick={() => { setFiltroCatInicio(null); setFiltroEstado("todos"); setBusqueda(""); }}
              style={{ background: "#1e1e2e", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Limpiar
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "8px 9px" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase" }}>Mov.</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 900, color: "#e2e8f0" }}>{cantidadDetalleFiltrada}</div>
          </div>
          <div style={{ background: "#21160b", border: "1px solid #fb923c44", borderRadius: 12, padding: "8px 9px" }}>
            <div style={{ fontSize: 9, color: "#fdba74", fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase" }}>Pendiente</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 900, color: "#fb923c" }}>{fmtARS(totalPendienteDetalle)}</div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>{cantidadPendienteDetalle} ítem{cantidadPendienteDetalle === 1 ? "" : "s"}</div>
          </div>
          <div style={{ background: "#1a1230", border: "1px solid #a78bfa44", borderRadius: 12, padding: "8px 9px" }}>
            <div style={{ fontSize: 9, color: "#c4b5fd", fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase" }}>Revisar</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 900, color: "#c4b5fd" }}>{fmtARS(totalRevisarDetalle)}</div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>{cantidadRevisarDetalle} ítem{cantidadRevisarDetalle === 1 ? "" : "s"}</div>
          </div>
        </div>
      </div>

      {/* ── Search bar ───────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          className="inf"
          placeholder="🔍 Buscar concepto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ paddingRight: busqueda ? 44 : 14 }}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "#1e1e2e", border: "none", color: "#94a3b8", borderRadius: 10, width: 28, height: 28, cursor: "pointer" }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Hint row ─────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span>💡 Tocá una fila para editar</span>
        {filtroCatInicio && (
          <button
            onClick={() => setFiltroCatInicio(null)}
            style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Ver todo
          </button>
        )}
      </div>

      {/* ── Group list (passed as children from App.jsx) ── */}
      {children}

      {/* ── Empty state ──────────────────────────────────── */}
      {sinRegistros && (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#64748b" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#cbd5e1" }}>Sin registros</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Probá limpiar filtros o cambiar de mes.</div>
          {hayFiltroActivo && (
            <button
              className="pb"
              onClick={() => { setFiltroCatInicio(null); setFiltroEstado("todos"); setBusqueda(""); }}
              style={{ marginTop: 14, background: "#7c3aed", color: "#fff" }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
}
