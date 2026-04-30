import { neon } from "@neondatabase/serverless";
import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;
    const { movimientoId } = req.body || {};

    if (!movimientoId) {
      return res.status(400).json({
        ok: false,
        error: "Falta movimientoId",
      });
    }

    await sql`
      DELETE FROM movimientos
      WHERE movimiento_id = ${movimientoId}
        AND tipo_movimiento = 'INGRESO'
        AND subtipo_movimiento = 'INGRESO_EXTRA'
        AND usuario_id = ${user.usuarioId};
    `;

    return res.status(200).json({
      ok: true,
      data: {
        movimientoId,
      },
    });
  } catch (error) {
    console.error("Error en /api/ingresos-delete:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}