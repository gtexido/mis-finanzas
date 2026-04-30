import { createToken, validatePin } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const { usuarioId, pin } = req.body || {};
    const user = validatePin(usuarioId, pin);

    if (!user) {
      return res.status(401).json({ ok: false, error: "PIN inválido" });
    }

    return res.status(200).json({
      ok: true,
      data: {
        token: createToken(user),
        user,
      },
    });
  } catch (error) {
    console.error("Error en /api/auth-login:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}
