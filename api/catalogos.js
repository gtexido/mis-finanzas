import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";

async function usarWorkspaceConFallback(sql, workspaceId, consultaPropia, consultaDefault) {
  const propios = await consultaPropia(workspaceId);
  if (propios.length > 0) return { rows: propios, sourceWorkspaceId: workspaceId };

  const defaults = await consultaDefault();
  return { rows: defaults, sourceWorkspaceId: "ws_default" };
}

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;

    const userWorkspace = await resolveWorkspaceForUser(sql, user);
    const workspaceId = userWorkspace.workspaceId || "ws_default";
    user.workspaceId = workspaceId;
    user.workspaceNombre = userWorkspace.workspaceNombre || user.workspaceNombre;

    const categorias = await sql`
      SELECT * FROM categorias ORDER BY orden_visual;
    `;

    const formasPago = await sql`
      SELECT * FROM formas_pago ORDER BY orden_visual;
    `;

    // Legacy: se mantiene para compatibilidad con pantallas existentes.
    const servicios = await sql`
      SELECT * FROM servicios ORDER BY nombre;
    `;

    const fuentesIngreso = await sql`
      SELECT * FROM fuentes_ingreso ORDER BY orden_visual;
    `;

    const parametros = await sql`
      SELECT
        clave,
        valor,
        descripcion,
        updated_at
      FROM parametros
      ORDER BY clave;
    `;

    const mediosPagoResult = await usarWorkspaceConFallback(
      sql,
      workspaceId,
      (ws) => sql`
        SELECT
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo
        FROM medios_pago
        WHERE activo = true
          AND workspace_id = ${ws}
        ORDER BY orden_visual, nombre;
      `,
      () => sql`
        SELECT
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo
        FROM medios_pago
        WHERE activo = true
          AND (workspace_id = 'ws_default' OR workspace_id IS NULL)
        ORDER BY orden_visual, nombre;
      `
    );

    const instrumentosPagoResult = await usarWorkspaceConFallback(
      sql,
      workspaceId,
      (ws) => sql`
        SELECT
          instrumento_id,
          workspace_id,
          nombre,
          tipo,
          orden_visual,
          activo
        FROM instrumentos_pago
        WHERE activo = true
          AND workspace_id = ${ws}
        ORDER BY orden_visual, nombre;
      `,
      () => sql`
        SELECT
          instrumento_id,
          workspace_id,
          nombre,
          tipo,
          orden_visual,
          activo
        FROM instrumentos_pago
        WHERE activo = true
          AND (workspace_id = 'ws_default' OR workspace_id IS NULL)
        ORDER BY orden_visual, nombre;
      `
    );

    const categoriasGastoResult = await usarWorkspaceConFallback(
      sql,
      workspaceId,
      (ws) => sql`
        SELECT
          categoria_gasto_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        FROM categorias_gasto
        WHERE activo = true
          AND workspace_id = ${ws}
        ORDER BY orden_visual, nombre;
      `,
      () => sql`
        SELECT
          categoria_gasto_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        FROM categorias_gasto
        WHERE activo = true
          AND (workspace_id = 'ws_default' OR workspace_id IS NULL)
        ORDER BY orden_visual, nombre;
      `
    );

    const etiquetasResult = await usarWorkspaceConFallback(
      sql,
      workspaceId,
      (ws) => sql`
        SELECT
          etiqueta_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        FROM etiquetas
        WHERE activo = true
          AND workspace_id = ${ws}
        ORDER BY orden_visual, nombre;
      `,
      () => sql`
        SELECT
          etiqueta_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        FROM etiquetas
        WHERE activo = true
          AND (workspace_id = 'ws_default' OR workspace_id IS NULL)
        ORDER BY orden_visual, nombre;
      `
    );

    const conceptosResult = await usarWorkspaceConFallback(
      sql,
      workspaceId,
      (ws) => sql`
        SELECT
          concepto_id,
          workspace_id,
          nombre,
          tipo_movimiento,
          categoria_gasto_id,
          medio_pago_id,
          instrumento_id,
          moneda_default,
          activo,
          created_at,
          updated_at
        FROM conceptos
        WHERE activo = true
          AND workspace_id = ${ws}
        ORDER BY nombre;
      `,
      () => sql`
        SELECT
          concepto_id,
          workspace_id,
          nombre,
          tipo_movimiento,
          categoria_gasto_id,
          medio_pago_id,
          instrumento_id,
          moneda_default,
          activo,
          created_at,
          updated_at
        FROM conceptos
        WHERE activo = true
          AND workspace_id = 'ws_default'
        ORDER BY nombre;
      `
    );

    const conceptosSourceWorkspaceId = conceptosResult.sourceWorkspaceId;

    const conceptoEtiquetas = await sql`
      SELECT
        ce.concepto_id,
        ce.etiqueta_id,
        e.nombre,
        e.color,
        e.orden_visual
      FROM concepto_etiquetas ce
      JOIN conceptos c
        ON c.concepto_id = ce.concepto_id
      JOIN etiquetas e
        ON e.etiqueta_id = ce.etiqueta_id
      WHERE c.activo = true
        AND c.workspace_id = ${conceptosSourceWorkspaceId}
        AND e.activo = true
      ORDER BY ce.concepto_id, e.orden_visual, e.nombre;
    `;

    return res.status(200).json({
      ok: true,
      data: {
        workspaceId,
        sourceWorkspaceId: conceptosSourceWorkspaceId,
        sourceWorkspaces: {
          mediosPago: mediosPagoResult.sourceWorkspaceId,
          instrumentosPago: instrumentosPagoResult.sourceWorkspaceId,
          categoriasGasto: categoriasGastoResult.sourceWorkspaceId,
          etiquetas: etiquetasResult.sourceWorkspaceId,
          conceptos: conceptosResult.sourceWorkspaceId,
        },
        categorias,
        formasPago,
        servicios,
        fuentesIngreso,
        parametros,
        mediosPago: mediosPagoResult.rows,
        instrumentosPago: instrumentosPagoResult.rows,
        categoriasGasto: categoriasGastoResult.rows,
        etiquetas: etiquetasResult.rows,
        conceptos: conceptosResult.rows,
        conceptoEtiquetas,
      },
    });
  } catch (error) {
    console.error("Error en API catalogos:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
