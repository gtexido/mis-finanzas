// =============================================================================
// src/utils/interruptores.js
// Interruptores de las pantallas nuevas (por navegador, sin tocar la base).
//
// Cómo se activan:
//   - Cargar:  ?cargar=nuevo   / ?cargar=actual
//   - Ajustes: ?ajustes=nuevo  / ?ajustes=actual
//   - Vencimientos: ?vencimientos=nuevo / ?vencimientos=actual
//   - Inicio:  ?inicio=nuevo   / ?inicio=actual
//   - Movimientos (filas compactas): ?movimientos=nuevo / ?movimientos=actual
//   - "actual" vuelve a la pantalla anterior y se recuerda en este navegador;
//     "nuevo" la vuelve a activar.
//   - Sin parámetro: se usa lo último que se eligió; por defecto, la pantalla nueva.
//
// Propósito:
//   Las pantallas nuevas son las de siempre. Este interruptor queda solo como
//   salida de emergencia: un link con ?...=actual vuelve a la pantalla anterior.
// =============================================================================

const leerInterruptor = (parametro, clave) => {
  try {
    const param = new URLSearchParams(window.location.search).get(parametro);
    if (param === "nuevo") { localStorage.removeItem(clave); return true; }
    if (param === "actual") { localStorage.setItem(clave, "0"); return false; }
    return localStorage.getItem(clave) !== "0";
  } catch {
    return true;
  }
};

export const leerCargarNuevo = () => leerInterruptor("cargar", "mf_cargar_nuevo");
export const leerVencimientosNuevo = () => leerInterruptor("vencimientos", "mf_vencimientos_nuevo");
export const leerInicioNuevo = () => leerInterruptor("inicio", "mf_inicio_nuevo");
export const leerMovimientosNuevo = () => leerInterruptor("movimientos", "mf_movimientos_nuevo");
export const leerAjustesNuevo = () => leerInterruptor("ajustes", "mf_ajustes_nuevo");
