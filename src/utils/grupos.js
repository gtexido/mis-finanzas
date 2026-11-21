// =============================================================================
// src/utils/grupos.js
// "Dónde ajustar": agrupa las categorías de gasto en grupos que dicen
// qué se puede recortar y qué no.
//
// Descripción:
//   Cada gasto ya tiene una categoría (Supermercado, Servicios, Salud...).
//   Acá cada categoría pertenece a un grupo. El grupo no se guarda en la base:
//   se calcula desde el nombre de la categoría, igual para todos los usuarios.
//
// Grupos:
//   ajustable  → Día a día, Gustos y extras (donde se puede recortar).
//   fijo       → Fijos obligatorios, Servicios de la casa (difícil de mover).
//   aparte     → Tarjetas (sin detalle), Negocio.
//
// Límite conocido:
//   Se agrupa por categoría, no por concepto. Si una categoría mezcla cosas
//   (por ejemplo Salud: prepaga y farmacia), todo va al mismo grupo.
//   Una categoría nueva que no esté en la lista va a "Gustos y extras".
// =============================================================================
import { normalizarTexto } from "./formatters";

export const GRUPOS = [
  { id: "dia", nombre: "Día a día", tipo: "ajustable", ayuda: "Super, comida, nafta, transporte" },
  { id: "extras", nombre: "Gustos y extras", tipo: "ajustable", ayuda: "Salidas, regalos, ropa, gimnasio, suscripciones" },
  { id: "fijos", nombre: "Fijos obligatorios", tipo: "fijo", ayuda: "Colegio, salud, impuestos, expensas" },
  { id: "servicios", nombre: "Servicios de la casa", tipo: "fijo", ayuda: "Luz, gas, agua, cable, teléfono" },
  { id: "tarjetas", nombre: "Tarjetas", tipo: "aparte", ayuda: "El resumen se carga por el total: no se sabe en qué se fue" },
  { id: "negocio", nombre: "Negocio", tipo: "aparte", ayuda: "Gastos del local y del trabajo" },
];

// Nombre de categoría (sin tildes ni mayúsculas) → grupo.
const CATEGORIA_A_GRUPO = {
  supermercado: "dia",
  comida: "dia",
  nafta: "dia",
  transporte: "dia",
  personal: "extras",
  ropa: "extras",
  entretenimiento: "extras",
  deporte: "extras",
  suscripciones: "extras",
  evento: "extras",
  otros: "extras",
  educacion: "fijos",
  salud: "fijos",
  impuestos: "fijos",
  hogar: "fijos",
  servicios: "servicios",
  tarjetas: "tarjetas",
  local: "negocio",
  trabajo: "negocio",
};

export const grupoDeCategoria = (nombreCategoria) => CATEGORIA_A_GRUPO[normalizarTexto(nombreCategoria || "")] || "extras";

const nombreCategoria = (g) => g?.categoriaGastoNombre || g?.categoriaGasto || "Sin categoría";

/**
 * Totales por grupo para un mes, comparados con el mes anterior.
 *
 * Entrada:
 *   gastos, previos: gastos del mes y del mes anterior.
 *   importe:         función (gasto) => importe en pesos.
 *
 * Salida:
 *   { grupos: [{ ...grupo, total, anterior, cantidad, categorias: [{ nombre, total, anterior, conceptos }] }],
 *     total, totalAjustable, totalFijo }
 *   Se devuelven solo los grupos con gastos en alguno de los dos meses, en el orden de GRUPOS.
 *   Dentro de cada grupo, las categorías van de mayor a menor; conceptos lista los tres más grandes.
 */
export function resumenPorGrupo({ gastos = [], previos = [], importe = (g) => Number(g.monto) || 0 } = {}) {
  const base = new Map(GRUPOS.map((gr) => [gr.id, { ...gr, total: 0, anterior: 0, cantidad: 0, cats: new Map() }]));
  const sumar = (g, campo) => {
    const cat = nombreCategoria(g);
    const grupo = base.get(grupoDeCategoria(cat));
    const monto = importe(g);
    grupo[campo] += monto;
    const fila = grupo.cats.get(cat) || { nombre: cat, total: 0, anterior: 0, porConcepto: new Map() };
    fila[campo] += monto;
    if (campo === "total") {
      grupo.cantidad += 1;
      const concepto = g.servicio || g.conceptoManual || "Sin concepto";
      fila.porConcepto.set(concepto, (fila.porConcepto.get(concepto) || 0) + monto);
    }
    grupo.cats.set(cat, fila);
  };
  for (const g of gastos || []) sumar(g, "total");
  for (const g of previos || []) sumar(g, "anterior");

  const grupos = [...base.values()]
    .filter((gr) => gr.total > 0 || gr.anterior > 0)
    .map(({ cats, ...gr }) => ({
      ...gr,
      categorias: [...cats.values()]
        .map(({ porConcepto, ...c }) => ({
          ...c,
          conceptos: [...porConcepto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nombre, total]) => ({ nombre, total })),
        }))
        .sort((a, b) => b.total - a.total || b.anterior - a.anterior),
    }));
  const suma = (tipo) => grupos.filter((gr) => !tipo || gr.tipo === tipo).reduce((s, gr) => s + gr.total, 0);
  return { grupos, total: suma(), totalAjustable: suma("ajustable"), totalFijo: suma("fijo") };
}
