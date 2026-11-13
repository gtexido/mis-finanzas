function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

export function validarPeriodoDia(periodo, dia = 1) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(periodo || ""))) {
    invalid("El período debe tener formato AAAA-MM.");
  }
  const [year, month] = String(periodo).split("-").map(Number);
  const day = Number(dia);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1000 || !Number.isInteger(day) || day < 1 || day > lastDay) {
    invalid(`Ingresá un día válido entre 1 y ${lastDay}.`);
  }
}

export function validarImporte(monto, nombre = "importe") {
  if (monto === "" || monto === null || monto === undefined ||
      !Number.isFinite(Number(monto)) || Number(monto) <= 0) {
    invalid(`El ${nombre} debe ser un número mayor a cero.`);
  }
}

export function validarGasto(body) {
  validarPeriodoDia(body.periodo, body.dia ?? 1);
  if (body.vencimiento) {
    const fecha = String(body.vencimiento);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) invalid("El vencimiento no es válido.");
    validarPeriodoDia(fecha.slice(0, 7), fecha.slice(8));
  }
  if (body.estado && !["pagado", "pendiente"].includes(body.estado)) invalid("Estado no válido.");
  const moneda = String(body.moneda || "ARS").trim().toUpperCase();
  if (!["ARS", "USD"].includes(moneda)) invalid("Moneda no válida.");
  const items = body.subconceptos ?? [];
  if (!Array.isArray(items)) invalid("El desglose debe ser una lista de ítems.");
  if (!items.length) validarImporte(body.monto);
  for (const item of items) {
    if (!item || !String(item.nombre || item.nombreItem || "").trim()) invalid("Cada ítem necesita un nombre.");
    validarImporte(item.monto ?? item.montoUSD, "importe del ítem");
    if (!["ARS", "USD"].includes(String(item.moneda || moneda).trim().toUpperCase())) invalid("Moneda del ítem no válida.");
    const tc = item.tipoCambio ?? item.tipo_cambio;
    if (tc !== undefined && tc !== null && tc !== "") validarImporte(tc, "tipo de cambio");
    const ars = item.montoARSCalculado ?? item.monto_ars_calculado;
    if (ars !== undefined && ars !== null && ars !== "") validarImporte(ars, "equivalente en pesos");
  }
  validarCuotas(body.cuotas, items);
}

export const CUOTAS_MAXIMO = 60;

/**
 * Compra en cuotas (opcional): { total, desde }.
 *   total: cantidad de cuotas de la compra, entre 2 y 60.
 *   desde: número de la primera cuota que se carga (por defecto 1). Permite cargar
 *          una compra ya empezada: desde 3 y total 6 crea las cuotas 3, 4, 5 y 6.
 * No se combina con desglose: cada cuota es un importe único.
 */
export function validarCuotas(cuotas, items = []) {
  if (cuotas === undefined || cuotas === null) return;
  if (typeof cuotas !== "object" || Array.isArray(cuotas)) invalid("Los datos de las cuotas no son válidos.");
  const total = Number(cuotas.total);
  const desde = Number(cuotas.desde ?? 1);
  if (!Number.isInteger(total) || total < 2 || total > CUOTAS_MAXIMO) {
    invalid(`La cantidad de cuotas debe ser un número entre 2 y ${CUOTAS_MAXIMO}.`);
  }
  if (!Number.isInteger(desde) || desde < 1 || desde > total) {
    invalid(`La primera cuota debe ser un número entre 1 y ${total}.`);
  }
  if (items.length) invalid("Una compra en cuotas no puede tener desglose.");
}
