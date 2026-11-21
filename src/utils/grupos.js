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
export function resumenPorGrupo({ gastos = [], previos = [], manual = {}, importe = (g) => Number(g.monto) || 0 } = {}) {
  const base = new Map(GRUPOS.map((gr) => [gr.id, { ...gr, total: 0, anterior: 0, cantidad: 0, porConcepto: new Map() }]));
  const sumar = (g, campo) => {
    const grupo = base.get(grupoDeGasto(g, manual)) || base.get("variables");
    const nombre = nombreGasto(g);
    const clave = claveNombre(nombre);
    const monto = importe(g);
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
