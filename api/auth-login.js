import { neon } from "@neondatabase/serverless";
import { createToken, validatePin, resolveWorkspaceForUser } from "./_auth.js";
import { claveLogin, revisarBloqueo, registrarFallo, limpiarFallos } from "./_loginGuard.js";

export default async function handler(req, res) {
  res.setHeader?.("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  try {
    const { usuarioId, pin } = req.body || {};
    const sql = neon(process.env.DATABASE_URL);
    const clave = claveLogin(req, usuarioId);

    const bloqueo = await revisarBloqueo(sql, clave);
    if (bloqueo.bloqueado) {
      res.setHeader?.("Retry-After", String(bloqueo.esperarSegundos));
      const minutos = Math.ceil(bloqueo.esperarSegundos / 60);
      return res.status(429).json({ ok: false, error: `Demasiados intentos. Probá de nuevo en ${minutos} minuto${minutos === 1 ? "" : "s"}.` });
    }

    const base = validatePin(usuarioId, pin);
    if (!base) {
      await registrarFallo(sql, clave);
      return res.status(401).json({ ok: false, error: "Usuario o clave incorrectos" });
    }

    const user = await resolveWorkspaceForUser(sql, base);
    await limpiarFallos(sql, clave);
    return res.status(200).json({ ok: true, data: { token: createToken(user), user } });
  } catch (error) {
    console.error("Error en /api/auth-login:", error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.statusCode === 403 ? error.message : "No pudimos iniciar sesión. Intentá nuevamente." });
  }
}
