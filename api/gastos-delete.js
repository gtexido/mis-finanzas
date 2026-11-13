import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";
import { responderError } from "./_http.js";

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

    // alcance "cuotas_restantes": borra esta cuota y las que le siguen de la misma compra.
    const { movimientoId, alcance = null } = req.body || {};
    if (alcance !== null && alcance !== "cuotas_restantes") {
      return res.status(400).json({ ok: false, error: "Alcance no válido." });
    }

    if (!movimientoId) {
      return res.status(400).json({
        ok: false,
        error: "Falta movimientoId",
      });
    }

    const movimientoPropio = await sql`
      SELECT movimiento_id, cuota_plan_id, cuota_numero
      FROM movimientos
      WHERE movimiento_id = ${movimientoId}
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
        AND tipo_movimiento = 'GASTO' AND activo = true
      LIMIT 1;
    `;

    if (movimientoPropio.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Movimiento no encontrado para el usuario actual",
      });
    }

    // Lista de gastos a borrar: uno solo, o esta cuota y las siguientes de la misma compra.
    let ids = [movimientoId];
    const { cuota_plan_id: planId, cuota_numero: cuotaNumero } = movimientoPropio[0];
    if (alcance === "cuotas_restantes") {
      if (!planId) {
        return res.status(400).json({ ok: false, error: "Este gasto no forma parte de una compra en cuotas." });
      }
      const restantes = await sql`
        SELECT movimiento_id
        FROM movimientos
        WHERE cuota_plan_id = ${planId}
          AND cuota_numero >= ${cuotaNumero}
          AND usuario_id = ${user.usuarioId}
          AND workspace_id = ${workspaceId}
          AND tipo_movimiento = 'GASTO' AND activo = true
        ORDER BY cuota_numero;
      `;
      ids = restantes.map((fila) => fila.movimiento_id);
    }

    const queries = [];
    // Serialize with conversion to savings; archived sources must remain intact.
    queries.push(sql`
      SELECT movimiento_id FROM movimientos
      WHERE movimiento_id = ANY(${ids}) AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId} AND tipo_movimiento = 'GASTO' AND activo = true
      FOR UPDATE;
    `);
    queries.push(sql`
      DELETE FROM movimiento_etiquetas
      WHERE movimiento_id = ANY(${ids})
        AND movimiento_id IN (
          SELECT movimiento_id
          FROM movimientos
          WHERE usuario_id = ${user.usuarioId}
            AND workspace_id = ${workspaceId}
            AND tipo_movimiento = 'GASTO' AND activo = true
        );
    `);

    queries.push(sql`
      DELETE FROM detalle_movimiento
      WHERE movimiento_id = ANY(${ids})
        AND movimiento_id IN (
          SELECT movimiento_id
          FROM movimientos
          WHERE usuario_id = ${user.usuarioId}
            AND workspace_id = ${workspaceId}
            AND tipo_movimiento = 'GASTO' AND activo = true
        );
    `);

    queries.push(sql`
      DELETE FROM movimientos
      WHERE movimiento_id = ANY(${ids})
        AND usuario_id = ${user.usuarioId}
        AND workspace_id = ${workspaceId}
        AND tipo_movimiento = 'GASTO' AND activo = true;
    `);

    const results = await sql.transaction(queries);
    if (!results[0].length) return res.status(404).json({ok:false,error:"El gasto ya no está disponible. Actualizá los movimientos."});

    return res.status(200).json({
      ok: true,
      data: {
        movimientoId,
        eliminados: ids.length,
      },
    });
  } catch (error) {
    return responderError(res, error, "/api/gastos-delete");
  }
}
