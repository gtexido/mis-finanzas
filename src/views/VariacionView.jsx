import React, { useState } from 'react';
import MonthComparison from '../components/MonthComparison';
import { formatPercent } from '../utils/comparisons';
import { fmtARS, slugKey, normalizarEtiquetaVisual, normalizarTexto } from '../utils/formatters';
import { getMesKey, MESES } from '../utils/dates';
import { montoReal } from '../utils/money';

export default function VariacionView({
  mesesAtrasVar,
  setMesesAtrasVar,
  mes,
  data,
  tc,
  categoriaRealDesdeGasto
}) {
  const [changeFilter,setChangeFilter] = useState("all");
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
      const appearedBefore = Object.entries(data.gastos).some(([key,rows])=>key<actualKey && rows.some(g=>claveVariacionGasto(g)===item.id));
      return { ...item, vals, actual, anterior, appearedBefore, diff: actual - anterior, pct: pct_(actual, anterior) };
    })
    .sort((a, b) => b.actual - a.actual || Math.abs(b.diff) - Math.abs(a.diff));

  const subieron = conceptos.filter(x => x.actual > 0 && x.anterior > 0 && x.diff > 0);
  const bajaron = conceptos.filter(x => x.actual > 0 && x.anterior > 0 && x.diff < 0);
  const nuevos = conceptos.filter(x => x.actual > 0 && x.anterior === 0 && !x.appearedBefore);
  const reaparecen = conceptos.filter(x => x.actual > 0 && x.anterior === 0 && x.appearedBefore);
  const sinGasto = conceptos.filter(x => x.actual === 0 && x.anterior > 0);
  const changeGroups={up:subieron,down:bajaron,new:nuevos,returning:reaparecen,missing:sinGasto};
  const visibleConcepts=changeFilter==="all"?conceptos.filter(c=>c.actual>0||c.anterior>0):changeGroups[changeFilter];
  const maxTotal = Math.max(...ml.map(m=>totalMes(m.key)),1);
  const now = new Date();
  const partial = mes.y === now.getFullYear() && mes.m === now.getMonth();
  return <>
    <div className="section-line" style={{marginBottom:16}}><span className="eyebrow muted">Gastos por mes</span><select className="inf" aria-label="Período de evolución" style={{width:140}} value={mesesAtrasVar} onChange={e=>setMesesAtrasVar(Number(e.target.value))}>{[3,6,12].map(n=><option key={n} value={n}>{n} meses</option>)}</select></div>
    <section className="report-total"><span className="eyebrow muted">Gastos del mes seleccionado</span><div className="money">{fmtARS(totalActual)}</div></section>
    <MonthComparison current={totalActual} previous={totalAnterior} hasPrevious={!!((data.gastos[anteriorKey]||[]).length || (data.ingresos[anteriorKey]||[]).length || data.sueldo[anteriorKey])} hasCurrent={!!((data.gastos[actualKey]||[]).length || (data.ingresos[actualKey]||[]).length || data.sueldo[actualKey])} previousLabel={anteriorKey} partial={partial}/>
    <div className="surface" style={{padding:"14px 18px"}}><div className="monthly-chart" role="img" aria-label={ml.map(m=>`${m.label} ${m.y}: ${fmtARS(totalMes(m.key))}`).join(". ")}>{ml.map(m=><div className="monthly-bar" key={m.key} title={`${MESES[m.m]} ${m.y}: ${fmtARS(totalMes(m.key))}`}><div style={{height:`${totalMes(m.key)/maxTotal*125}px`}}/><strong>{m.label}</strong></div>)}</div><p className="report-caption" style={{margin:"8px 0"}}>{partial?"Mes actual en curso: comparás un mes parcial con meses anteriores.":"Totales de los movimientos registrados en cada mes."} Los meses sin registros se muestran en cero.</p></div>
    <details className="month-values"><summary>Ver importes por mes</summary>{ml.map(m=><div className="section-line" key={m.key}><span>{MESES[m.m]} {m.y}</span><strong className="money">{fmtARS(totalMes(m.key))}</strong></div>)}</details>
    <div className="change-grid change-selectors">{[["up",subieron.length,"Subieron"],["down",bajaron.length,"Bajaron"],["new",nuevos.length,"Primera carga"],["returning",reaparecen.length,"Reaparecen"],["missing",sinGasto.length,"Sin registro"]].map(([key,value,label])=><button key={key} className={key} aria-pressed={changeFilter===key} onClick={()=>setChangeFilter(changeFilter===key?"all":key)}><strong>{value}</strong><span>{label}</span></button>)}</div>
    <div className="section-line" style={{margin:"25px 0 10px"}}><h2 style={{fontSize:16,fontWeight:550}}>Cambio por concepto</h2>{changeFilter!=="all"&&<button className="text-button" onClick={()=>setChangeFilter("all")}>Ver todos</button>}</div>
    <div className="surface evolution-list">{visibleConcepts.map(c=><details className="evolution-item" key={c.id}><summary><span><strong>{c.nombre}</strong><small>{c.actual===0?'Sin registro este mes':c.anterior===0?c.appearedBefore?'Reaparece · sin registro el mes anterior':'Primera carga en tu historial':c.diff===0?'Sin cambios':`${c.diff>0?'+':'−'}${fmtARS(Math.abs(c.diff))} · ${formatPercent(c.pct)}`}</small></span><strong className={`money ${c.anterior>0&&c.actual>0?(c.diff>0?'increase':c.diff<0?'decrease':''):''}`}>{fmtARS(c.actual)}</strong></summary><div className="concept-months">{ml.map(m=><div key={m.key} className={m.key===actualKey?'current':''}><span>{m.label} {m.y}</span><strong className="money">{Object.hasOwn(c.vals,m.key)?fmtARS(c.vals[m.key]):'Sin registro'}</strong></div>)}</div><p className="small muted">Importes registrados por mes. Una ausencia de carga no confirma que hayas dejado de gastar.</p></details>)}</div>
    {!!conceptos.length&&!visibleConcepts.length&&<p className="quiet-state">No hay conceptos en este grupo.</p>}
    {!conceptos.length&&<div className="empty-state"><h3>Tu evolución empieza con el primer mes</h3><p>Los gastos que registres se van a comparar acá.</p></div>}
  </>;
}
