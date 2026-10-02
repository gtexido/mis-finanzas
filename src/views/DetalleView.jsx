import UiIcon from '../components/UiIcon';
export default function DetalleView({filtroEstado,setFiltroEstado,filtroCatInicio,setFiltroCatInicio,busqueda,setBusqueda,cantidadDetalleFiltrada,totalDetalleFiltrado,hayFiltroActivo,sinRegistros,fmtARS,children}) {
  const clear=()=>{setFiltroCatInicio(null);setFiltroEstado("todos");setBusqueda("");};
  return <>
    <div className="detail-total"><div className="section-line"><span>{hayFiltroActivo?"Total del filtro":"Gastos del mes"}</span>{hayFiltroActivo&&<button className="text-button" onClick={clear}>Limpiar filtros</button>}</div><div className="money">{fmtARS(totalDetalleFiltrado)}</div><span className="muted small">{cantidadDetalleFiltrada} movimiento{cantidadDetalleFiltrada===1?"":"s"}</span></div>
    <div className="search-field"><UiIcon name="search" size={19}/><input className="inf" aria-label="Buscar movimientos" placeholder="Buscar un concepto" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></div>
    <div className="filter-chips" aria-label="Estado de los movimientos">{[["todos","Todos"],["pagado","Pagados"],["pendiente","Pendientes"],["revisar","Revisar"]].map(([id,label])=><button key={id} aria-pressed={filtroEstado===id} onClick={()=>setFiltroEstado(id)}>{label}</button>)}</div>
    {filtroCatInicio&&<button className="text-button" onClick={()=>setFiltroCatInicio(null)}>Ver todos los medios</button>}
    {children}
    {sinRegistros&&<div className="empty-state"><UiIcon name="search" size={30}/><h3>No hay movimientos para mostrar</h3><p>{hayFiltroActivo?"Probá con otro concepto o limpiá los filtros.":"Los gastos que cargues este mes van a aparecer acá."}</p>{hayFiltroActivo&&<button className="text-button" onClick={clear}>Limpiar filtros</button>}</div>}
  </>;
}
