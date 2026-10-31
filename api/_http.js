// =============================================================================
// api/_http.js
// Respuestas de error comunes para todos los handlers de /api.
//
// Fuentes:
//   - Errores lanzados por los handlers con `error.statusCode` (validaciones,
//     conflictos, permisos). Sus mensajes están escritos para la persona usuaria.
//   - Errores de PostgreSQL / Neon, que traen `error.code` (SQLSTATE).
//
// Lógica:
//   1. statusCode entre 400 y 499: se devuelve tal cual, con su mensaje.
//   2. Error de base con SQLSTATE conocido: se traduce a 400 o 409 con un
//      mensaje propio, sin nombres de tablas, columnas ni restricciones.
//   3. Cualquier otro caso: 500 con un mensaje genérico.
//   El detalle completo siempre queda en el log del servidor (console.error).
//
// Uso:
//   import { responderError, httpError } from "./_http.js";
//   try { ... } catch (error) { return responderError(res, error, "/api/gastos"); }
//   if (!nombre) throw httpError(400, "Falta nombre del concepto");
//
// Propósito:
//   Que ningún mensaje técnico de la base llegue a la pantalla y que cada
//   error tenga el código HTTP correcto (400 dato inválido, 409 conflicto,
//   500 falla del servidor).
// =============================================================================

export const MENSAJE_ERROR_GENERICO =
  "No pudimos completar la operación. Intentá de nuevo en unos minutos.";

// Códigos SQLSTATE que indican un dato inválido o un conflicto, no una falla del servidor.
const ERRORES_BASE = {
  "23502": { status: 400, mensaje: "Falta un dato obligatorio." },
  "23514": { status: 400, mensaje: "Algún dato tiene un valor que no está permitido." },
  "22P02": { status: 400, mensaje: "Algún dato tiene un formato que no es válido." },
  "22007": { status: 400, mensaje: "Alguna fecha no tiene un formato válido." },
  "22008": { status: 400, mensaje: "Alguna fecha no tiene un formato válido." },
  "22003": { status: 400, mensaje: "Algún número está fuera del rango permitido." },
  "22001": { status: 400, mensaje: "Algún texto es demasiado largo." },
  "23503": { status: 409, mensaje: "El dato hace referencia a un registro que no existe o fue eliminado." },
  "23505": { status: 409, mensaje: "Ese registro ya existe." },
};

export function httpError(statusCode, mensaje) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
}

export function traducirError(error) {
  const status = Number(error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return { status, mensaje: error.message || MENSAJE_ERROR_GENERICO };
  }
  const conocido = ERRORES_BASE[String(error?.code || "")];
  if (conocido) return conocido;
  return { status: 500, mensaje: MENSAJE_ERROR_GENERICO };
}

export function responderError(res, error, ruta = "api") {
  console.error(`Error en ${ruta}:`, error);
  const { status, mensaje } = traducirError(error);
  return res.status(status).json({ ok: false, error: mensaje });
}
