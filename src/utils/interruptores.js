// =============================================================================
// src/utils/interruptores.js
// Interruptor de la pantalla Cargar nueva (por navegador, sin tocar la base).
//
// Cómo se activa:
//   - Abrir la app con ?cargar=nuevo  -> se recuerda en este navegador.
//   - Abrir la app con ?cargar=actual -> vuelve a la pantalla de siempre.
//   - Sin parámetro: se usa lo último que se eligió; por defecto, la pantalla actual.
//
// Propósito:
//   Probar la pantalla nueva en producción sin que otras personas usuarias
//   la vean, y volver atrás con un solo link.
// =============================================================================

const CLAVE = "mf_cargar_nuevo";

export const leerCargarNuevo = () => {
  try {
    const param = new URLSearchParams(window.location.search).get("cargar");
    if (param === "nuevo") { localStorage.setItem(CLAVE, "1"); return true; }
    if (param === "actual") { localStorage.removeItem(CLAVE); return false; }
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
};
