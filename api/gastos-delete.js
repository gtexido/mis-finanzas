import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { movimientoId } = req.body || {};

    if (!movimientoId) {
      return res.status(400).json({
        ok: false,
        error: "Falta movimientoId",
      });
    }

    await sql`
      DELETE FROM subconceptos_usd
      WHERE movimiento_id = ${movimientoId};
    `;

    await sql`
      DELETE FROM movimientos
      WHERE movimiento_id = ${movimientoId};
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