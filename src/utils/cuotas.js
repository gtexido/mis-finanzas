// =============================================================================
// src/utils/cuotas.js
// Compras en cuotas: validación del formulario y textos de resumen.
//
// Descripción:
//   Funciones sin efectos, usadas por Cargar y por las listas. El servidor
//   vuelve a validar lo mismo (api/_validation.js): esto es para avisar antes.
//
// Reglas (iguales a las del servidor):
//   - total: cantidad de cuotas de la compra, entero entre 2 y 60.
//   - desde: número de la primera cuota que se carga, entre 1 y total. Permite
//     cargar una compra ya empezada (desde 3 de 6 crea las cuotas 3, 4, 5 y 6).
//   - una compra en cuotas no lleva desglose.
// =============================================================================

export const CUOTAS_MINIMO = 2;
export const CUOTAS_MAXIMO = 60;

/** Período "AAAA-MM" que está `meses` después del indicado. */
export const mesSiguiente = (key, meses = 1) => {
  const [anio, mes] = String(key).split("-").map(Number);
  const total = anio * 12 + (mes - 1) + Number(meses || 0);
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
};

const entero = (valor) => (/^\d+$/.test(String(valor ?? "").trim()) ? Number(valor) : NaN);

/**
 * Valida los campos de cuotas del formulario.
 * Devuelve { ok: true, total, desde, cantidad } o { ok: false, mensaje }.
 */
export function validarCuotasForm({ total, desde = 1, tieneDesglose = false } = {}) {
  const t = entero(total);
  const d = entero(desde === "" || desde === null || desde === undefined ? 1 : desde);
  if (!Number.isInteger(t) || t < CUOTAS_MINIMO || t > CUOTAS_MAXIMO) {
    return { ok: false, mensaje: `Indicá cuántas cuotas son: un número entre ${CUOTAS_MINIMO} y ${CUOTAS_MAXIMO}.` };
  }
  if (!Number.isInteger(d) || d < 1 || d > t) {
    return { ok: false, mensaje: `El número de esta cuota tiene que estar entre 1 y ${t}.` };
  }
  if (tieneDesglose) return { ok: false, mensaje: "Una compra en cuotas no puede tener desglose. Quitá el desglose o desmarcá las cuotas." };
  return { ok: true, total: t, desde: d, cantidad: t - d + 1 };
}

/**
 * Resumen de lo que se va a crear al guardar.
 * Devuelve null si los datos todavía no son válidos.
 *   cantidad: cuántos gastos se crean; hastaKey: mes de la última cuota;
 *   montoTotal: importe de una cuota por la cantidad que se crea.
 */
export function resumenCuotas({ total, desde = 1, monto = 0, mesKey } = {}) {
  const v = validarCuotasForm({ total, desde });
  if (!v.ok || !mesKey) return null;
  return {
    ...v,
    desdeKey: mesKey,
    hastaKey: mesSiguiente(mesKey, v.cantidad - 1),
    montoTotal: (Number(monto) || 0) * v.cantidad,
  };
}

/** "Cuota 3/12" para un gasto que es cuota; cadena vacía si no lo es. */
export const etiquetaCuota = (gasto) =>
  gasto?.cuotaPlanId && gasto.cuotaNumero && gasto.cuotaTotal ? `Cuota ${gasto.cuotaNumero}/${gasto.cuotaTotal}` : "";

/** Cuántas cuotas faltan después de esta (0 si es la última o no es cuota). */
export const cuotasQueFaltan = (gasto) =>
  gasto?.cuotaPlanId ? Math.max(0, Number(gasto.cuotaTotal || 0) - Number(gasto.cuotaNumero || 0)) : 0;
