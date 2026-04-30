import { neon } from "@neondatabase/serverless";
import { createToken, validatePin } from "./_auth.js";

async function getWorkspacePrincipal(sql, usuarioId) {
  const rows = await sql`
    SELECT
      wu.workspace_id,
      w.nombre AS workspace_nombre,
      wu.rol
    FROM workspace_usuarios wu
    JOIN workspaces w
      ON w.workspace_id = wu.workspace_id
    WHERE wu.usuario_id = ${usuarioId}
      AND wu.activo = TRUE
      AND w.activo = TRUE
    ORDER BY
      CASE WHEN wu.rol = 'owner' THEN 0 ELSE 1 END,
      wu.created_at ASC
    LIMIT 1;
  `;

  if (!rows.length) {
    return {
      workspaceId: "ws_default",
      workspaceNombre: "Mis Finanzas",
    };
  }

  return {
    workspaceId: rows[0].workspace_id,
    workspaceNombre: rows[0].workspace_nombre || rows[0].workspace_id,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { usuarioId, pin } = req.body || {};
    const userBase = validatePin(usuarioId, pin);

    if (!userBase) {
      return res.status(401).json({ ok: false, error: "PIN inválido" });
    }

    const workspace = await getWorkspacePrincipal(sql, userBase.usuarioId);
    const user = {
      ...userBase,
      ...workspace,
    };

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
