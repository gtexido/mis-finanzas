// =============================================================================
// src/utils/cargaRapida.js
// Cálculos de la pantalla Cargar nueva (atajos, comparación y fechas rápidas).
//
// Fuentes:
//   - Nombre (servicio) escrito en los gastos ya cargados. No depende de que
//     existan conceptos en la configuración.
//   - Gastos ya cargados del mes seleccionado y del mes anterior.
//
// Lógica:
//   - atajosPorNombre: agrupa los gastos por nombre escrito, los ordena por usos
//     (más usados primero) y trae el último importe, cuenta y forma de pago.
//   - resumenDelMes: total, pagado y pendiente del mes para mostrar en Cargar.
//   - atajosDeConceptos (ya no se usa en pantalla): ordena los conceptos por cantidad de usos en los meses
//     indicados (más usados primero) y trae el importe del último uso.
//   - comparacionConMesAnterior: suma lo pagado el mes anterior por el mismo
//     concepto y lo compara con el importe que se está cargando.
//   - vencimientosRapidos / diasRapidos: fechas de un toque (fin de mes, +7 días,
//     día 10, hoy, ayer) sin usar el calendario.
//
// Uso:
//   import { atajosDeConceptos } from "../utils/cargaRapida";
//
// Propósito:
//   Que la lógica de la pantalla nueva se pueda probar sola, sin abrir la app.
//   No usa estado de React ni llamadas al servidor.
// =============================================================================

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const normalizarBasico = (t) => String(t || "").trim().toLowerCase();
const montoBasico = (g) => Number(g?.monto || 0);

const mismoConcepto = (gasto, concepto, normalizar) => {
  if (concepto.id && gasto.conceptoId && gasto.conceptoId === concepto.id) return true;
  return !!normalizar(gasto.servicio) && normalizar(gasto.servicio) === normalizar(concepto.nombre);
};

export const atajosDeConceptos = (
  conceptos = [],
  gastosPorMes = {},
  meses = [],
  { limite = 6, montoDe = montoBasico, normalizar = normalizarBasico } = {}
) => {
  const resultado = (conceptos || []).map((concepto, orden) => {
    let usos = 0;
    let ultimo = null;
    meses.forEach((mesKey) => {
      const delMes = [...(gastosPorMes[mesKey] || [])].sort((a, b) => Number(b.dia || 0) - Number(a.dia || 0));
      delMes.forEach((gasto) => {
        if (!mismoConcepto(gasto, concepto, normalizar)) return;
        usos += 1;
        if (!ultimo) ultimo = { monto: montoDe(gasto), moneda: gasto.moneda || "ARS", periodo: mesKey, dia: gasto.dia };
      });
    });
    return { concepto, usos, ultimo, orden };
  });

  const posicion = (item) => (item.ultimo ? meses.indexOf(item.ultimo.periodo) : meses.length);
  return resultado
    .sort((a, b) =>
      b.usos - a.usos ||
      posicion(a) - posicion(b) ||
      String(a.concepto.nombre || "").localeCompare(String(b.concepto.nombre || ""), "es") ||
      a.orden - b.orden
    )
    .slice(0, limite);
};

export const atajosPorNombre = (
  gastosPorMes = {},
  meses = [],
  { limite = 6, montoDe = montoBasico, normalizar = normalizarBasico } = {}
) => {
  const grupos = new Map();
  meses.forEach((mesKey, posMes) => {
    const delMes = [...(gastosPorMes[mesKey] || [])].sort((a, b) => Number(b.dia || 0) - Number(a.dia || 0));
    delMes.forEach((gasto) => {
      const clave = normalizar(gasto.servicio);
      if (!clave) return;
      let grupo = grupos.get(clave);
      if (!grupo) {
        grupo = { nombre: String(gasto.servicio).trim(), usos: 0, ultimo: null, posMes, orden: grupos.size };
        grupos.set(clave, grupo);
      }
      grupo.usos += 1;
      if (!grupo.ultimo) {
        grupo.ultimo = {
          monto: montoDe(gasto), moneda: gasto.moneda || "ARS", periodo: mesKey, dia: gasto.dia,
          medioPagoId: gasto.medioPagoId || "", instrumentoId: gasto.instrumentoId || "",
          categoriaGastoId: gasto.categoriaGastoId || "", conceptoId: gasto.conceptoId || "",
        };
        grupo.posMes = posMes;
      }
    });
  });
  return [...grupos.values()]
    .sort((a, b) =>
      b.usos - a.usos ||
      a.posMes - b.posMes ||
      a.nombre.localeCompare(b.nombre, "es") ||
      a.orden - b.orden
    )
    .slice(0, limite);
};

export const resumenDelMes = (gastos = [], { montoDe = montoBasico } = {}) => {
  let total = 0;
  let pagado = 0;
  let pendiente = 0;
  (gastos || []).forEach((g) => {
    const monto = montoDe(g);
    if (!Number.isFinite(monto)) return;
    total += monto;
    if (g.estado === "pendiente") pendiente += monto;
    else pagado += monto;
  });
  return { total, pagado, pendiente, cantidad: (gastos || []).length };
};

export const comparacionConMesAnterior = (
  { conceptoId = "", servicio = "" } = {},
  gastosMesAnterior = [],
  montoActual = 0,
  { montoDe = montoBasico, normalizar = normalizarBasico } = {}
) => {
  const coincidentes = (gastosMesAnterior || []).filter((g) =>
    (conceptoId && g.conceptoId === conceptoId) ||
    (!!normalizar(servicio) && normalizar(g.servicio) === normalizar(servicio))
  );
  if (!coincidentes.length) return null;

  const anterior = coincidentes.reduce((acc, g) => acc + montoDe(g), 0);
  const actual = Number(montoActual || 0);
  if (!(actual > 0)) return { anterior, porcentaje: null, estado: "sin_importe" };
  if (!(anterior > 0)) return { anterior, porcentaje: null, estado: "sin_base" };

  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  const estado = porcentaje === 0 ? "igual" : porcentaje > 0 ? "sube" : "baja";
  return { anterior, porcentaje, estado };
};

const aISO = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const detalleFecha = (fecha) => `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;

export const vencimientosRapidos = (hoy = new Date()) => {
  const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const en7 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7);
  const dia10 = hoy.getDate() < 10
    ? new Date(hoy.getFullYear(), hoy.getMonth(), 10)
    : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 10);
  return [
    { id: "fin_mes", label: "Fin de mes", fecha: aISO(finDeMes), detalle: detalleFecha(finDeMes) },
    { id: "en_7_dias", label: "En 7 días", fecha: aISO(en7), detalle: detalleFecha(en7) },
    { id: "dia_10", label: "Día 10", fecha: aISO(dia10), detalle: detalleFecha(dia10) },
  ];
};

export const diasRapidos = (hoy = new Date(), mesSeleccionado = {}) => {
  const esMesActual = mesSeleccionado.y === hoy.getFullYear() && mesSeleccionado.m === hoy.getMonth();
  if (!esMesActual) return [];
  const lista = [{ id: "hoy", label: "Hoy", dia: String(hoy.getDate()), detalle: detalleFecha(hoy) }];
  if (hoy.getDate() > 1) {
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    lista.push({ id: "ayer", label: "Ayer", dia: String(ayer.getDate()), detalle: detalleFecha(ayer) });
  }
  return lista;
};
