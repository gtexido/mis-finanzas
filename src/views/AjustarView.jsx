import { fmtARS, plural } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { compareAmounts, formatPercent } from '../utils/comparisons';
import { resumenPorGrupo } from '../utils/grupos';
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

export default function AjustarView({ gastosDelMes, previousGastos = [], hasPrevious, previousLabel, tc, gruposManual = {} }) {
  const r = resumenPorGrupo({ gastos: gastosDelMes, previos: previousGastos, manual: gruposManual, importe: g => montoReal(g, tc) });
  const pct = v => r.total > 0 ? `${Math.round(v / r.total * 100)}%` : '0%';
  if (!gastosDelMes.length) return <div className="empty-state surface"><UiIcon name="chart" size={28}/><strong>Sin gastos en este mes</strong><p className="muted">Cuando cargues gastos los vas a ver separados en fijos, servicios y variables.</p></div>;
  return <div className="ajustar-view">
    <section className="aj-resumen surface">
      <div className="aj-barra" aria-hidden="true">{r.grupos.map(g => <span key={g.id} className={g.id} style={{ width: pct(g.total) }}/>)}</div>
      <div className="aj-totales">{r.grupos.map(g => <span key={g.id} className={g.id}><small>{g.nombre}</small><strong className="money">{fmtARS(g.total)}</strong><small>{pct(g.total)} del mes</small></span>)}</div>
      {hasPrevious && <p className="small muted aj-nota">Las flechas comparan con {previousLabel.toLowerCase()}.</p>}
    </section>
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
