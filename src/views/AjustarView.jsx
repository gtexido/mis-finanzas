import { fmtARS, plural } from '../utils/formatters';
import { montoReal } from '../utils/money';
import { compareAmounts, formatPercent } from '../utils/comparisons';
import { resumenPorGrupo } from '../utils/grupos';
import UiIcon from '../components/UiIcon';

// Informes · "Dónde ajustar": los gastos del mes por grupo, separando lo que se
// puede recortar de lo que es difícil de mover, con la variación contra el mes anterior.
const SECCIONES = [
  { tipo: 'ajustable', titulo: 'Donde podés ajustar', texto: 'Gastos que dependen de decisiones del mes.' },
  { tipo: 'fijo', titulo: 'Difícil de mover', texto: 'Compromisos que se pagan igual todos los meses.' },
  { tipo: 'aparte', titulo: 'Aparte', texto: '' },
];

function Variacion({ actual, anterior, hayAnterior }) {
  if (!hayAnterior) return null;
  const { delta, percent } = compareAmounts(actual, anterior);
  if (Math.round(delta) === 0) return <small className="aj-var igual">Igual que el mes anterior</small>;
  const sube = delta > 0;
  return <small className={`aj-var ${sube ? 'sube' : 'baja'}`}>{sube ? '▲' : '▼'} {fmtARS(Math.abs(delta))}{percent !== null ? ` (${formatPercent(percent)})` : ''}</small>;
}

export default function AjustarView({ gastosDelMes, previousGastos = [], hasPrevious, previousLabel, tc }) {
  const r = resumenPorGrupo({ gastos: gastosDelMes, previos: previousGastos, importe: g => montoReal(g, tc) });
  const pct = v => r.total > 0 ? `${Math.round(v / r.total * 100)}%` : '';
  if (!r.grupos.length) return <div className="empty-state surface"><UiIcon name="chart" size={28}/><strong>Sin gastos en este mes</strong><p className="muted">Cuando cargues gastos vas a ver dónde podés ajustar.</p></div>;
  return <div className="ajustar-view">
    <section className="aj-resumen surface">
      <div className="aj-barra" aria-hidden="true">
        <span className="ajustable" style={{ width: pct(r.totalAjustable) }}/>
        <span className="fijo" style={{ width: pct(r.totalFijo) }}/>
      </div>
      <div className="aj-totales">
        <span><small>Podés ajustar</small><strong className="money">{fmtARS(r.totalAjustable)}</strong><small>{pct(r.totalAjustable)} del mes</small></span>
        <span><small>Difícil de mover</small><strong className="money">{fmtARS(r.totalFijo)}</strong><small>{pct(r.totalFijo)} del mes</small></span>
      </div>
      {hasPrevious && <p className="small muted aj-nota">Las flechas comparan con {previousLabel.toLowerCase()}.</p>}
    </section>
    {SECCIONES.map(sec => {
      const grupos = r.grupos.filter(g => g.tipo === sec.tipo);
      if (!grupos.length) return null;
      return <section className="aj-seccion" key={sec.tipo}>
        <div className="aj-cabecera"><h2>{sec.titulo}</h2>{sec.texto && <small className="muted">{sec.texto}</small>}</div>
        {grupos.map(gr => <details className={`aj-grupo surface ${gr.tipo}`} key={gr.id}>
          <summary>
            <span className="aj-nombre"><strong>{gr.nombre}</strong><small>{gr.ayuda}</small></span>
            <span className="aj-monto"><strong className="money">{fmtARS(gr.total)}</strong><Variacion actual={gr.total} anterior={gr.anterior} hayAnterior={hasPrevious}/></span>
            <UiIcon name="chevron" size={16}/>
          </summary>
          <div className="aj-detalle">
            {gr.categorias.map(cat => <div className="aj-cat" key={cat.nombre}>
              <div className="section-line"><span>{cat.nombre}</span><span className="money">{fmtARS(cat.total)}</span></div>
              {cat.conceptos.length > 0 && <small className="muted">{cat.conceptos.map(c => c.nombre).join(' · ')}</small>}
              <Variacion actual={cat.total} anterior={cat.anterior} hayAnterior={hasPrevious}/>
            </div>)}
            <small className="muted">{plural(gr.cantidad, 'gasto')} en el mes</small>
          </div>
        </details>)}
      </section>;
    })}
  </div>;
}
