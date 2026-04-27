import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const workspaceId = req.query.workspaceId || req.query.workspace_id || "ws_default";

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

    const mediosPago = await sql`
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
        AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
      ORDER BY orden_visual, nombre;
    `;

    const instrumentosPago = await sql`
      SELECT
        instrumento_id,
        workspace_id,
        nombre,
        tipo,
        orden_visual,
        activo
      FROM instrumentos_pago
      WHERE activo = true
        AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
      ORDER BY orden_visual, nombre;
    `;

    const categoriasGasto = await sql`
      SELECT
        categoria_gasto_id,
        workspace_id,
        nombre,
        color,
        orden_visual,
        activo
      FROM categorias_gasto
      WHERE activo = true
        AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
      ORDER BY orden_visual, nombre;
    `;

    const etiquetas = await sql`
      SELECT
        etiqueta_id,
        workspace_id,
        nombre,
        color,
        orden_visual,
        activo
      FROM etiquetas
      WHERE activo = true
        AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
      ORDER BY orden_visual, nombre;
    `;

    const conceptos = await sql`
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
        AND workspace_id = ${workspaceId}
      ORDER BY nombre;
    `;

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
        AND c.workspace_id = ${workspaceId}
        AND e.activo = true
      ORDER BY ce.concepto_id, e.orden_visual, e.nombre;
    `;

    return res.status(200).json({
      ok: true,
      data: {
        workspaceId,
        categorias,
        formasPago,
        servicios,
        fuentesIngreso,
        parametros,
        mediosPago,
        instrumentosPago,
        categoriasGasto,
        etiquetas,
        conceptos,
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