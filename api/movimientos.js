import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const periodo = req.query.periodo || null;

    let movimientos;

    if (periodo) {
      movimientos = await sql`
        SELECT
          movimiento_id,
          tipo_movimiento,
          subtipo_movimiento,
          fecha_operacion,
          periodo,
          dia,
          categoria_id,
          forma_pago_id,
          servicio_id,
          concepto_manual,
          fuente_ingreso_id,
          monto,
          moneda,
          estado,
          vencimiento,
          observacion,
          es_recurrente,
          activo,
          created_at,
          updated_at
        FROM movimientos
        WHERE activo = true
          AND periodo = ${periodo}
        ORDER BY
          tipo_movimiento,
          dia,
          created_at;
      `;
    } else {
      movimientos = await sql`
        SELECT
          movimiento_id,
          tipo_movimiento,
          subtipo_movimiento,
          fecha_operacion,
          periodo,
          dia,
          categoria_id,
          forma_pago_id,
          servicio_id,
          concepto_manual,
          fuente_ingreso_id,
          monto,
          moneda,
          estado,
          vencimiento,
          observacion,
          es_recurrente,
          activo,
          created_at,
          updated_at
        FROM movimientos
        WHERE activo = true
        ORDER BY
          periodo,
          tipo_movimiento,
          dia,
          created_at;
      `;
    }

    const movimientoIds = movimientos.map((m) => m.movimiento_id);

  let detalles = [];

if (movimientoIds.length > 0) {
  detalles = await sql`
    SELECT
      detalle_id,
      movimiento_id,
      nombre_item,
      monto,
      moneda,
      tipo_cambio,
      monto_ars_calculado,
      orden,
      observacion,
      activo,
      created_at,
      updated_at
    FROM detalle_movimiento
    WHERE activo = true
      AND movimiento_id = ANY(${movimientoIds})
    ORDER BY movimiento_id, orden, created_at;
  `;
}

    return res.status(200).json({
  ok: true,
  data: {
    periodo,
    movimientos,
    detalles,
  },
});
  } catch (error) {
    console.error("Error en /api/movimientos:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}