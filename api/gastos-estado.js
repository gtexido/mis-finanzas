import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";

const ESTADOS_VALIDOS = new Set(["pendiente", "pagado"]);

export default async function handler(req, res) {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;

    const body = req.body || {};
    const movimientoId = body.movimientoId || body.id;
    const estado = String(body.estado || "").trim().toLowerCase();

    if (!movimientoId) {
      return res.status(400).json({ ok: false, error: "Falta movimientoId" });
    }

    if (!ESTADOS_VALIDOS.has(estado)) {
      return res.status(400).json({ ok: false, error: "Estado no válido" });
    }

    const userWorkspace = await resolveWorkspaceForUser(sql, user);
    const workspaceId = userWorkspace.workspaceId || "ws_default";

    const updated = await sql`
      UPDATE movimientos
      SET
        estado = ${estado},
        updated_at = NOW()
      WHERE movimiento_id = ${movimientoId}
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
        AND tipo_movimiento = 'GASTO'
        AND activo = true
      RETURNING
        movimiento_id,
        estado,
        periodo,
        workspace_id,
        usuario_id;
    `;

    if (updated.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Movimiento no encontrado para el usuario actual",
      });
    }

    return res.status(200).json({ ok: true, data: updated[0] });
  } catch (error) {
    console.error("Error en /api/gastos-estado:", error);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}
