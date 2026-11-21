// =============================================================================
// src/utils/grupos.js
// Tres grupos de gasto, automáticos: Fijos, Servicios y Variables.
//
// Descripción:
//   El grupo no se elige al cargar ni se guarda en la base: se calcula con el
//   nombre de cada gasto. Así se ordena solo todo lo ya cargado y lo que venga.
//
// Orden de la decisión (gana la primera que aplica):
//   1. Lo que la persona eligió para ese nombre ("Cambiar grupo" en la fila).
//   2. Una cuota de una compra en cuotas → Fijos.
//   3. Palabras del nombre (palabra completa, sin tildes ni mayúsculas):
//      luz, gas, agua, cable, internet... → Servicios.
//      colegio, prepaga, expensas, seguro, monotributo, muni, alquiler... → Fijos.
//   4. La categoría del gasto: Servicios → Servicios; Educación o Impuestos → Fijos.
//   5. Todo lo demás → Variables.
//
// Límite conocido:
//   La elección manual se guarda en el teléfono (como "No contar" de Tu inflación):
//   en otro dispositivo se vuelve a ver la clasificación automática.
// =============================================================================
import { normalizarTexto } from "./formatters";

export const GRUPOS = [
  { id: "fijos", nombre: "Fijos", ayuda: "Colegio, prepaga, expensas, seguro, impuestos, cuotas" },
  { id: "servicios", nombre: "Servicios", ayuda: "Luz, gas, agua, cable, internet, teléfono" },
  { id: "variables", nombre: "Variables", ayuda: "Super, farmacia, nafta, salidas, regalos, compras" },
];

const PALABRAS_SERVICIOS = ["luz", "gas", "agua", "aguas", "cable", "internet", "wifi", "telefono", "telefonos", "celular", "bidon", "bidones", "epec", "ecogas", "fibertel", "telecom", "movistar", "claro"];
const PALABRAS_FIJOS = ["colegio", "cesd", "escuela", "jardin", "prepaga", "prevencion", "osde", "expensas", "alquiler", "seguro", "monotributo", "muni", "municipal", "municipalidad", "rentas", "renta", "ipv", "impuesto", "impuestos", "afip", "arca", "mantenimiento", "cuota", "cuotas"];

export const claveNombre = (nombre) => normalizarTexto(String(nombre || "").trim()).replace(/\s+/g, " ");
const palabras = (nombre) => claveNombre(nombre).split(/[^a-z0-9ñ]+/).filter(Boolean);
export const nombreGasto = (g) => g?.servicio || g?.conceptoManual || "Sin concepto";
const nombreCategoria = (g) => normalizarTexto(g?.categoriaGastoNombre || g?.categoriaGasto || "");
export const esTarjeta = (g) => nombreCategoria(g) === "tarjetas" || palabras(nombreGasto(g)).includes("tarjeta");

/** Grupo automático de un gasto, sin contar la elección manual. */
export function grupoAutomatico(g) {
  if (g?.cuotaPlanId) return "fijos";
  const p = palabras(nombreGasto(g));
  if (p.some((x) => PALABRAS_SERVICIOS.includes(x))) return "servicios";
  if (p.some((x) => PALABRAS_FIJOS.includes(x))) return "fijos";
  const cat = nombreCategoria(g);
  if (cat === "servicios") return "servicios";
  if (cat === "educacion" || cat === "impuestos") return "fijos";
  return "variables";
}

/** Grupo final: la elección manual para ese nombre, o el automático. */
export const grupoDeGasto = (g, manual = {}) => manual[claveNombre(nombreGasto(g))] || grupoAutomatico(g);

/**
 * Totales por grupo para un mes, comparados con el mes anterior.
 *
 * Entrada:
 *   gastos, previos: gastos del mes y del mes anterior.
 *   manual:          { nombreNormalizado: grupoId } elegido por la persona.
 *   importe:         función (gasto) => importe en pesos.
 *
 * Salida:
 *   { grupos: [{ id, nombre, ayuda, total, anterior, cantidad,
 *                conceptos: [{ clave, nombre, total, anterior, cantidad, tarjeta }] }],
 *     total }
 *   Siempre los tres grupos, en orden Fijos, Servicios, Variables.
 *   Dentro de cada grupo, los conceptos van del más grande al más chico.
 */
/**
 * Abre el resumen de una tarjeta en sus líneas del desglose, para que cada compra
 * caiga en su grupo (Aguas Cordobesas → Servicios, Dinosaurio → Variables).
 * Solo para tarjetas con desglose; el resto de los gastos queda igual.
 * Cada línea lleva _linea: true y su importe en pesos en _importe.
 */
