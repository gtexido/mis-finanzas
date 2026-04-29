import React from "react";
import VencBadge from "./VencBadge";
import { diasRestantes, getGrupoVencimiento, semaforo } from "../utils/dates";
import { fmtARS, fmtFecha } from "../utils/formatters";
import { montoReal, montoUSDReal } from "../utils/money";

export default function VencimientosView({ data, config, mesActual, tc, onEdit, onMarcarPagado }) {
  const [soloMes, setSoloMes] = React.useState(false);

  const getMesKey = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const mesKey = getMesKey(mesActual.y, mesActual.m);
  const mesNombre = MESES[mesActual.m] || "Mes";

  const todos = Object.entries(data.gastos || {}).flatMap(([key, gastos]) =>
    (gastos || [])
      .filter((g) => g.estado === "pendiente" && g.vencimiento)
      .map((g) => ({ ...g, mesKey: key }))
  );

  const filtrados = soloMes ? todos.filter((g) => g.mesKey === mesKey) : todos;
  const ordenados = [...filtrados].sort(
    (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)
  );

  const vencidos = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "vencidos");
  const hoy_ = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "hoy");
  const estaSemana = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "esta_semana");
  const proximos = ordenados.filter((g) => getGrupoVencimiento(g.vencimiento) === "proximos");

  const totalPendiente = ordenados.reduce((acc, g) => acc + montoReal(g, tc), 0);
  const totalUsd = ordenados.reduce((acc, g) => acc + montoUSDReal(g), 0);
  const masCercano = ordenados[0] || null;
  const diasMasCercano = masCercano ? diasRestantes(masCercano.vencimiento) : null;

  const getNombreMesKey = (key) => {
    const idx = parseInt(String(key).split("-")[1], 10) - 1;
    return MESES[idx] || key;
  };

  const StatCard = ({ label, value, tone = "neutral", hint }) => {
    const tones = {
      danger: { bg: "#2a1a1a", border: "#f8717144", color: "#f87171" },
      warn: { bg: "#2a1908", border: "#fb923c44", color: "#fb923c" },
      ok: { bg: "#0a2010", border: "#4ade8044", color: "#4ade80" },
      info: { bg: "#0b1b33", border: "#38bdf844", color: "#38bdf8" },
      neutral: { bg: "#13131a", border: "#2a2a3a", color: "#e2e8f0" },
    };
    const t = tones[tone] || tones.neutral;

    return (
      <div
        style={{
          flex: 1,
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          padding: "10px 12px",
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, letterSpacing: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 20, color: t.color, fontWeight: 900, lineHeight: 1.15 }}>
          {value}
        </div>
        {hint && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{hint}</div>}
      </div>
    );
  };

  const Grupo = ({ titulo, subtitulo, items, colorTitulo, emptyText }) => {
    if (!items.length) return null;

    return (
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: colorTitulo,
                fontWeight: 900,
                letterSpacing: 0.6,
              }}
            >
              {titulo}
            </div>
            {subtitulo && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{subtitulo}</div>}
          </div>
          <div style={{ fontSize: 10, color: "#64748b" }}>{items.length} item{items.length !== 1 ? "s" : ""}</div>
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
                background: "linear-gradient(180deg,#151520,#101018)",
                border: `1px solid ${s?.color || "#334155"}33`,
                borderRadius: 18,
                padding: "12px 13px",
                marginBottom: 8,
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,.18)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
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
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#f8fafc" }}>
                      {g.servicio && g.servicio.trim() !== "" ? g.servicio : "Sin concepto"}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 7, lineHeight: 1.35 }}>
                    {cat?.label || "Sin categoría"}
                    {g.mesKey !== mesKey && (
                      <span style={{ color: "#a78bfa" }}> · {getNombreMesKey(g.mesKey)}</span>
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
                        fontWeight: 800,
                        background: "#2a1a0a",
                        color: "#fb923c",
                        border: "1px solid #fb923c33",
                      }}
                    >
                      ⏳ Pendiente
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
                          fontWeight: 800,
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

                <div style={{ textAlign: "right", marginLeft: 4, minWidth: 88 }}>
                  {usd > 0 ? (
                    <>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 13,
                          color: "#38bdf8",
                          fontWeight: 800,
                        }}
                      >
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
                        fontWeight: 800,
                        color: monto > 0 ? "#e2e8f0" : "#64748b",
                      }}
                    >
                      {monto > 0 ? fmtARS(monto) : "$ —"}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarcarPagado(g.id, g.mesKey);
                    }}
                    style={{
                      border: "1px solid #4ade8044",
                      borderRadius: 10,
                      padding: "6px 8px",
                      cursor: "pointer",
                      background: "#052e16",
                      color: "#4ade80",
                      fontFamily: "'DM Sans',sans-serif",
                      fontWeight: 800,
                      fontSize: 10,
                      marginTop: 7,
                    }}
                  >
                    ✅ Pagar
                  </button>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 900, letterSpacing: 2 }}>
            MIS FINANZAS
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#f8fafc", lineHeight: 1.05 }}>
            Vencimientos
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            {soloMes ? `${mesNombre} ${mesActual.y}` : "Todos los meses"}
          </div>
        </div>
        <button
          onClick={() => setSoloMes(!soloMes)}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: 800,
            fontSize: 12,
            background: soloMes ? "#7c3aed" : "#1e1e2e",
            color: soloMes ? "#fff" : "#cbd5e1",
          }}
        >
          {soloMes ? "Solo mes" : "Todos"}
        </button>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg,#171326,#24113f)",
          border: "1px solid #7c3aed66",
          borderRadius: 20,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 900, letterSpacing: 1 }}>
              TOTAL PENDIENTE
            </div>
            <div style={{ fontSize: 25, color: totalPendiente > 0 ? "#fb923c" : "#4ade80", fontWeight: 900, lineHeight: 1.1 }}>
              {fmtARS(totalPendiente)}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              {ordenados.length} vencimiento{ordenados.length !== 1 ? "s" : ""} pendiente{ordenados.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 900, letterSpacing: 1 }}>
              MÁS CERCANO
            </div>
            <div style={{ fontSize: 17, color: masCercano ? "#f8fafc" : "#4ade80", fontWeight: 900 }}>
              {masCercano ? (diasMasCercano === 0 ? "Hoy" : `${diasMasCercano} días`) : "Libre"}
            </div>
            {totalUsd > 0 && (
              <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 4 }}>
                U$D {new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUsd)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <StatCard label="VENCIDOS" value={vencidos.length} tone={vencidos.length ? "danger" : "neutral"} hint="requieren acción" />
        <StatCard label="HOY" value={hoy_.length} tone={hoy_.length ? "warn" : "neutral"} hint="vencen hoy" />
        <StatCard label="SEMANA" value={estaSemana.length} tone={estaSemana.length ? "warn" : "neutral"} hint="próximos días" />
        <StatCard label="PRÓXIMOS" value={proximos.length} tone={proximos.length ? "ok" : "neutral"} hint="más adelante" />
      </div>

      <div
        style={{
          background: "#0b172c",
          border: "1px solid #38bdf844",
          borderRadius: 16,
          padding: "10px 12px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ fontSize: 18 }}>💡</div>
        <div>
          <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 900, letterSpacing: 1 }}>
            PANORAMA
          </div>
          <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 800, lineHeight: 1.35 }}>
            {ordenados.length === 0
              ? "No tenés vencimientos pendientes. Cuando cargues Mayo, acá vas a ver alertas y próximos pagos."
              : vencidos.length > 0
                ? `Tenés ${vencidos.length} vencimiento${vencidos.length !== 1 ? "s" : ""} vencido${vencidos.length !== 1 ? "s" : ""}. Conviene resolverlo primero.`
                : hoy_.length > 0
                  ? `Tenés ${hoy_.length} vencimiento${hoy_.length !== 1 ? "s" : ""} para hoy.`
                  : estaSemana.length > 0
                    ? `Tenés ${estaSemana.length} pago${estaSemana.length !== 1 ? "s" : ""} cerca esta semana.`
                    : "Todo tranquilo por ahora. Tus próximos vencimientos están más adelante."}
          </div>
        </div>
      </div>

      {ordenados.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "34px 18px",
            color: "#64748b",
            background: "#101018",
            border: "1px solid #2a2a3a",
            borderRadius: 20,
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#f8fafc" }}>Sin vencimientos pendientes</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
            Cuando cargues gastos con fecha de vencimiento, los vas a ver agrupados por urgencia.
          </div>
        </div>
      )}

      <Grupo titulo="🔴 Vencidos" subtitulo="Pagos que ya pasaron la fecha." items={vencidos} colorTitulo="#f87171" />
      <Grupo titulo="🔴 Vencen hoy" subtitulo="Pagos para resolver durante el día." items={hoy_} colorTitulo="#f87171" />
      <Grupo titulo="🟠 Esta semana" subtitulo="Pagos próximos para anticiparte." items={estaSemana} colorTitulo="#fb923c" />
      <Grupo titulo="🟢 Próximos" subtitulo="Vencimientos más adelante." items={proximos} colorTitulo="#4ade80" />
    </div>
  );
}
