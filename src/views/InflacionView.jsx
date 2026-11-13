// =============================================================================
// src/views/InflacionView.jsx
// Pantalla "Tu inflación" dentro de Informes.
//
// Descripción:
//   Muestra cuánto cambiaron los gastos que se repiten entre el mes elegido y un
//   mes anterior (1, 3, 6 o 12 meses atrás), y el detalle gasto por gasto.
//   La persona puede sacar de la cuenta los gastos que cambian por consumo
//   (por ejemplo, la tarjeta) tocando "No contar".
//
// Fuentes: los gastos ya cargados en la app (data.gastos). El cálculo está en
//   src/utils/inflacion.js. Lo que se elige "no contar" se guarda en este
//   navegador (localStorage), por persona usuaria.
// =============================================================================

import { useMemo, useState } from 'react';
import UiIcon from '../components/UiIcon';
import { calcularInflacion, mesesBaseDisponibles } from '../utils/inflacion';
import { formatPercent } from '../utils/comparisons';
import { fmtARS, fmtPeriodo, plural } from '../utils/formatters';

const OPCIONES = [[1, '1 mes'], [3, '3 meses'], [6, '6 meses'], [12, '12 meses']];

const leerExcluidos = (clave) => {
  try { const v = JSON.parse(localStorage.getItem(clave) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export default function InflacionView({ gastosPorMes, refKey, usuarioId }) {
  const claveStorage = `mf_inflacion_no_contar_${usuarioId || 'anon'}`;
  const [excluidos, setExcluidos] = useState(() => leerExcluidos(claveStorage));
  const disponibles = useMemo(() => mesesBaseDisponibles(gastosPorMes, refKey), [gastosPorMes, refKey]);
  const [elegido, setElegido] = useState(3);
  // Si el plazo elegido no tiene datos, se usa el más cercano que sí tenga.
  const mesesAtras = disponibles.includes(elegido) ? elegido : (OPCIONES.map(([n]) => n).filter(n => disponibles.includes(n)).pop() ?? disponibles[disponibles.length - 1] ?? elegido);
  const r = useMemo(() => calcularInflacion({ gastosPorMes, refKey, mesesAtras, excluidos }), [gastosPorMes, refKey, mesesAtras, excluidos]);

  const alternar = (clave) => {
    const nuevo = excluidos.includes(clave) ? excluidos.filter(c => c !== clave) : [...excluidos, clave];
    setExcluidos(nuevo);
    try { localStorage.setItem(claveStorage, JSON.stringify(nuevo)); } catch { /* sin almacenamiento: vale solo para esta sesión */ }
  };

  if (!disponibles.length || !r.disponible) {
    return <div className="inflacion-view"><div className="empty-state"><UiIcon name="chart" size={30}/><h3>Todavía no hay con qué comparar</h3><p>Para calcular tu inflación hacen falta gastos cargados en {fmtPeriodo(refKey)} y en algún mes anterior.</p></div></div>;
  }

  const sube = r.porcentaje > 0.05, baja = r.porcentaje < -0.05;
  const frase = r.contados === 0 ? 'No hay gastos contados' : sube ? 'Tus gastos subieron' : baja ? 'Tus gastos bajaron' : 'Tus gastos no cambiaron';
  const numero = r.contados > 0 && (sube || baja) ? formatPercent(Math.abs(r.porcentaje)).replace('+', '') : '';
  const iguales = r.items.filter(i => i.contado && i.mesesIgual >= 3);

  return <div className="inflacion-view">
    <div className="filter-chips inflacion-plazo" aria-label="Comparar con">
      {OPCIONES.map(([n, texto]) => <button key={n} aria-pressed={mesesAtras === n} disabled={!disponibles.includes(n)} onClick={() => setElegido(n)}>Hace {texto}</button>)}
    </div>

    <section className={`surface inflacion-titular ${sube ? 'sube' : baja ? 'baja' : ''}`} aria-live="polite">
      <span className="eyebrow muted">Tu inflación · {fmtPeriodo(r.baseKey)} a {fmtPeriodo(r.refKey)}</span>
      <span className="inflacion-frase">{frase}</span>
      {numero && <strong className="inflacion-numero">{numero}</strong>}
      {r.contados > 0 && <p className="small muted">{plural(r.contados, 'gasto que se repite', 'gastos que se repiten')}: de <span className="money">{fmtARS(r.totalBase)}</span> a <span className="money">{fmtARS(r.totalActual)}</span></p>}
    </section>

    {iguales.length > 0 && <section className="surface inflacion-aviso">
      <strong><UiIcon name="edit" size={16}/>Mismo importe hace varios meses</strong>
      <p className="small muted">{iguales.map(i => `${i.nombre} (${i.mesesIgual} meses)`).join(' · ')}. Fijate si siguen iguales o falta actualizarlos.</p>
    </section>}

    <section className="surface inflacion-lista">
      <header className="section-line"><h2>Gasto por gasto</h2><span className="small muted">{fmtPeriodo(r.baseKey).split(' ')[0]} → {fmtPeriodo(r.refKey).split(' ')[0]}</span></header>
      {r.items.map(i => <article key={i.clave} className={`inflacion-fila ${i.contado ? '' : 'fuera'}`}>
        <div className="inflacion-fila-texto">
          <strong>{i.nombre}</strong>
          <small className="money">{fmtARS(i.base)} → {fmtARS(i.actual)}</small>
        </div>
        <span className={`inflacion-pct ${i.delta > 0 ? 'sube' : i.delta < 0 ? 'baja' : ''}`}>{i.delta === 0 ? 'Igual' : formatPercent(i.porcentaje)}</span>
        <button className="text-button inflacion-contar" aria-pressed={!i.contado} onClick={() => alternar(i.clave)} aria-label={`${i.contado ? 'No contar' : 'Volver a contar'}: ${i.nombre}`}>{i.contado ? 'No contar' : 'Contar'}</button>
      </article>)}
    </section>

    <p className="small muted inflacion-nota">
      Se comparan solo los gastos que tienen el mismo nombre en los dos meses. Sacá con “No contar” los que cambian por lo que consumís y no por el precio (tarjeta, supermercado).
      {r.sinConfirmar.length === 1 && ` No se incluye 1 gasto de ${fmtPeriodo(r.refKey)} que todavía está para revisar.`}
      {r.sinConfirmar.length > 1 && ` No se incluyen ${r.sinConfirmar.length} gastos de ${fmtPeriodo(r.refKey)} que todavía están para revisar.`}
      {r.enDolares.length > 0 && ` Tampoco ${plural(r.enDolares.length, 'gasto', 'gastos')} en dólares.`}
      {r.soloAhora + r.yaNoEstan === 1 && ' Queda afuera 1 gasto que está en un solo mes.'}
      {r.soloAhora + r.yaNoEstan > 1 && ` Quedan afuera ${r.soloAhora + r.yaNoEstan} gastos que están en un solo mes.`}
    </p>
  </div>;
}
