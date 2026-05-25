import { medioPagoDesdeCategoriaLegacy } from './legacy';

/**
 * Indica si un gasto tiene subconceptos de detalle válidos.
 * @param {object} g - objeto gasto
 * @returns {boolean}
 */
export const gastoTieneDesglose = (g) =>
  !!g && Array.isArray(g.subconceptos) && g.subconceptos.length > 0;

/**
 * Indica si un array de subconceptos/items es válido y no está vacío.
 * @param {any} items
 * @returns {boolean}
 */
export const tieneSubconceptosValidos = (items = []) =>
  Array.isArray(items) && items.length > 0;

/**
 * Obtiene el medio de pago del gasto de forma compatible e integrada.
 * @param {object} gasto
 * @returns {string}
 */
export const obtenerMedioPagoComparable = (gasto = {}) =>
  gasto.medioPagoId ||
  gasto.medio_pago_id ||
  gasto.medioPago ||
  medioPagoDesdeCategoriaLegacy(gasto.categoria || "");

