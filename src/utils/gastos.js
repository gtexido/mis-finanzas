// src/utils/gastos.js

/**
 * Indica si un gasto tiene subconceptos de detalle válidos.
 * @param {object} g - objeto gasto
 * @returns {boolean}
 */
export const gastoTieneDesglose = (g) =>
  !!g && Array.isArray(g.subconceptos) && g.subconceptos.length > 0;
