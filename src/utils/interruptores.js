// =============================================================================
// src/utils/interruptores.js
// Interruptores de las pantallas nuevas (por navegador, sin tocar la base).
//
// Cómo se activan:
//   - Cargar:  ?cargar=nuevo   / ?cargar=actual
//   - Ajustes: ?ajustes=nuevo  / ?ajustes=actual
//   - "nuevo" se recuerda en este navegador; "actual" vuelve a la pantalla de siempre.
//   - Sin parámetro: se usa lo último que se eligió; por defecto, la pantalla actual.
//
// Propósito:
//   Probar la pantalla nueva en producción sin que otras personas usuarias
//   la vean, y volver atrás con un solo link.
// =============================================================================

const leerInterruptor = (parametro, clave) => {
  try {
    const param = new URLSearchParams(window.location.search).get(parametro);
    if (param === "nuevo") { localStorage.setItem(clave, "1"); return true; }
    if (param === "actual") { localStorage.removeItem(clave); return false; }
    return localStorage.getItem(clave) === "1";
  } catch {
    return false;
  }
};

export const leerCargarNuevo = () => leerInterruptor("cargar", "mf_cargar_nuevo");
export const leerAjustesNuevo = () => leerInterruptor("ajustes", "mf_ajustes_nuevo");
