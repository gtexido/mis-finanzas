import { fmtARS, fmtUSD, normalizarEtiquetaVisual, normalizarTexto } from '../utils/formatters';
import { montoReal, montoUSDReal } from '../utils/money';
import UiIcon from '../components/UiIcon';
export default function AnalisisView({gastosDelMes,totalGastos,tc,analisisTab,setAnalisisTab}) {
  const options=[["concepto","Conceptos"],["medio","Medios de pago"],["instrumento","Cómo pagás"]];
  const selected=options.some(([id])=>id===analisisTab)?analisisTab:"concepto";
  const grouped=new Map();
  gastosDelMes.forEach(g=>{
    const nombre=selected==="concepto"?(g.servicio||g.conceptoManual||"Sin concepto"):selected==="medio"?normalizarEtiquetaVisual(g.medioPagoNombre||g.medioPago,"Medio no definido"):normalizarEtiquetaVisual(g.instrumentoNombre||g.instrumento||g.formaPago,"Manual");
    const key=selected==="concepto"?(g.conceptoId||g.concepto_id||normalizarTexto(nombre)):normalizarTexto(nombre);
    const row=grouped.get(key)||{key,nombre,total:0,usd:0,count:0};
    row.total+=montoReal(g,tc);row.usd+=montoUSDReal(g);row.count++;grouped.set(key,row);
  });
  const rows=[...grouped.values()].sort((a,b)=>b.total-a.total);
  return <>
    <section className="report-total"><span className="eyebrow muted">Gastos registrados</span><div className="money">{fmtARS(totalGastos)}</div><p className="muted">{gastosDelMes.length} movimientos en el mes · Total en pesos</p></section>
    <div className="filter-chips" aria-label="Agrupar gastos">{options.map(([id,label])=><button key={id} aria-pressed={selected===id} onClick={()=>setAnalisisTab(id)}>{label}</button>)}</div>
    {rows.length>0?<div className="surface" style={{padding:"0 18px"}}>{rows.map(row=>{const pct=totalGastos>0?row.total/totalGastos*100:0;return <div className="ranking-row" key={row.key}><div className="section-line"><strong style={{fontWeight:550}}>{row.nombre}</strong><strong className="money" style={{fontWeight:550,whiteSpace:"nowrap"}}>{fmtARS(row.total)}</strong></div><div className="section-line" style={{marginTop:6}}><small>{row.count} movimiento{row.count===1?"":"s"}{row.usd>0?` · ${fmtUSD(row.usd)} USD`:""}</small><small>{pct.toLocaleString("es-AR",{maximumFractionDigits:1})}%</small></div><div className="ranking-bar" role="img" aria-label={`${pct.toFixed(1)}% del gasto`}><span style={{width:`${Math.min(pct,100)}%`}}/></div></div>;})}</div>:<div className="empty-state"><UiIcon name="chart" size={30}/><h3>Un poco de información, mucha claridad</h3><p>Cargá tu primer gasto para ver cómo se distribuye tu mes.</p></div>}
    {rows.length>0&&<p className="report-caption">Incluye gastos pagados y pendientes. Los importes en dólares se muestran convertidos a pesos con la cotización aplicable a cada movimiento.</p>}
  </>;
}
