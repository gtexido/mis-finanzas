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

    return res.status(200).json({
      ok: true,
      data: {
        categorias,
        formasPago,
        servicios,
        fuentesIngreso,
      },
    });
  } catch (error) {
    console.error("Error en API:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}