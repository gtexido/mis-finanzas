// ============================================================
// api/_loginGuard.js
// Límite de intentos fallidos de login (fuerza bruta sobre el PIN).
//
// Reglas:
//  - 5 fallos en 15 min para el mismo usuario + IP  -> bloqueo.
//  - 30 fallos en 60 min para el mismo usuario (cualquier IP) -> bloqueo.
// Un login correcto borra los fallos de ese usuario + IP.
//
// Requiere la tabla `login_fallos` (ver SQL_LOGIN_INTENTOS.sql).
// Si la tabla no existe, NO bloquea el login: avisa en el log y sigue.
// ============================================================

const MAX_POR_IP = 5;
const VENTANA_IP_MIN = 15;
const MAX_POR_USUARIO = 30;
const VENTANA_USUARIO_MIN = 60;

const TABLA_INEXISTENTE = "42P01";

export function claveLogin(req, usuarioId) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = (forwarded || req.socket?.remoteAddress || "desconocida").slice(0, 64);
  const usuario = String(usuarioId || "").trim().toLowerCase().slice(0, 40) || "vacio";
  return { usuario, ip };
}

function tablaNoExiste(error) {
  return error?.code === TABLA_INEXISTENTE || /login_fallos/.test(String(error?.message || "")) && /does not exist/.test(String(error?.message || ""));
}

// Devuelve { bloqueado: false } o { bloqueado: true, esperarSegundos }.
export async function revisarBloqueo(sql, { usuario, ip }) {
  try {
    const [porIp] = await sql`
      SELECT COUNT(*)::int AS fallos, MIN(creado_at) AS primero
      FROM login_fallos
      WHERE usuario_id = ${usuario} AND ip = ${ip}
        AND creado_at > NOW() - make_interval(mins => ${VENTANA_IP_MIN});
    `;
    if (porIp.fallos >= MAX_POR_IP) {
      const desde = new Date(porIp.primero).getTime();
      const hasta = desde + VENTANA_IP_MIN * 60_000;
      return { bloqueado: true, esperarSegundos: Math.max(60, Math.ceil((hasta - Date.now()) / 1000)) };
    }
    const [porUsuario] = await sql`
      SELECT COUNT(*)::int AS fallos
      FROM login_fallos
      WHERE usuario_id = ${usuario}
        AND creado_at > NOW() - make_interval(mins => ${VENTANA_USUARIO_MIN});
    `;
    if (porUsuario.fallos >= MAX_POR_USUARIO) {
      return { bloqueado: true, esperarSegundos: VENTANA_USUARIO_MIN * 60 };
    }
    return { bloqueado: false };
  } catch (error) {
    if (tablaNoExiste(error)) console.warn("login_fallos no existe: el límite de intentos está desactivado. Ejecutá SQL_LOGIN_INTENTOS.sql.");
    else console.error("Error revisando intentos de login:", error);
    return { bloqueado: false };
  }
}

export async function registrarFallo(sql, { usuario, ip }) {
  try {
    await sql`INSERT INTO login_fallos (usuario_id, ip) VALUES (${usuario}, ${ip});`;
    // Limpieza: sin cron, borramos lo viejo de vez en cuando.
    if (Math.random() < 0.05) await sql`DELETE FROM login_fallos WHERE creado_at < NOW() - INTERVAL '1 day';`;
  } catch (error) {
    if (!tablaNoExiste(error)) console.error("Error registrando fallo de login:", error);
  }
}

export async function limpiarFallos(sql, { usuario, ip }) {
  try {
    await sql`DELETE FROM login_fallos WHERE usuario_id = ${usuario} AND ip = ${ip};`;
  } catch (error) {
    if (!tablaNoExiste(error)) console.error("Error limpiando fallos de login:", error);
  }
}
