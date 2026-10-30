// =============================================================================
// src/utils/conversion.js
// Funciones puras para convertir montos a pesos y elegir la fecha de conversión.
//
// Origen: estaban dentro del componente App (src/App.jsx). La lógica es la misma;
// lo único que cambió es que ahora reciben por parámetro lo que antes tomaban
// del componente (tipo de cambio, fecha de hoy y mes seleccionado).
//
// Uso:
//   import { normalizarFechaConversion, calcularTotalARSDetalle } from "./utils/conversion";
//   normalizarFechaConversion(gasto, { now, mesKey })
//   calcularTotalARSDetalle(items, tc)
//
// Propósito:
//   Poder probar el cálculo del total en pesos de un desglose sin abrir la app
//   y que App.jsx quede más corto.
// =============================================================================

export const normalizarFechaConversion = (gasto = {}, { now, mesKey } = {}) => {
  if (gasto.vencimiento) {
    return String(gasto.vencimiento).slice(0, 10);
  }

  if (gasto.fechaOperacion) {
    return String(gasto.fechaOperacion).slice(0, 10);
  }

  if (gasto.fecha_operacion) {
    return String(gasto.fecha_operacion).slice(0, 10);
  }

  const dia = String(gasto.dia || now.getDate()).padStart(2, "0");
  return `${mesKey}-${dia}`;
};

export const calcularTotalARSDetalle = (items = [], tc) => {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((acc, item) => {
    const monedaItem = String(item.moneda || "ARS").trim().toUpperCase();
    const monto = Number(item.monto ?? item.montoUSD ?? 0);

    const montoARSGuardado = item.montoARSCalculado ?? item.monto_ars_calculado;
    if (
      montoARSGuardado !== null &&
      montoARSGuardado !== undefined &&
      montoARSGuardado !== "" &&
      Number.isFinite(Number(montoARSGuardado))
    ) {
      return acc + Number(montoARSGuardado);
    }

    if (monedaItem === "USD") {
      const tipoCambio = Number(item.tipoCambio ?? item.tipo_cambio ?? tc ?? 1);
      return acc + monto * (Number.isFinite(tipoCambio) ? tipoCambio : 1);
    }

    return acc + monto;
  }, 0);
};
