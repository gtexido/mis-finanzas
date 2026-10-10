import { fmtARS, fmtUSD, normalizarEtiquetaVisual, normalizarTexto } from '../utils/formatters';
import { montoReal, montoUSDReal } from '../utils/money';
import { compareAmounts, formatPercent } from '../utils/comparisons';
import MonthComparison from '../components/MonthComparison';
import UiIcon from '../components/UiIcon';

export default function AnalisisView({gastosDelMes,previousGastos=[],hasPrevious,hasCurrent,previousLabel,totalGastos,tc,analisisTab,setAnalisisTab,mes}) {
  const options=[["concepto","Conceptos"],["medio","Medios de pago"],["instrumento","Cómo pagás"]];
  const selected=options.some(([id])=>id===analisisTab)?analisisTab:"concepto";
  const grouped=new Map();
  const add=(g,previous=false)=>{
    const nombre=selected==="concepto"?(g.servicio||g.conceptoManual||"Sin concepto"):selected==="medio"?normalizarEtiquetaVisual(g.medioPagoNombre||g.medioPago,"Medio no definido"):normalizarEtiquetaVisual(g.instrumentoNombre||g.instrumento||g.formaPago,"Manual");
    const key=selected==="concepto"?(g.conceptoId||g.concepto_id||normalizarTexto(nombre)):normalizarTexto(nombre);
    const row=grouped.get(key)||{key,nombre,total:0,previous:0,usd:0,count:0};
    if(previous)row.previous+=montoReal(g,tc);
    else{row.total+=montoReal(g,tc);row.usd+=montoUSDReal(g);row.count++;}
    grouped.set(key,row);
  };
  gastosDelMes.forEach(g=>add(g));previousGastos.forEach(g=>add(g,true));
  const rows=[...grouped.values()].sort((a,b)=>b.total-a.total || b.previous-a.previous);
  const now=new Date(),partial=mes.y===now.getFullYear()&&mes.m===now.getMonth();
  return <>
    <section className="report-total"><span className="eyebrow muted">Gastos registrados</span><div className="money">{fmtARS(totalGastos)}</div><p className="muted">{gastosDelMes.length} movimientos en el mes · Total en pesos</p></section>
    <MonthComparison current={totalGastos} previous={previousGastos.reduce((sum,g)=>sum+montoReal(g,tc),0)} hasPrevious={hasPrevious} hasCurrent={hasCurrent} previousLabel={previousLabel} partial={partial}/>
    <div className="filter-chips" aria-label="Agrupar gastos">{options.map(([id,label])=><button key={id} aria-pressed={selected===id} onClick={()=>setAnalisisTab(id)}>{label}</button>)}</div>
    {rows.length>0?<div className="surface report-ranking">{rows.map(row=>{
      const pct=totalGastos>0?row.total/totalGastos*100:0,{delta,percent}=compareAmounts(row.total,row.previous);
      return <div className="ranking-row" key={row.key}>
        <div className="section-line"><strong>{row.nombre}</strong><strong className="money">{fmtARS(row.total)}</strong></div>
        <div className="section-line ranking-meta"><small>{row.count} movimiento{row.count===1?"":"s"}{row.usd>0?` · ${fmtUSD(row.usd)} USD`:""}</small><small>{pct.toLocaleString("es-AR",{maximumFractionDigits:1})}% del mes</small></div>
        <div className="ranking-bar" role="img" aria-label={`${pct.toFixed(1)}% del gasto`}><span style={{width:`${Math.min(pct,100)}%`}}/></div>
        {hasPrevious&&hasCurrent&&<div className="concept-change"><small>Anterior: {fmtARS(row.previous)}</small><span className={delta>0?'increase':delta<0?'decrease':''}>{delta===0?'Sin cambios':`${delta>0?'+':'−'}${fmtARS(Math.abs(delta))}`}<small>{row.previous===0?'Sin base para %':formatPercent(percent)}</small></span></div>}
      </div>;
    })}</div>:<div className="empty-state"><UiIcon name="chart" size={30}/><h3>Tu mes, con más perspectiva</h3><p>Cargá tu primer gasto para ver cómo se distribuye.</p></div>}
    {!!rows.length&&<p className="report-caption">Incluye pagados y pendientes. Las diferencias reflejan los registros cargados, no necesariamente un aumento de precios. Los dólares se convierten con la cotización aplicable a cada movimiento.</p>}
  </>;
}
