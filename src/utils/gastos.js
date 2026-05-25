import { medioPagoDesdeCategoriaLegacy } from './legacy';
import { slugKey } from './formatters';

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

/**
 * Busca y retorna el concepto de catálogo completo asociado a un gasto.
 * @param {object} gasto
 * @param {array} conceptos
 * @returns {object|null}
 */
export const conceptoDesdeGasto = (gasto = {}, conceptos = []) => {
  if (!gasto) return null;
  return (
    (conceptos || []).find((c) =>
      c.id === gasto.conceptoId ||
      c.id === gasto.concepto_id ||
      c.conceptoId === gasto.conceptoId ||
      c.conceptoId === gasto.concepto_id
    ) || null
  );
};

/**
 * Resuelve la categoría real de un gasto (nueva categorización o fallback legacy).
 * @param {object} g
 * @param {array} conceptos
 * @param {array} categoriasGasto
 * @param {array} categoriasLegacy
 * @returns {object}
 */
export const categoriaRealDesdeGasto = (g = {}, conceptos = [], categoriasGasto = [], categoriasLegacy = []) => {
  const concepto = conceptoDesdeGasto(g, conceptos);
  const categoriaId = concepto?.categoriaGastoId || g.categoriaGastoId || "";
  const categoriaCfg = (categoriasGasto || []).find((c) => c.id === categoriaId);
  const nombreReal =
    categoriaCfg?.nombre ||
    categoriaCfg?.label ||
    concepto?.categoriaGastoNombre ||
    concepto?.categoriaGasto ||
    g.categoriaGastoNombre ||
    g.categoriaGasto ||
    "";

  if (categoriaId || nombreReal) {
    return {
      id: categoriaId || `cat_real_${slugKey(nombreReal) || "sin_categoria"}`,
      label: nombreReal || "Sin categoría",
      color: g.categoriaGastoColor || categoriaCfg?.color || "#64748b",
      origen: "real",
    };
  }

  const legacyCat = (categoriasLegacy || []).find((cat) => cat.id === g.categoria);
  return {
    id: g.categoria || g.categoriaId || "sin_categoria",
    label: legacyCat?.label || g.categoriaNombre || "Sin categoría",
    color: legacyCat?.color || "#64748b",
    origen: "legacy",
  };
};



