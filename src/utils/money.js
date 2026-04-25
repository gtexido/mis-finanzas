// src/utils/money.js

/**
 * Normaliza valores numéricos que pueden venir como:
 * - number
 * - string
 * - null
 * - undefined
 */
export const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Normaliza la moneda para evitar errores por null, undefined o minúsculas.
 */
export const normalizarMoneda = (moneda) => {
  return String(moneda || "ARS").trim().toUpperCase();
};

/**
 * Devuelve el monto original de un ítem de detalle.
 * Mantiene compatibilidad con estructuras viejas que usaban montoUSD.
 */
export const montoItem = (item) => {
  return toNumber(item?.monto ?? item?.montoUSD ?? 0);
};

/**
 * Devuelve los ítems de detalle de un movimiento.
 * Hoy en frontend se usan como "subconceptos", aunque en Neon viven como detalle_movimiento.
 */
export const obtenerDetalleMovimiento = (movimiento) => {
  if (!movimiento) return [];

  if (Array.isArray(movimiento.subconceptos)) {
    return movimiento.subconceptos;
  }

  if (Array.isArray(movimiento.detalle)) {
    return movimiento.detalle;
  }

  if (Array.isArray(movimiento.detalles)) {
    return movimiento.detalles;
  }

  return [];
};

/**
 * Obtiene el tipo de cambio aplicable.
 *
 * Prioridad:
 * 1. tipoCambio del ítem
 * 2. tipo_cambio del ítem
 * 3. tipoCambio del movimiento
 * 4. tipo_cambio del movimiento
 * 5. tipo de cambio global recibido por parámetro
 */
export const obtenerTipoCambio = (item = {}, movimiento = {}, tcGlobal = 1) => {
  return toNumber(
    item?.tipoCambio ??
      item?.tipo_cambio ??
      movimiento?.tipoCambio ??
      movimiento?.tipo_cambio ??
      tcGlobal,
    1
  );
};

/**
 * Calcula el monto ARS de un ítem.
 *
 * Si Neon ya trae monto_ars_calculado o montoARSCalculado, se respeta.
 * Si no viene calculado:
 * - ARS queda igual.
 * - USD se convierte usando tipo de cambio.
 */
export const montoARSItem = (item, movimiento = {}, tcGlobal = 1) => {
  const moneda = normalizarMoneda(item?.moneda ?? movimiento?.moneda);
  const monto = montoItem(item);

  const montoARSGuardado = item?.montoARSCalculado ?? item?.monto_ars_calculado;

  if (montoARSGuardado !== null && montoARSGuardado !== undefined && montoARSGuardado !== "") {
    return toNumber(montoARSGuardado);
  }

  if (moneda === "USD") {
    const tc = obtenerTipoCambio(item, movimiento, tcGlobal);
    return monto * tc;
  }

  return monto;
};

/**
 * Calcula el monto USD de un ítem.
 *
 * Solo suma ítems cuya moneda sea USD.
 */
export const montoUSDItem = (item, movimiento = {}) => {
  const moneda = normalizarMoneda(item?.moneda ?? movimiento?.moneda);
  return moneda === "USD" ? montoItem(item) : 0;
};

/**
 * Calcula un resumen monetario completo del movimiento.
 *
 * Regla principal:
 * - Si tiene detalle/subconceptos, manda el detalle.
 * - Si no tiene detalle, se calcula desde el movimiento principal.
 */
export const resumenMovimiento = (movimiento, tcGlobal = 1) => {
  if (!movimiento) {
    return {
      totalARS: 0,
      totalUSD: 0,
      totalARSDirecto: 0,
      totalUSDConvertidoARS: 0,
      tieneDetalle: false,
      cantidadItems: 0,
    };
  }

  const detalle = obtenerDetalleMovimiento(movimiento);
  const tieneDetalle = detalle.length > 0;

  if (tieneDetalle) {
    const totalARS = detalle.reduce((acc, item) => {
      return acc + montoARSItem(item, movimiento, tcGlobal);
    }, 0);

    const totalUSD = detalle.reduce((acc, item) => {
      return acc + montoUSDItem(item, movimiento);
    }, 0);

    const totalARSDirecto = detalle.reduce((acc, item) => {
      const moneda = normalizarMoneda(item?.moneda ?? movimiento?.moneda);
      return moneda === "ARS" ? acc + montoItem(item) : acc;
    }, 0);

    const totalUSDConvertidoARS = detalle.reduce((acc, item) => {
      const moneda = normalizarMoneda(item?.moneda ?? movimiento?.moneda);
      return moneda === "USD" ? acc + montoARSItem(item, movimiento, tcGlobal) : acc;
    }, 0);

    return {
      totalARS,
      totalUSD,
      totalARSDirecto,
      totalUSDConvertidoARS,
      tieneDetalle: true,
      cantidadItems: detalle.length,
    };
  }

  const moneda = normalizarMoneda(movimiento.moneda);
  const monto = toNumber(movimiento.monto);

  const itemVirtual = {
    monto,
    moneda,
    tipoCambio: movimiento.tipoCambio,
    tipo_cambio: movimiento.tipo_cambio,
    montoARSCalculado: movimiento.montoARSCalculado,
    monto_ars_calculado: movimiento.monto_ars_calculado,
  };

  const totalARS = montoARSItem(itemVirtual, movimiento, tcGlobal);
  const totalUSD = moneda === "USD" ? monto : 0;

  return {
    totalARS,
    totalUSD,
    totalARSDirecto: moneda === "ARS" ? monto : 0,
    totalUSDConvertidoARS: moneda === "USD" ? totalARS : 0,
    tieneDetalle: false,
    cantidadItems: 0,
  };
};

/**
 * Función histórica usada por la app.
 *
 * IMPORTANTE:
 * La mantenemos para no romper App.jsx, DetalleView.jsx y otros componentes.
 *
 * Devuelve siempre el total expresado en ARS.
 */
export const montoReal = (movimiento, tcGlobal = 1) => {
  return resumenMovimiento(movimiento, tcGlobal).totalARS;
};

/**
 * Función histórica usada por la app.
 *
 * Devuelve el total original en USD.
 * No convierte a ARS.
 */
export const montoUSDReal = (movimiento) => {
  return resumenMovimiento(movimiento, 1).totalUSD;
};

/**
 * Indica si un movimiento tiene mezcla de monedas en el detalle.
 */
export const tieneMonedaMixta = (movimiento) => {
  const detalle = obtenerDetalleMovimiento(movimiento);

  if (!detalle.length) return false;

  const monedas = new Set(
    detalle.map((item) => normalizarMoneda(item?.moneda ?? movimiento?.moneda))
  );

  return monedas.size > 1;
};

/**
 * Devuelve una descripción corta de monedas del movimiento.
 *
 * Ejemplos:
 * - "ARS"
 * - "USD"
 * - "ARS + USD"
 */
export const descripcionMonedas = (movimiento) => {
  const detalle = obtenerDetalleMovimiento(movimiento);

  if (!detalle.length) {
    return normalizarMoneda(movimiento?.moneda);
  }

  const monedas = Array.from(
    new Set(detalle.map((item) => normalizarMoneda(item?.moneda ?? movimiento?.moneda)))
  );

  return monedas.join(" + ");
};