import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";

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

    const userWorkspace = await resolveWorkspaceForUser(sql, user);
    const workspaceId = userWorkspace.workspaceId || "ws_default";
    user.workspaceId = workspaceId;
    user.workspaceNombre = userWorkspace.workspaceNombre || user.workspaceNombre;

    const { movimientoId } = req.body || {};

    if (!movimientoId) {
      return res.status(400).json({
        ok: false,
        error: "Falta movimientoId",
      });
    }

    const deleted = await sql`
      DELETE FROM movimientos
      WHERE movimiento_id = ${movimientoId}
        AND tipo_movimiento = 'INGRESO'
        AND subtipo_movimiento = 'INGRESO_EXTRA'
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
      RETURNING movimiento_id;
    `;

    if (deleted.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Movimiento no encontrado para el usuario actual",
      });
    }

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
