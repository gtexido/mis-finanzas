import { fmtARS, fmtUSD, normalizarEtiquetaVisual } from '../utils/formatters';
import { MESES } from '../utils/dates';
import { montoReal, montoUSDReal } from '../utils/money';

// ---------------------------------------------------------------------------
// Local ranking helpers — mirror of App.jsx crearRankingAnalisis /
// crearRankingEtiquetas, rewritten to receive `tc` explicitly instead of
// closing over the App-level `toARS_` closure.
// ---------------------------------------------------------------------------
const crearRankingAnalisis = (items, obtenerClave, obtenerMeta = () => ({}), tc) => {
  const mapa = new Map();

  items.forEach((g) => {
    const clave = normalizarEtiquetaVisual(obtenerClave(g), 'No clasificado');
    const meta = obtenerMeta(g) || {};
    const actual = mapa.get(clave) || {
      nombre: clave,
      total: 0,
      totalUSD: 0,
      cantidad: 0,
      color: meta.color || '#64748b',
      items: [],
    };

    actual.total += montoReal(g, tc);
    actual.totalUSD += montoUSDReal(g);
    actual.cantidad += 1;
    actual.items.push(g);

    if (!actual.color && meta.color) actual.color = meta.color;
    mapa.set(clave, actual);
  });

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

const crearRankingEtiquetas = (items, tc) => {
  const mapa = new Map();

  items.forEach((g) => {
    const etiquetas =
      Array.isArray(g.etiquetas) && g.etiquetas.length
        ? g.etiquetas
        : [{ nombre: 'Sin etiqueta', color: '#64748b' }];

    etiquetas.forEach((tag) => {
      const nombre = tag.nombre || 'Sin etiqueta';
      const actual = mapa.get(nombre) || {
        nombre,
        total: 0,
        totalUSD: 0,
        cantidad: 0,
        color: tag.color || '#64748b',
        items: [],
      };

      actual.total += montoReal(g, tc);
      actual.totalUSD += montoUSDReal(g);
      actual.cantidad += 1;
      actual.items.push(g);
      mapa.set(nombre, actual);
    });
  });

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

// ---------------------------------------------------------------------------
// AnalisisView — presentational only, no state owned here
// ---------------------------------------------------------------------------
export default function AnalisisView({
  mes,
  gastosDelMes,
  totalGastos,
  tc,
  analisisTab,
  setAnalisisTab,
  cambiarMes,
  categoriaRealDesdeGasto,
}) {
  // ── derived rankings ─────────────────────────────────────────────────────
  const analisisPorMedio = crearRankingAnalisis(
    gastosDelMes,
    (g) => normalizarEtiquetaVisual(g.medioPagoNombre || g.medioPago || g.categoriaNombre, 'Medio no definido'),
    (g) => ({ color: g.medioPagoColor }),
    tc
  );

  const analisisPorCategoriaReal = crearRankingAnalisis(
    gastosDelMes,
    (g) => categoriaRealDesdeGasto(g).label || 'Sin categoría',
    (g) => ({ color: categoriaRealDesdeGasto(g).color }),
    tc
  );

  const analisisPorInstrumento = crearRankingAnalisis(
    gastosDelMes,
    (g) => normalizarEtiquetaVisual(g.instrumentoNombre || g.instrumento || g.formaPago, 'Manual'),
    () => ({}),
    tc
  );

  const analisisPorEtiqueta = crearRankingEtiquetas(gastosDelMes, tc);

  const opcionesAnalisis = [
    { id: 'medio',       label: 'Medio',       icon: '🏦',  items: analisisPorMedio,          descripcion: 'Dónde se concentra el gasto.' },
    { id: 'categoria',   label: 'Categoría',   icon: '🧩',  items: analisisPorCategoriaReal,  descripcion: 'En qué se está gastando.' },
    { id: 'instrumento', label: 'Instrumento', icon: '💳',  items: analisisPorInstrumento,    descripcion: 'Cómo se está pagando.' },
    { id: 'etiqueta',    label: 'Etiqueta',    icon: '🏷️', items: analisisPorEtiqueta,       descripcion: 'Qué tipo de gasto domina.' },
  ];

  const analisisActual       = opcionesAnalisis.find((o) => o.id === analisisTab) || opcionesAnalisis[0];
  const esAnalisisEtiqueta   = analisisTab === 'etiqueta';
  const mayorAnalisis        = analisisActual.items[0] || null;
  const maxAnalisis          = Math.max(...analisisActual.items.map((x) => x.total), 1);
  const top3Analisis         = analisisActual.items.slice(0, 3);
  const totalTop3Analisis    = top3Analisis.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const pctTop3Analisis      = totalGastos > 0 ? Math.round((totalTop3Analisis / totalGastos) * 100) : 0;
  const pctMayorAnalisis     = mayorAnalisis && totalGastos > 0 ? Math.round((mayorAnalisis.total / totalGastos) * 100) : 0;
  const ticketPromedioAnalisis = gastosDelMes.length > 0 ? totalGastos / gastosDelMes.length : 0;

  const insightAnalisis = (() => {
    if (!gastosDelMes.length) return 'Cargá gastos para obtener una lectura del mes.';
    if (!mayorAnalisis) return 'No hay grupos suficientes para analizar este período.';

    const nombre = mayorAnalisis.nombre || 'el principal grupo';
    const pct    = pctMayorAnalisis;

    if (analisisTab === 'medio')
      return `${nombre} concentra ${pct}% del gasto. Revisá si ese medio de pago está absorbiendo demasiados pagos.`;
    if (analisisTab === 'categoria')
      return `${nombre} es el principal foco del mes con ${pct}% del gasto. Miralo primero si necesitás ajustar.`;
    if (analisisTab === 'instrumento')
      return `${nombre} explica ${pct}% del gasto según la forma de pago. Sirve para entender cómo se está pagando.`;
    if (analisisTab === 'etiqueta')
      return `${nombre} tiene el mayor acumulado por etiqueta. Esta vista no es excluyente: un mismo gasto puede aportar a más de una etiqueta.`;

    return `${nombre} concentra ${pct}% del gasto del mes.`;
  })();

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div
        className="card"
        style={{
          marginBottom:10,
          padding:"11px 12px",
          border:"1px solid #2a1a4e",
          background:"linear-gradient(135deg,#111827,#15111f)",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          gap:10,
          borderRadius:18
        }}
      >
        <button
          className="pb"
          onClick={()=>cambiarMes(-1)}
          style={{ background:"#1e1e2e",color:"#c4b5fd",padding:"8px 12px",minWidth:38,border:"1px solid #2a1a4e" }}
        >
          ‹
        </button>
        <div style={{ textAlign:"center",minWidth:0 }}>
          <div style={{ fontSize:10,color:"#8b5cf6",fontWeight:900,letterSpacing:1.4,textTransform:"uppercase" }}>Período analizado</div>
          <div style={{ fontSize:17,fontWeight:900,color:"#f8fafc",lineHeight:1.2 }}>{MESES[mes.m]} {mes.y}</div>
        </div>
        <button
          className="pb"
          onClick={()=>cambiarMes(1)}
          style={{ background:"#1e1e2e",color:"#c4b5fd",padding:"8px 12px",minWidth:38,border:"1px solid #2a1a4e" }}
        >
          ›
        </button>
      </div>

      <div className="card" style={{ background:"radial-gradient(circle at top right,#7c3aed44 0%,transparent 34%),linear-gradient(135deg,#111827 0%,#181124 55%,#0f172a 100%)",border:"1px solid #2a1a4e",padding:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:13 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:11,color:"#a78bfa",fontWeight:900,letterSpacing:1.3,textTransform:"uppercase",marginBottom:5 }}>Análisis premium</div>
            <div style={{ fontSize:22,fontWeight:900,lineHeight:1.08,color:"#f8fafc" }}>Dónde se concentra tu gasto</div>
            <div style={{ fontSize:12,color:"#94a3b8",marginTop:6,lineHeight:1.45 }}>{MESES[mes.m]} {mes.y} · {gastosDelMes.length} movimiento{gastosDelMes.length===1?"":"s"}</div>
          </div>
          <div style={{ textAlign:"right",flexShrink:0 }}>
            <div style={{ fontSize:10,color:"#94a3b8",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>Total</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontWeight:900,color:"#f87171",fontSize:17 }}>{fmtARS(totalGastos)}</div>
            <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{fmtARS(ticketPromedioAnalisis)} prom.</div>
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
          <div style={{ background:"#0f172a",border:"1px solid #1e293b",borderRadius:13,padding:"9px 10px" }}>
            <div style={{ fontSize:9,color:"#94a3b8",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>Grupos</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:900,color:"#e2e8f0" }}>{analisisActual.items.length}</div>
          </div>
          <div style={{ background:"#1a1230",border:"1px solid #7c3aed55",borderRadius:13,padding:"9px 10px" }}>
            <div style={{ fontSize:9,color:"#c4b5fd",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>{esAnalisisEtiqueta?"Mayor":"Top 1"}</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:esAnalisisEtiqueta?12:15,fontWeight:900,color:"#c4b5fd",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{esAnalisisEtiqueta?(mayorAnalisis?.nombre||"—"):`${pctMayorAnalisis}%`}</div>
          </div>
          <div style={{ background:"#0f172a",border:"1px solid #334155",borderRadius:13,padding:"9px 10px" }}>
            <div style={{ fontSize:9,color:"#94a3b8",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>{esAnalisisEtiqueta?"Lectura":"Top 3"}</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:esAnalisisEtiqueta?12:15,fontWeight:900,color:"#38bdf8" }}>{esAnalisisEtiqueta?"No excl.":`${pctTop3Analisis}%`}</div>
          </div>
        </div>

        {mayorAnalisis&&(<div style={{ padding:"11px 12px",borderRadius:14,background:"#0b1020",border:"1px solid #1e293b" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:6 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>{esAnalisisEtiqueta?"Mayor acumulado":"Mayor concentración"}</div>
              <div style={{ fontSize:14,fontWeight:900,color:"#f8fafc",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{mayorAnalisis.nombre}</div>
            </div>
            <div style={{ textAlign:"right",flexShrink:0 }}>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:900,color:"#e2e8f0" }}>{fmtARS(mayorAnalisis.total)}</div>
              <div style={{ fontSize:10,color:"#94a3b8" }}>{esAnalisisEtiqueta?"acumulado por etiqueta":`${pctMayorAnalisis}% del mes`}</div>
            </div>
          </div>
          <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.45 }}>{insightAnalisis}</div>
        </div>)}
      </div>

      <div className="card" style={{ padding:10,marginBottom:12 }}>
        <div style={{ fontSize:10,color:"#64748b",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Analizar por</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7 }}>
          {opcionesAnalisis.map(op=>(
            <button
              key={op.id}
              onClick={()=>setAnalisisTab(op.id)}
              style={{
                background:analisisTab===op.id?"#7c3aed":"#111827",
                border:analisisTab===op.id?"1px solid #a78bfa":"1px solid #1e293b",
                color:analisisTab===op.id?"#fff":"#94a3b8",
                borderRadius:13,
                padding:"9px 5px",
                cursor:"pointer",
                fontSize:10,
                fontWeight:900,
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                gap:4
              }}
            >
              <span style={{ fontSize:16 }}>{op.icon}</span>
              <span>{op.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:14 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:900,fontSize:17 }}>{analisisActual.icon} Distribución por {analisisActual.label.toLowerCase()}</div>
            <div style={{ fontSize:12,color:"#64748b",marginTop:3 }}>{analisisActual.descripcion}</div>
          </div>
          <div style={{ fontSize:11,color:"#64748b",textAlign:"right" }}>{analisisActual.items.length} grupo{analisisActual.items.length===1?"":"s"}</div>
        </div>

        {analisisActual.items.length===0&&(<div style={{ padding:"22px 0",textAlign:"center",color:"#64748b",fontSize:13 }}>No hay gastos para analizar en este período.</div>)}

        {analisisActual.items.map((item,idx)=>{
          const pctTotal = totalGastos>0 ? Math.round((item.total/totalGastos)*100) : 0;
          const pctBar   = Math.min((item.total/maxAnalisis)*100,100);
          return(
            <div key={`${analisisTab}-${item.nombre}`} style={{ padding:"13px 0",borderBottom:idx<analisisActual.items.length-1?"1px solid #1e1e2e":"none" }}>
              <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:10,minWidth:0 }}>
                  <span style={{ width:10,height:10,borderRadius:"50%",background:item.color||"#64748b",flexShrink:0,marginTop:4 }} />
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#e2e8f0" }}>{item.nombre}</div>
                    <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{item.cantidad} movimiento{item.cantidad!==1?"s":""} · {esAnalisisEtiqueta?"acumulado por etiqueta":`${pctTotal}% del mes`}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:900,color:"#e2e8f0" }}>{fmtARS(item.total)}</div>
                  {item.totalUSD>0&&<div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:"#38bdf8" }}>{fmtUSD(item.totalUSD)}</div>}
                </div>
              </div>
              <div style={{ height:6,borderRadius:99,background:"#1e1e2e",overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pctBar}%`,background:item.color||"#7c3aed",borderRadius:99,opacity:.9 }} />
              </div>
            </div>
          );
        })}
      </div>

      {analisisTab==="etiqueta"&&(
        <div className="card" style={{ border:"1px solid #1e3a5f",background:"#0f172a" }}>
          <div style={{ fontSize:13,color:"#94a3b8",lineHeight:1.6 }}>
            Nota: las etiquetas no son excluyentes. Un mismo gasto puede tener varias etiquetas, por eso los acumulados por etiqueta pueden superar el total del mes.
          </div>
        </div>
      )}
    </div>
  );
}
