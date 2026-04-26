import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const categorias = await sql`
      SELECT * FROM categorias ORDER BY orden_visual;
    `;

    const formasPago = await sql`
      SELECT * FROM formas_pago ORDER BY orden_visual;
    `;

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
      ORDER BY orden_visual, nombre;
    `;

    return res.status(200).json({
      ok: true,
      data: {
        categorias,
        formasPago,
        servicios,
        fuentesIngreso,
        parametros,
        mediosPago,
        instrumentosPago,
        categoriasGasto,
        etiquetas,
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