export function abrirTarjetas(gastos = [], importe = (g) => Number(g.monto) || 0) {
  const out = [];
  for (const g of gastos || []) {
    const lineas = g?.subconceptos || [];
    if (!esTarjeta(g) || !lineas.length) { out.push(g); continue; }
    for (const l of lineas) {
      out.push({
        id: `${g.id}_${l.id || l.nombre}`,
        servicio: l.nombre || l.nombreItem || "Ítem de tarjeta",
        categoriaGastoNombre: "",
        estado: g.estado,
        _linea: true,
        _importe: Number(l.montoARSCalculado ?? l.monto) || 0,
      });
    }
  }
  // Si el desglose no llega al total del resumen, la diferencia queda como "sin detalle".
  return out.concat((gastos || []).filter((g) => esTarjeta(g) && (g.subconceptos || []).length).flatMap((g) => {
    const suma = (g.subconceptos || []).reduce((s, l) => s + (Number(l.montoARSCalculado ?? l.monto) || 0), 0);
    const resto = Math.round(importe(g) - suma);
    return resto > 0 ? [{ id: `${g.id}_resto`, servicio: g.servicio, categoriaGastoNombre: "Tarjetas", estado: g.estado, _linea: true, _importe: resto }] : [];
  }));
}

export function resumenPorGrupo({ gastos = [], previos = [], manual = {}, importe = (g) => Number(g.monto) || 0 } = {}) {
  const imp = (g) => (g?._linea ? g._importe : importe(g));
  gastos = abrirTarjetas(gastos, importe);
  previos = abrirTarjetas(previos, importe);
  const base = new Map(GRUPOS.map((gr) => [gr.id, { ...gr, total: 0, anterior: 0, cantidad: 0, porConcepto: new Map() }]));
  const sumar = (g, campo) => {
    const grupo = base.get(grupoDeGasto(g, manual)) || base.get("variables");
    const nombre = nombreGasto(g);
    const clave = claveNombre(nombre);
    const monto = imp(g);
    grupo[campo] += monto;
    const fila = grupo.porConcepto.get(clave) || { clave, nombre, total: 0, anterior: 0, cantidad: 0, tarjeta: esTarjeta(g) };
    fila[campo] += monto;
    if (campo === "total") { grupo.cantidad += 1; fila.cantidad += 1; fila.nombre = nombre; }
    grupo.porConcepto.set(clave, fila);
  };
  for (const g of gastos || []) sumar(g, "total");
  for (const g of previos || []) sumar(g, "anterior");
  const grupos = [...base.values()].map(({ porConcepto, ...gr }) => ({
    ...gr,
    conceptos: [...porConcepto.values()].sort((a, b) => b.total - a.total || b.anterior - a.anterior),
  }));
  return { grupos, total: grupos.reduce((s, gr) => s + gr.total, 0) };
}

/** Lee y guarda en el teléfono las elecciones manuales de grupo de un usuario. */
export const claveStorageGrupos = (usuarioId) => `mf_grupos_${usuarioId || "anon"}`;
export function leerGruposManual(usuarioId) {
  try {
    const v = JSON.parse(localStorage.getItem(claveStorageGrupos(usuarioId)) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
export function guardarGruposManual(usuarioId, valor) {
  try { localStorage.setItem(claveStorageGrupos(usuarioId), JSON.stringify(valor)); } catch { /* sin almacenamiento: queda solo en esta sesión */ }
}

/**
 * "Tu mes normal": cuánto se gasta habitualmente en Variables, calculado solo.
 *
 * Entrada:
 *   gastosPorMes: { "AAAA-MM": [gastos] } con todo lo cargado.
 *   mesKey:       mes que se está mirando.
 *   manual:       elecciones de grupo por nombre.
 *   importe:      función (gasto) => importe en pesos.
 *
 * Lógica:
 *   - Toma hasta 6 meses anteriores a mesKey que tengan al menos 5 gastos
 *     cargados (un mes casi vacío no es un mes real).
 *   - Suma Variables de cada uno, sin contar los gastos llamados "Ahorros"
 *     (plata separada, no gastada).
 *   - El mes normal es el del medio (mediana): no lo tira para arriba un mes
 *     con una compra grande ni para abajo un mes con poco cargado.
 *   - Hacen falta al menos 3 meses; si no, devuelve null.
 *
 * Salida:
 *   { normal, actual, diferencia (normal - actual), meses } o null.
 */
export function mesNormal({ gastosPorMes = {}, mesKey, manual = {}, importe = (g) => Number(g.monto) || 0 } = {}) {
  const variables = (lista) => abrirTarjetas(lista, importe)
    .filter((g) => claveNombre(nombreGasto(g)) !== "ahorros" && grupoDeGasto(g, manual) === "variables")
    .reduce((s, g) => s + (g._linea ? g._importe : importe(g)), 0);
  const anteriores = Object.keys(gastosPorMes || {})
    .filter((k) => k < mesKey && (gastosPorMes[k] || []).length >= 5)
    .sort()
    .slice(-6);
  if (anteriores.length < 3) return null;
  const totales = anteriores.map((k) => variables(gastosPorMes[k])).sort((a, b) => a - b);
  const medio = Math.floor(totales.length / 2);
  const normal = Math.round(totales.length % 2 ? totales[medio] : (totales[medio - 1] + totales[medio]) / 2);
  const actual = Math.round(variables(gastosPorMes[mesKey]));
  return { normal, actual, diferencia: normal - actual, meses: anteriores.length };
}
