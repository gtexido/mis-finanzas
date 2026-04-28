import React from "react";
import VencBadge from "./VencBadge";
import { diasRestantes, getGrupoVencimiento, semaforo } from "../utils/dates";
import { fmtARS, fmtFecha } from "../utils/formatters";
import { montoReal, montoUSDReal } from "../utils/money";

export default function VencimientosView({ data, config, mesActual, tc, onEdit, onMarcarPagado }) {
  const [soloMes, setSoloMes] = React.useState(false);

  const getMesKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
  const MESES = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const mesKey = getMesKey(mesActual.y, mesActual.m);

  const todos = Object.entries(data.gastos).flatMap(([key, gastos]) =>
    gastos
      .filter((g) => g.estado === "pendiente" && g.vencimiento)
      .map((g) => ({ ...g, mesKey: key }))
  );

  const filtrados = soloMes ? todos.filter((g) => g.mesKey === mesKey) : todos;
  const ordenados = [...filtrados].sort(
    (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
  );

  const vencidos = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "vencidos");
  const hoy_ = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "hoy");
  const proximos = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "esta_semana");
  const resto = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "proximos");

  const Grupo = ({ titulo, items, colorTitulo }) => {
    if (!items.length) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: colorTitulo,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          {titulo}
        </div>

        {items.map((g) => {
          const cat = config.categorias.find((c) => c.id === g.categoria);
          const dias = diasRestantes(g.vencimiento);
          const s = semaforo(dias);
          const monto = montoReal(g, tc);
          const usd = montoUSDReal(g);

          return (
            <div
              key={g.id + "_" + g.mesKey}
              onClick={() => onEdit(g, g.mesKey)}
              style={{
                background: "#13131a",
                border: `1px solid ${s?.color}33`,
                borderRadius: 16,
                padding: "12px 14px",
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
  {cat && (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: cat.color,
        flexShrink: 0,
      }}
    />
  )}

  <div style={{ fontSize: 14, fontWeight: 600 }}>
    {g.servicio && g.servicio.trim() !== "" ? g.servicio : "Sin concepto"}
  </div>
</div>

<div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
  {cat?.label || "Sin categoría"}
  {g.mesKey !== mesKey && (
    <span style={{ color: "#7c3aed" }}>
      {" "}· {MESES[parseInt(g.mesKey.split("-")[1]) - 1]}
    </span>
  )}
  {" "}· Vence {fmtFecha(g.vencimiento)}
  {g.observacion ? ` · ${g.observacion}` : ""}
</div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "2px 7px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        background: g.estado === "pagado" ? "#052e16" : "#2a1a0a",
                        color: g.estado === "pagado" ? "#4ade80" : "#fb923c",
                        border: `1px solid ${g.estado === "pagado" ? "#4ade80" : "#fb923c"}33`,
                      }}
                    >
                      {g.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente"}
                    </span>

                    {g.formaPago === "Débito automático" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: "2px 7px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#1e2a3e",
                          color: "#60a5fa",
                          border: "1px solid #60a5fa33",
                        }}
                      >
                        🏦 Débito auto.
                      </span>
                    )}

                    {s && <VencBadge fecha={g.vencimiento} estado={g.estado} />}
                  </div>
                </div>

                <div style={{ textAlign: "right", marginLeft: 12 }}>
                  {usd > 0 ? (
                    <>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 13,
                          color: "#38bdf8",
                          fontWeight: 700,
                        }}
                      >
                        {fmtARS ? null : null}
                        U$D {new Intl.NumberFormat("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(usd)}
                      </div>
                      <div style={{ fontSize: 10, color: "#a78bfa" }}>{fmtARS(monto)}</div>
                    </>
                  ) : (
                    <div
                      style={{
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        color: monto > 0 ? "#e2e8f0" : "#64748b",
                      }}
                    >
                      {monto > 0 ? fmtARS(monto) : "$ —"}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginTop: 4 }}>
  <div style={{ fontSize: 10, color: "#64748b" }}>✎ editar</div>

  <button
    onClick={(e) => {
      e.stopPropagation();
      onMarcarPagado(g.id, g.mesKey);
    }}
    style={{
      border: "none",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
      background: "#14532d",
      color: "#4ade80",
      fontFamily: "'DM Sans',sans-serif",
      fontWeight: 700,
      fontSize: 11,
    }}
  >
    ✅ Marcar pagado
  </button>
</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>📅 Vencimientos</div>
        <button
          onClick={() => setSoloMes(!soloMes)}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "7px 12px",
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 600,
            fontSize: 12,
            background: soloMes ? "#7c3aed" : "#1e1e2e",
            color: soloMes ? "#fff" : "#94a3b8",
          }}
        >
          {soloMes ? "Solo este mes" : "Todos"}
        </button>
      </div>

      {ordenados.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {vencidos.length > 0 && (
            <div
              style={{
                flex: 1,
                background: "#2a1a1a",
                border: "1px solid #f8717144",
                borderRadius: 14,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b" }}>VENCIDOS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f87171" }}>{vencidos.length}</div>
            </div>
          )}

          {hoy_.length > 0 && (
            <div
              style={{
                flex: 1,
                background: "#2a0e00",
                border: "1px solid #fb923c44",
                borderRadius: 14,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b" }}>HOY</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fb923c" }}>{hoy_.length}</div>
            </div>
          )}

          {proximos.length > 0 && (
            <div
              style={{
                flex: 1,
                background: "#2a0e00",
                border: "1px solid #fb923c44",
                borderRadius: 14,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b" }}>ESTA SEMANA</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fb923c" }}>{proximos.length}</div>
            </div>
          )}

          {resto.length > 0 && (
            <div
              style={{
                flex: 1,
                background: "#0a2010",
                border: "1px solid #4ade8044",
                borderRadius: 14,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b" }}>PRÓXIMOS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>{resto.length}</div>
            </div>
          )}
        </div>
      )}

      {ordenados.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#64748b" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Sin vencimientos pendientes</div>
        </div>
      )}

      <Grupo titulo="🔴 VENCIDOS" items={vencidos} colorTitulo="#f87171" />
      <Grupo titulo="🔴 HOY" items={hoy_} colorTitulo="#f87171" />
      <Grupo titulo="🟠 ESTA SEMANA" items={proximos} colorTitulo="#fb923c" />
      <Grupo titulo="🟢 PRÓXIMOS" items={resto} colorTitulo="#4ade80" />
    </div>
  );
}