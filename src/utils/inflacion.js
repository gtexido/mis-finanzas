// =============================================================================
// src/utils/inflacion.js
// Inflación personal: cuánto cambió el importe de los mismos gastos entre dos meses.
//
// Descripción:
//   Toma los gastos de dos meses (uno de referencia y uno de base, N meses antes),
//   los agrupa por nombre y compara solo los que aparecen en los dos. El resultado
//   es la variación de esa "canasta" y el detalle gasto por gasto.
//
// Fuentes:
//   gastosPorMes: objeto { "2026-11": [gasto, ...], ... } ya cargado en la app
//   (los mismos datos que usan Movimientos e Informes). No consulta al servidor.
//
// Lógica:
//   - Dos gastos son "el mismo" si su nombre coincide sin mayúsculas ni acentos.
//   - Si un nombre aparece varias veces en un mes, se suma.
//   - Quedan fuera de la canasta, y se informan aparte:
//       * gastos en dólares o con desglose en dos monedas (su valor en pesos
//         depende de la cotización, no del precio);
//       * gastos del mes de referencia marcados "para revisar" (suelen traer el
//         importe del mes anterior todavía sin confirmar);
//       * gastos que la persona eligió no contar (por ejemplo, la tarjeta, que
//         cambia por consumo y no por precio).
//   - Variación de la canasta = (suma actual − suma base) / suma base, usando
//     solo los gastos contados.
//
// Uso:
//   calcularInflacion({ gastosPorMes, refKey: "2026-11", mesesAtras: 3, excluidos: ["tarjeta visa"] })
//
// Propósito:
//   Mostrar a la persona cuánto subieron sus propios gastos, no un promedio general.
// =============================================================================

import { normalizarTexto } from "./formatters";
import { montoReal, normalizarMoneda, obtenerDetalleMovimiento } from "./money";

/** Devuelve la clave del mes que está `n` meses antes de "AAAA-MM". */
export const mesAnterior = (key, n = 1) => {
  const [y, m] = String(key).split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Nombre normalizado que identifica a un gasto entre meses. */
export const claveGasto = (gasto) => normalizarTexto(gasto?.servicio || "");

const enDolares = (gasto) => {
  if (normalizarMoneda(gasto?.moneda) === "USD") return true;
  return obtenerDetalleMovimiento(gasto).some((item) => normalizarMoneda(item?.moneda || gasto?.moneda) === "USD");
};

/** Agrupa los gastos de un mes por nombre. Devuelve un Map clave -> resumen. */
export const agruparPorNombre = (gastos = []) => {
  const mapa = new Map();
  for (const g of gastos) {
    const clave = claveGasto(g);
    if (!clave) continue;
    const previo = mapa.get(clave) || { clave, nombre: String(g.servicio || "").trim(), total: 0, usd: false, revisar: false };
    previo.total += montoReal(g, 1);
    previo.usd = previo.usd || enDolares(g);
    previo.revisar = previo.revisar || !!g.requiereRevision;
    mapa.set(clave, previo);
  }
  return mapa;
};

/** Cuántos meses seguidos, hacia atrás desde `refKey`, el gasto mantiene el mismo importe (incluye el de referencia). */
export const mesesConMismoImporte = (gastosPorMes, refKey, clave, tope = 12) => {
  const actual = agruparPorNombre(gastosPorMes?.[refKey]).get(clave);
  if (!actual) return 0;
  let meses = 1;
  for (let i = 1; i < tope; i += 1) {
    const previo = agruparPorNombre(gastosPorMes?.[mesAnterior(refKey, i)]).get(clave);
    if (!previo || Math.round(previo.total) !== Math.round(actual.total)) break;
    meses += 1;
  }
  return meses;
};

/** Meses anteriores a `refKey` (hasta `tope`) que tienen gastos cargados. Devuelve cuántos meses atrás está cada uno. */
export const mesesBaseDisponibles = (gastosPorMes, refKey, tope = 12) => {
  const disponibles = [];
  for (let i = 1; i <= tope; i += 1) {
    if ((gastosPorMes?.[mesAnterior(refKey, i)] || []).length) disponibles.push(i);
  }
  return disponibles;
};

export function calcularInflacion({ gastosPorMes = {}, refKey, mesesAtras = 3, excluidos = [] } = {}) {
  const baseKey = mesAnterior(refKey, mesesAtras);
  const ref = agruparPorNombre(gastosPorMes[refKey]);
  const base = agruparPorNombre(gastosPorMes[baseKey]);
  const fuera = new Set(excluidos);

  const resultado = {
    refKey, baseKey, mesesAtras,
    disponible: ref.size > 0 && base.size > 0,
    items: [], porcentaje: null, totalBase: 0, totalActual: 0, contados: 0,
    sinConfirmar: [], enDolares: [], soloAhora: 0, yaNoEstan: 0,
  };
  if (!resultado.disponible) return resultado;

  for (const [clave, actual] of ref) {
    const antes = base.get(clave);
    if (!antes) { resultado.soloAhora += 1; continue; }
    if (actual.usd || antes.usd) { resultado.enDolares.push(actual.nombre); continue; }
    if (actual.revisar) { resultado.sinConfirmar.push(actual.nombre); continue; }
    if (!(antes.total > 0)) continue;
    const delta = Math.round(actual.total - antes.total);
    const contado = !fuera.has(clave);
    resultado.items.push({
      clave, nombre: actual.nombre, base: antes.total, actual: actual.total, delta,
      porcentaje: (delta / antes.total) * 100, contado,
      mesesIgual: delta === 0 ? mesesConMismoImporte(gastosPorMes, refKey, clave) : 0,
    });
    if (contado) {
      resultado.totalBase += antes.total;
      resultado.totalActual += actual.total;
      resultado.contados += 1;
    }
  }
  for (const clave of base.keys()) if (!ref.has(clave)) resultado.yaNoEstan += 1;

  resultado.items.sort((a, b) => b.delta - a.delta || a.nombre.localeCompare(b.nombre));
  if (resultado.totalBase > 0) {
    resultado.porcentaje = ((resultado.totalActual - resultado.totalBase) / resultado.totalBase) * 100;
  }
  return resultado;
}
