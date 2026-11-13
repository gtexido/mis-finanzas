// =============================================================================
// src/utils/proyeccion.js
// "¿Llegás a fin de mes?": cómo baja la plata en mano con cada pago pendiente.
//
// Descripción:
//   Parte de lo que hay en mano hoy y va restando los pagos pendientes en la
//   fecha en que vence cada uno, hasta fin de mes. Informa si en alguna fecha
//   el saldo queda en negativo.
//
// Fuentes (todo ya cargado en la app, no consulta al servidor):
//   - gastos: los gastos del mes (se usan los que están en estado "pendiente").
//   - disponible: el "Disponible" de Inicio = ingresos − gastos − ahorro neto.
//   - ingresos: lista de ingresos del mes con su día (el sueldo se toma como
//     recibido desde el día 1).
//
// Lógica:
//   - En mano hoy = disponible + lo que falta pagar − ingresos que todavía no
//     llegaron (día posterior a hoy).
//   - Cada pago pendiente se resta en su fecha de vencimiento. Si ya venció, se
//     resta hoy. Si no tiene fecha, va al final, en "Sin fecha".
//   - Los ingresos con día posterior a hoy se suman ese día.
//   - El saldo después del último movimiento coincide con el disponible.
//
// Uso:
//   proyectarMes({ gastos, tc, disponible, hoy: "2026-11-12", mesKey: "2026-11", ingresos })
//
// Límite: no conoce el saldo real del banco; trabaja con lo cargado en la app.
// =============================================================================

import { fechaValida } from "./dates";
import { montoReal } from "./money";

const redondear = (n) => Math.round(Number(n) || 0);

export function proyectarMes({ gastos = [], tc = 1, disponible = 0, hoy, mesKey, ingresos = [] } = {}) {
  const diaHoy = Number(String(hoy || "").slice(8, 10)) || 1;
  const pendientes = gastos.filter((g) => g.estado === "pendiente");
  const porPagar = pendientes.reduce((total, g) => total + montoReal(g, tc), 0);

  const futuros = ingresos
    .map((i) => ({ nombre: i.fuente || "Ingreso", monto: Number(i.monto) || 0, dia: Number(i.dia) || 1 }))
    .filter((i) => i.monto > 0 && i.dia > diaHoy);
  const porCobrar = futuros.reduce((total, i) => total + i.monto, 0);

  const enMano = disponible + porPagar - porCobrar;

  const porFecha = new Map();
  const sinFecha = { items: [], total: 0 };
  let vencidos = 0;
  const sumar = (fecha, item) => {
    const paso = porFecha.get(fecha) || { fecha, items: [], pagos: 0, cobros: 0 };
    paso.items.push(item);
    if (item.monto < 0) paso.pagos += -item.monto; else paso.cobros += item.monto;
    porFecha.set(fecha, paso);
  };
  for (const g of pendientes) {
    const monto = montoReal(g, tc);
    const item = { nombre: g.servicio || "Sin concepto", monto: -monto };
    if (!fechaValida(g.vencimiento)) { sinFecha.items.push(item); sinFecha.total += monto; continue; }
    const fecha = String(g.vencimiento).slice(0, 10);
    if (fecha < hoy) vencidos += 1;
    sumar(fecha < hoy ? hoy : fecha, item);
  }
  for (const i of futuros) sumar(`${mesKey}-${String(i.dia).padStart(2, "0")}`, { nombre: i.nombre, monto: i.monto });

  let saldo = enMano;
  let minimo = { saldo: enMano, fecha: hoy };
  const pasos = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((paso) => {
    saldo += paso.cobros - paso.pagos;
    if (saldo < minimo.saldo) minimo = { saldo, fecha: paso.fecha };
    return { ...paso, pagos: redondear(paso.pagos), cobros: redondear(paso.cobros), saldo: redondear(saldo) };
  });
  if (sinFecha.items.length) {
    saldo -= sinFecha.total;
    if (saldo < minimo.saldo) minimo = { saldo, fecha: null };
  }

  return {
    enMano: redondear(enMano),
    porPagar: redondear(porPagar),
    porCobrar: redondear(porCobrar),
    finDeMes: redondear(saldo),
    cantidad: pendientes.length,
    vencidos,
    pasos,
    sinFecha: sinFecha.items.length ? { items: sinFecha.items, total: redondear(sinFecha.total) } : null,
    minimo: { saldo: redondear(minimo.saldo), fecha: minimo.fecha },
    llega: redondear(minimo.saldo) >= 0,
  };
}
