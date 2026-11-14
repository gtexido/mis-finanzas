// =============================================================================
// src/utils/porMedio.js
// Cuánta plata hace falta en cada medio de pago (cuenta, tarjeta, billetera).
//
// Descripción:
//   Suma lo que todavía no se pagó en el mes, agrupado por medio de pago.
//   Es la plata que hay que tener o transferir a cada cuenta.
//
// Entrada:
//   gastos:  gastos del mes que se está mirando.
//   meta:    función (gasto) => { id, label, color } con el medio de pago,
//            la misma que usa Movimientos para agrupar.
//   importe: función (gasto) => importe en pesos.
//
// Salida:
//   { filas: [{ id, label, color, pendiente, cantidad }], total }
//   Solo medios con algo pendiente, de mayor a menor importe.
//
// Límite conocido:
//   No conoce el saldo real de cada cuenta: informa cuánto se necesita,
//   no cuánto falta transferir.
// =============================================================================
export function pendientePorMedio({ gastos = [], meta, importe = (g) => Number(g.monto) || 0 } = {}) {
  const mapa = new Map();
  for (const g of gastos || []) {
    if (!g || g.estado !== "pendiente") continue;
    const m = meta ? meta(g) : { id: "sin_medio", label: "Sin medio de pago" };
    const fila = mapa.get(m.id) || { id: m.id, label: m.label, color: m.color, pendiente: 0, cantidad: 0 };
    fila.pendiente += importe(g);
    fila.cantidad += 1;
    mapa.set(m.id, fila);
  }
  const filas = [...mapa.values()].sort((a, b) => b.pendiente - a.pendiente || String(a.label).localeCompare(String(b.label), "es"));
  return { filas, total: filas.reduce((s, f) => s + f.pendiente, 0) };
}
