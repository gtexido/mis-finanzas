import { neon } from "@neondatabase/serverless";
import { createToken, validatePin, resolveWorkspaceForUser } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader?.("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  try {
    const { usuarioId, pin } = req.body || {};
    const base = validatePin(usuarioId, pin);
    if (!base) return res.status(401).json({ ok: false, error: "Usuario o clave incorrectos" });
    const user = await resolveWorkspaceForUser(neon(process.env.DATABASE_URL), base);
    return res.status(200).json({ ok: true, data: { token: createToken(user), user } });
  } catch (error) {
    console.error("Error en /api/auth-login:", error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.statusCode === 403 ? error.message : "No pudimos iniciar sesión. Intentá nuevamente." });
  }
}
