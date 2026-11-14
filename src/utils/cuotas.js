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

/**
 * Resumen de las compras en cuotas para Inicio.
 *
 * Entrada:
 *   gastosPorMes: { "AAAA-MM": [gastos] } con todos los meses cargados.
 *   mesKey:       mes que se está mirando.
 *   importe:      función (gasto) => importe en pesos (por defecto, gasto.monto).
 *
 * Lógica:
 *   Agrupa las cuotas por compra (cuotaPlanId). Una compra entra si le queda
 *   alguna cuota en el mes mirado o después; las que ya terminaron no aparecen.
 *
 * Salida:
 *   planes: una fila por compra, ordenadas por la que termina antes:
 *     { planId, nombre, total, cuotaDelMes (número o null si este mes no tiene),
 *       montoCuota, terminaKey, cuotasPorPagar, montoPorPagar }
 *   totalMes:      suma de las cuotas del mes mirado (pagadas o no).
 *   totalPorPagar: suma de las cuotas pendientes desde el mes mirado en adelante.
 */
export function resumenPlanes({ gastosPorMes = {}, mesKey, importe = (g) => Number(g.monto) || 0 } = {}) {
  const porPlan = new Map();
  for (const [key, lista] of Object.entries(gastosPorMes || {})) {
    for (const g of lista || []) {
      if (!g?.cuotaPlanId) continue;
      if (!porPlan.has(g.cuotaPlanId)) porPlan.set(g.cuotaPlanId, []);
      porPlan.get(g.cuotaPlanId).push({ ...g, mesKey: key });
    }
  }
  const planes = [];
  for (const [planId, cuotas] of porPlan) {
    const vigentes = cuotas.filter((c) => c.mesKey >= mesKey);
    if (!vigentes.length) continue;
    const delMes = vigentes.find((c) => c.mesKey === mesKey) || null;
    const referencia = delMes || [...vigentes].sort((a, b) => a.mesKey.localeCompare(b.mesKey))[0];
    const porPagar = vigentes.filter((c) => c.estado !== "pagado");
    planes.push({
      planId,
      nombre: referencia.servicio || referencia.conceptoNombre || "Compra en cuotas",
      total: Number(referencia.cuotaTotal) || 0,
      cuotaDelMes: delMes ? Number(delMes.cuotaNumero) : null,
      montoCuota: importe(referencia),
      montoDelMes: delMes ? importe(delMes) : 0,
      terminaKey: cuotas.map((c) => c.mesKey).sort().at(-1),
      cuotasPorPagar: porPagar.length,
      montoPorPagar: porPagar.reduce((s, c) => s + importe(c), 0),
    });
  }
  planes.sort((a, b) => a.terminaKey.localeCompare(b.terminaKey) || a.nombre.localeCompare(b.nombre, "es"));
  return {
    planes,
    totalMes: planes.reduce((s, p) => s + p.montoDelMes, 0),
    totalPorPagar: planes.reduce((s, p) => s + p.montoPorPagar, 0),
  };
}
