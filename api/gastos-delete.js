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

    const movimientoPropio = await sql`
      SELECT movimiento_id
      FROM movimientos
      WHERE movimiento_id = ${movimientoId}
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
        AND tipo_movimiento = 'GASTO'
      LIMIT 1;
    `;

    if (movimientoPropio.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Movimiento no encontrado para el usuario actual",
      });
    }

    await sql`
      DELETE FROM movimiento_etiquetas
      WHERE movimiento_id = ${movimientoId}
        AND movimiento_id IN (
          SELECT movimiento_id
          FROM movimientos
          WHERE usuario_id = ${user.usuarioId}
            AND workspace_id = ${workspaceId}
            AND tipo_movimiento = 'GASTO'
        );
    `;

    await sql`
      DELETE FROM detalle_movimiento
      WHERE movimiento_id = ${movimientoId}
        AND movimiento_id IN (
          SELECT movimiento_id
          FROM movimientos
          WHERE usuario_id = ${user.usuarioId}
            AND workspace_id = ${workspaceId}
            AND tipo_movimiento = 'GASTO'
        );
    `;

    await sql`
      DELETE FROM movimientos
      WHERE movimiento_id = ${movimientoId}
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
        AND tipo_movimiento = 'GASTO';
    `;

    return res.status(200).json({
      ok: true,
      data: {
        movimientoId,
      },
    });
  } catch (error) {
    console.error("Error en /api/gastos-delete:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}
