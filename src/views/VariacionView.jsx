import React from 'react';
import { fmtARS, slugKey, normalizarEtiquetaVisual } from '../utils/formatters';
import { getMesKey, MESES } from '../utils/dates';
import { montoReal } from '../utils/money';

// Pure string utility copied from App.jsx to keep this view self-contained
const normalizarTexto = (txt = "") =>
  String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function VariacionView({
  mesesAtrasVar,
  setMesesAtrasVar,
  mes,
  data,
  tc,
  categoriaRealDesdeGasto
}) {
  const toARS__ = (g, t) => montoReal(g, t);
  
  const pct_ = (actual, anterior) => {
    if (!anterior) return null;
    return Math.round(((actual - anterior) / anterior) * 100);
  };

  const getMeses_ = () => {
    const r = [];
    for (let i = mesesAtrasVar - 1; i >= 0; i--) {
      let m = mes.m - i;
      let y = mes.y;
      if (m < 0) {
        m += 12;
        y--;
      }
      r.push({ y, m, key: getMesKey(y, m), label: MESES[m].slice(0, 3) });
    }
    return r;
  };

  const ml = getMeses_();
  const actualKey = ml[ml.length - 1].key;
  const anteriorKey = ml.length >= 2 ? ml[ml.length - 2].key : null;
  const totalMes = (key) => (data.gastos[key] || []).reduce((s, g) => s + toARS__(g, tc), 0);
  const totalActual = totalMes(actualKey);
  const totalAnterior = anteriorKey ? totalMes(anteriorKey) : 0;
  const diffTotal = totalActual - totalAnterior;
  const pctTotal = pct_(totalActual, totalAnterior);
  const tieneBase = totalAnterior > 0;

  const claveVariacionGasto = (g = {}) => {
    const conceptoId = String(g.conceptoId || g.concepto_id || "").trim();
    if (conceptoId) return `concepto__${slugKey(conceptoId) || conceptoId}`;

    const nombreConcepto =
      normalizarTexto(
        g.conceptoNombre ||
        g.conceptoManual ||
        g.servicio ||
        "Sin concepto"
      ) || "sin_concepto";

    return `nombre__${slugKey(nombreConcepto) || "sin_concepto"}`;
  };

  const conceptoMap = ml.reduce((acc, { key }) => {
    (data.gastos[key] || []).forEach(g => {
      const nombre = (g.servicio || g.conceptoManual || "Sin concepto").trim() || "Sin concepto";
      const categoriaMeta = categoriaRealDesdeGasto(g);
      const medioNombre = normalizarEtiquetaVisual(g.medioPagoNombre || g.medioPago, "Medio no definido");
      const categoriaNombre = normalizarEtiquetaVisual(categoriaMeta.label, "Sin categoría");
      const clave = claveVariacionGasto(g);

      if (!acc[clave]) {
        acc[clave] = {
          id: clave,
          nombre,
          medioNombre,
          categoriaNombre,
          vals: {},
        };
      }

      acc[clave].nombre = acc[clave].nombre || nombre;
      acc[clave].medioNombre = acc[clave].medioNombre || medioNombre;
      acc[clave].categoriaNombre = acc[clave].categoriaNombre || categoriaNombre;
      acc[clave].vals[key] = (acc[clave].vals[key] || 0) + toARS__(g, tc);
    });
    return acc;
  }, {});

  const conceptos = Object.values(conceptoMap)
    .map((item) => {
      const vals = item.vals || {};
      const actual = vals[actualKey] || 0;
      const anterior = anteriorKey ? (vals[anteriorKey] || 0) : 0;
      return { ...item, vals, actual, anterior, diff: actual - anterior, pct: pct_(actual, anterior) };
    })
    .sort((a, b) => b.actual - a.actual || Math.abs(b.diff) - Math.abs(a.diff));

  const subieron = conceptos.filter(x => x.actual > 0 && x.anterior > 0 && x.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 4);
  const bajaron = conceptos.filter(x => x.actual > 0 && x.anterior > 0 && x.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 4);
  const nuevos = conceptos.filter(x => x.actual > 0 && x.anterior === 0).sort((a, b) => b.actual - a.actual).slice(0, 6);
  const sinGasto = conceptos.filter(x => x.actual === 0 && x.anterior > 0).sort((a, b) => b.anterior - a.anterior).slice(0, 4);
  const colorVar = !tieneBase ? "#c4b5fd" : diffTotal > 0 ? "#f87171" : diffTotal < 0 ? "#4ade80" : "#fbbf24";
  const textoVar = !tieneBase ? "Sin base" : diffTotal > 0 ? `▲ ${pctTotal}%` : diffTotal < 0 ? `▼ ${Math.abs(pctTotal)}%` : "= 0%";
  
  const resumen = !tieneBase
    ? `Cargá al menos dos meses con gastos para ver una comparación real.`
    : diffTotal > 0
      ? `Este mes gastaste ${fmtARS(Math.abs(diffTotal))} más que el mes anterior.`
      : diffTotal < 0
        ? `Este mes gastaste ${fmtARS(Math.abs(diffTotal))} menos que el mes anterior.`
        : "Este mes gastaste lo mismo que el mes anterior.";

  const miniCard = (titulo, valor, subtitulo, color) => (
    <div className="card" style={{ padding: 12, marginBottom: 0 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 900, color }}>{valor}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{subtitulo}</div>
    </div>
  );

  const badgeVariacionItem = (item) => {
    const baseStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 900,
      border: "1px solid transparent",
      whiteSpace: "nowrap",
    };

    if (!anteriorKey) {
      return <span style={{ ...baseStyle, background: "#1e1e2e", color: "#cbd5e1", borderColor: "#334155" }}>Sin base</span>;
    }

    if (item.actual > 0 && item.anterior === 0) {
      return <span style={{ ...baseStyle, background: "#1a1230", color: "#c4b5fd", borderColor: "#7c3aed55" }}>🆕 Nuevo</span>;
    }

    if (item.actual === 0 && item.anterior > 0) {
      return <span style={{ ...baseStyle, background: "#111827", color: "#94a3b8", borderColor: "#47556955" }}>♻️ Sin gasto</span>;
    }

    if (item.diff > 0) {
      return (
        <span style={{ ...baseStyle, background: "#2a1212", color: "#fca5a5", borderColor: "#f8717155" }}>
          ▲ +{fmtARS(Math.abs(item.diff))}{item.pct !== null ? ` · ${Math.abs(item.pct)}%` : ""}
        </span>
      );
    }

    if (item.diff < 0) {
      return (
        <span style={{ ...baseStyle, background: "#052e16", color: "#86efac", borderColor: "#22c55e55" }}>
          ▼ -{fmtARS(Math.abs(item.diff))}{item.pct !== null ? ` · ${Math.abs(item.pct)}%` : ""}
        </span>
      );
    }

    return <span style={{ ...baseStyle, background: "#1e1e2e", color: "#facc15", borderColor: "#facc1533" }}>= Sin cambios</span>;
  };

  const listaVariacion = (titulo, icono, items, tipo) => (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{icono} {titulo}</div>
        <div style={{ fontSize: 10, color: "#64748b" }}>{items.length} item{items.length !== 1 ? "s" : ""}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "#64748b", padding: "4px 0 2px" }}>{tipo === "up" ? "Sin aumentos para mostrar." : tipo === "down" ? "Sin bajas para mostrar." : tipo === "new" ? "Sin nuevos gastos este mes." : "No hay gastos desaparecidos."}</div>
      ) : items.map((it, idx) => (
        <div key={`${titulo}-${it.nombre}`} style={{ padding: "9px 0", borderBottom: idx < items.length - 1 ? "1px solid #1e1e2e" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.nombre}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{tipo === "new" ? `Nuevo en ${ml[ml.length - 1].label}` : tipo === "gone" ? `Antes ${fmtARS(it.anterior)}` : `Antes ${fmtARS(it.anterior)}`}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 900, color: tipo === "down" || tipo === "gone" ? "#4ade80" : tipo === "up" ? "#f87171" : "#e2e8f0" }}>{tipo === "new" ? fmtARS(it.actual) : tipo === "gone" ? `-${fmtARS(it.anterior)}` : `${it.diff > 0 ? "+" : "-"} ${fmtARS(Math.abs(it.diff))}`}</div>
              {it.pct !== null && tipo !== "new" && tipo !== "gone" && <div style={{ fontSize: 10, color: tipo === "down" ? "#4ade80" : "#f87171", fontWeight: 800 }}>{Math.abs(it.pct)}%</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const containerRef = React.useRef(null);
  const [width, setWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setWidth(entry.contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const esMobileEvolucion = width <= 640;
  const gridMesesMobile = ml.length <= 3 ? `repeat(${ml.length}, minmax(0, 1fr))` : "repeat(2, minmax(0, 1fr))";
  const metaHistorico = (item) => [item.medioNombre, item.categoriaNombre].filter(Boolean).join(" · ");

  return (
    <div ref={containerRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{ml[0].label} · {ml[ml.length - 1].label} {mes.y}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {[3, 4, 6].map(n => (
            <button key={n} onClick={() => setMesesAtrasVar(n)} style={{ background: mesesAtrasVar === n ? "#7c3aed" : "#1e1e2e", border: "none", color: mesesAtrasVar === n ? "#fff" : "#94a3b8", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>{n}M</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 14, background: "radial-gradient(circle at top right,#7c3aed44 0%,transparent 38%),linear-gradient(135deg,#111827 0%,#1a1230 100%)", border: "1px solid #7c3aed66" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Gasto actual</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 25, fontWeight: 900, color: "#f87171" }}>{fmtARS(totalActual)}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{tieneBase ? `${diffTotal >= 0 ? "+" : "-"} ${fmtARS(Math.abs(diffTotal))} vs mes anterior` : "Sin base suficiente para comparar"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>Variación</div>
            <div style={{ fontSize: 23, fontWeight: 900, color: colorVar, lineHeight: 1.1 }}>{textoVar}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>mes anterior</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {miniCard("Subieron", subieron.length, "con más gasto", "#f87171")}
        {miniCard("Bajaron", bajaron.length, "con menor gasto", "#4ade80")}
        {miniCard("Nuevos", nuevos.length, "aparecen este mes", "#38bdf8")}
        {miniCard("Sin gasto", sinGasto.length, "no aparecen este mes", "#94a3b8")}
      </div>

      <div className="card" style={{ padding: 12, border: "1px solid #1e3a8a", background: "#0f172a" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 30, height: 30, borderRadius: 12, background: "#1e3a8a", display: "flex", alignItems: "center", justifyIntent: "center", flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Resumen de evolución</div>
            <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>{resumen}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{conceptos.length} conceptos registrados en el período visible.</div>
          </div>
        </div>
      </div>

      {listaVariacion("Gastos que más subieron", "📈", subieron, "up")}
      {listaVariacion("Gastos que bajaron", "📉", bajaron, "down")}
      {listaVariacion("Nuevos en el mes", "🆕", nuevos, "new")}
      {listaVariacion("Sin gasto este mes", "♻️", sinGasto, "gone")}

      {esMobileEvolucion ? (
        <div className="card" style={{ padding:12,overflow:"hidden" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14,fontWeight:900 }}>Detalle histórico</div>
              <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>Vista mobile · {ml.length} meses · sin scroll lateral.</div>
            </div>
            <div style={{ fontSize:10,color:"#64748b",flexShrink:0 }}>{conceptos.length} concepto{conceptos.length!==1?"s":""}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {conceptos.map((item) => (
              <div
                key={item.id || item.nombre}
                style={{
                  background: "linear-gradient(135deg,#111827 0%,#151521 100%)",
                  border: "1px solid #25253a",
                  borderRadius: 16,
                  padding: "12px 12px",
                  boxShadow: "0 10px 24px rgba(0,0,0,.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2, wordBreak: "break-word" }}>{item.nombre}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{metaHistorico(item)}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>{badgeVariacionItem(item)}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: gridMesesMobile, gap: 7, marginTop: 10 }}>
                  {ml.map(({ key, label }) => {
                    const valor = item.vals[key] || 0;
                    const esActual = key === actualKey;
                    return (
                      <div
                        key={key}
                        style={{
                          background: esActual ? "#1a1230" : "#0f172a",
                          border: `1px solid ${esActual ? "#7c3aed55" : "#1e3a5f44"}`,
                          borderRadius: 12,
                          padding: "8px 8px",
                          minWidth: 0,
                        }}
                      >
                        <div style={{ fontSize: 9, color: esActual ? "#c4b5fd" : "#64748b", fontWeight: 900, letterSpacing: .6, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 900, color: valor > 0 ? (esActual ? "#e2e8f0" : "#94a3b8") : "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {valor > 0 ? fmtARS(valor) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                  <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: "8px 9px" }}>
                    <div style={{ fontSize: 9, color: "#64748b", fontWeight: 900, textTransform: "uppercase", marginBottom: 3 }}>Anterior</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 900, color: item.anterior > 0 ? "#94a3b8" : "#334155" }}>{item.anterior > 0 ? fmtARS(item.anterior) : "—"}</div>
                  </div>
                  <div style={{ background: "#15111f", border: "1px solid #7c3aed33", borderRadius: 12, padding: "8px 9px", textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#a78bfa", fontWeight: 900, textTransform: "uppercase", marginBottom: 3 }}>Actual</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 900, color: item.actual > 0 ? "#e2e8f0" : "#334155" }}>{item.actual > 0 ? fmtARS(item.actual) : "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Detalle histórico</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Comparación por concepto, medio y categoría.</div>
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{conceptos.length} concepto{conceptos.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ overflowX: "auto", paddingBottom: 4 }}>
            <div style={{ minWidth: 145 + (ml.length * 82) }}>
              <div style={{ display: "grid", gridTemplateColumns: `minmax(145px,1fr) repeat(${ml.length},82px)`, borderBottom: "1px solid #1e1e2e" }}>
                <div style={{ padding: "9px 6px", fontSize: 10, color: "#64748b", fontWeight: 900 }}>CONCEPTO</div>
                {ml.map(({ key, label }) => <div key={key} style={{ padding: "9px 6px", fontSize: 10, color: key === actualKey ? "#a78bfa" : "#64748b", fontWeight: 900, textAlign: "right" }}>{label}</div>)}
              </div>
              {conceptos.map((item, idx) => (
                <div key={item.id || item.nombre} style={{ display: "grid", gridTemplateColumns: `minmax(145px,1fr) repeat(${ml.length},82px)`, borderBottom: idx < conceptos.length - 1 ? "1px solid #1a1a24" : "none" }}>
                  <div style={{ padding: "10px 6px", minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.25, wordBreak: "break-word" }}>{item.nombre}</div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.medioNombre} · {item.categoriaNombre}
                    </div>
                    <div style={{ marginTop: 6 }}>{badgeVariacionItem(item)}</div>
                  </div>
                  {ml.map(({ key }) => <div key={key} style={{ padding: "10px 6px", textAlign: "right", fontFamily: "'Space Mono',monospace", fontSize: 10, color: key === actualKey ? "#e2e8f0" : "#64748b" }}>{item.vals[key] ? fmtARS(item.vals[key]) : <span style={{ color: "#2a2a3e" }}>—</span>}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
