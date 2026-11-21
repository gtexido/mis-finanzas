import { fmtARS, plural } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { compareAmounts, formatPercent } from '../utils/comparisons';
import { resumenPorGrupo, mesNormal } from '../utils/grupos';
import UiIcon from '../components/UiIcon';

// Informes · "Ajustar": los gastos del mes en tres grupos automáticos (Fijos,
// Servicios, Variables), cada concepto con su variación contra el mes anterior.
// Variables viene abierto: es donde se ve en qué se puede ajustar.

function Variacion({ actual, anterior, hayAnterior }) {
  if (!hayAnterior) return null;
  const { delta, percent } = compareAmounts(actual, anterior);
  if (Math.round(delta) === 0) return <small className="aj-var igual">Igual que el mes anterior</small>;
  const sube = delta > 0;
  return <small className={`aj-var ${sube ? 'sube' : 'baja'}`}>{sube ? '▲' : '▼'} {fmtARS(Math.abs(delta))}{percent !== null ? ` (${formatPercent(percent)})` : ''}</small>;
}

// Tu mes normal en Variables: cuánto llevás, cuánto te queda y, en un mes cerrado, la diferencia para ahorrar.
function MesNormal({ datos, esMesActual, onAhorrar }) {
  if (!datos) return null;
  const { normal, actual, diferencia, meses } = datos;
  const ancho = normal > 0 ? `${Math.min(100, Math.round(actual / normal * 100))}%` : '0%';
  const pasado = diferencia < 0;
  let texto;
  if (esMesActual) texto = pasado ? <>Te pasaste <strong className="money">{fmtARS(-diferencia)}</strong> de tu mes normal.</> : <>Te quedan <strong className="money">{fmtARS(diferencia)}</strong> para no pasarte.</>;
  else texto = pasado ? <><strong className="money">{fmtARS(-diferencia)}</strong> más que en un mes normal.</> : <><strong className="money">{fmtARS(diferencia)}</strong> menos que en un mes normal.</>;
  return <section className={`aj-normal surface${pasado ? ' pasado' : ''}`}>
    <div className="section-line"><strong>Variables: tu mes normal</strong><span className="money">{fmtARS(normal)}</span></div>
    <div className="aj-normal-barra" role="img" aria-label={`Llevás ${fmtARS(actual)} de ${fmtARS(normal)}`}><span style={{ width: ancho }}/></div>
    <p className="aj-normal-texto">{esMesActual ? 'Llevás ' : 'Gastaste '}<span className="money">{fmtARS(actual)}</span>{esMesActual ? '. ' : ', '}{texto}</p>
    {!esMesActual && !pasado && diferencia > 0 && onAhorrar && <button className="secondary aj-ahorrar" onClick={() => onAhorrar(diferencia)}>Pasar {fmtARS(diferencia)} a Ahorros</button>}
    <small className="muted">Sale del mes del medio de tus últimos {meses} meses. Se actualiza solo.</small>
  </section>;
}

export default function AjustarView({ gastosDelMes, previousGastos = [], hasPrevious, previousLabel, tc, gruposManual = {}, gastosPorMes, mesKey, esMesActual, onAhorrar }) {
  const r = resumenPorGrupo({ gastos: gastosDelMes, previos: previousGastos, manual: gruposManual, importe: g => montoReal(g, tc) });
  const normal = gastosPorMes && mesKey ? mesNormal({ gastosPorMes, mesKey, manual: gruposManual, importe: g => montoReal(g, tc) }) : null;
  const pct = v => r.total > 0 ? `${Math.round(v / r.total * 100)}%` : '0%';
  if (!gastosDelMes.length) return <div className="empty-state surface"><UiIcon name="chart" size={28}/><strong>Sin gastos en este mes</strong><p className="muted">Cuando cargues gastos los vas a ver separados en fijos, servicios y variables.</p></div>;
  return <div className="ajustar-view">
    <section className="aj-resumen surface">
      <div className="aj-barra" aria-hidden="true">{r.grupos.map(g => <span key={g.id} className={g.id} style={{ width: pct(g.total) }}/>)}</div>
      <div className="aj-totales">{r.grupos.map(g => <span key={g.id} className={g.id}><small>{g.nombre}</small><strong className="money">{fmtARS(g.total)}</strong><small>{pct(g.total)} del mes</small></span>)}</div>
      {hasPrevious && <p className="small muted aj-nota">Las flechas comparan con {previousLabel.toLowerCase()}.</p>}
    </section>
    <MesNormal datos={normal} esMesActual={esMesActual} onAhorrar={onAhorrar}/>
    {r.grupos.filter(g => g.total > 0 || g.anterior > 0).map(gr => <details className={`aj-grupo surface ${gr.id}`} key={gr.id} open={gr.id === 'variables'}>
      <summary>
        <span className="aj-nombre"><strong>{gr.nombre}</strong><small>{gr.ayuda}</small></span>
        <span className="aj-monto"><strong className="money">{fmtARS(gr.total)}</strong><Variacion actual={gr.total} anterior={gr.anterior} hayAnterior={hasPrevious}/></span>
        <UiIcon name="chevron" size={16}/>
      </summary>
      <div className="aj-detalle">
        {gr.conceptos.map(c => <div className="aj-cat" key={c.clave}>
          <div className="section-line"><span>{c.nombre}{c.cantidad > 1 ? <small className="muted"> · {c.cantidad} veces</small> : null}</span><span className="money">{fmtARS(c.total)}</span></div>
          {c.tarjeta && <small className="muted">Resumen de tarjeta: sin detalle de qué se compró</small>}
          <Variacion actual={c.total} anterior={c.anterior} hayAnterior={hasPrevious}/>
        </div>)}
        <small className="muted">{plural(gr.cantidad, 'gasto')} en el mes · Si alguno no va acá, cambialo desde los tres puntitos en Movimientos.</small>
      </div>
    </details>)}
  </div>;
}
