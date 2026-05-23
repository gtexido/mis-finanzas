import React from "react";
import { MESES } from "../utils/dates";

export default function IngresosView({ mes, cambiarMes, children }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>
            Mis Finanzas
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>
            Ingresos
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {MESES[mes.m]} {mes.y}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pb" onClick={() => cambiarMes(-1)} style={{ background: "#1e1e2e", color: "#c4b5fd", borderRadius: 14, padding: "9px 12px" }}>
            ‹
          </button>
          <button className="pb" onClick={() => cambiarMes(1)} style={{ background: "#1e1e2e", color: "#c4b5fd", borderRadius: 14, padding: "9px 12px" }}>
            ›
          </button>
        </div>
      </div>

      {children}
    </>
  );
}
