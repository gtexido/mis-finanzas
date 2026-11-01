// =============================================================================
// src/utils/deshacerBorrado.js
// Arma el pedido para volver a crear un gasto que se acaba de eliminar.
//
// Descripción:
//   Al eliminar un gasto el servidor lo borra de verdad. Para poder deshacerlo
//   la pantalla guarda una copia y, si la persona toca Deshacer, lo crea de nuevo
//   con la misma ruta que usa Cargar (POST /api/gastos).
//
// Qué conserva: importe, moneda, estado, vencimiento, medio de pago, instrumento,
//   categoría, concepto, etiquetas, observación, marcas de revisión y recurrencia.
//   En el desglose conserva el tipo de cambio y el equivalente en pesos de cada
//   ítem, así los dólares no se recalculan con otra cotización.
// Qué cambia: el gasto vuelve con un identificador nuevo y fecha de creación nueva.
// =============================================================================

export const payloadParaRecrearGasto = (gasto, periodo, legacy = {}) => ({
  periodo,
  dia: gasto.dia,
  categoria: gasto.categoria || legacy.categoria || undefined,
  formaPago: gasto.formaPago || legacy.formaPago || undefined,
  conceptoId: gasto.conceptoId || null,
  medioPagoId: gasto.medioPagoId || null,
  instrumentoId: gasto.instrumentoId || null,
  categoriaGastoId: gasto.categoriaGastoId || null,
  etiquetasIds: (gasto.etiquetas || []).map((e) => e.etiquetaId || e.id).filter(Boolean),
  servicio: gasto.servicio,
  monto: Number(gasto.monto || 0),
  moneda: gasto.moneda || "ARS",
  estado: gasto.estado || "pendiente",
  observacion: gasto.observacion || "",
  vencimiento: gasto.vencimiento || null,
  esRecurrente: !!gasto.esRecurrente,
  requiereRevision: !!gasto.requiereRevision,
  motivoRevision: gasto.motivoRevision || null,
  origenMovimiento: gasto.origenMovimiento || null,
  subconceptos: (gasto.subconceptos || []).map((s, i) => ({
    nombre: s.nombre || s.nombreItem,
    monto: Number(s.monto ?? s.montoUSD ?? 0),
    moneda: String(s.moneda || gasto.moneda || "ARS").trim().toUpperCase(),
    orden: s.orden || i + 1,
    observacion: s.observacion || "",
    tipoCambio: s.tipoCambio ?? null,
    montoARSCalculado: s.montoARSCalculado ?? null,
  })),
});
