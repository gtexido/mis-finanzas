import { neon } from "@neondatabase/serverless";
import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;
    const periodo = req.query.periodo || null;

    let movimientos;

    const selectMovimientos = sql`
      SELECT
        m.movimiento_id,
        m.tipo_movimiento,
        m.subtipo_movimiento,
        m.fecha_operacion,
        m.periodo,
        m.dia,

        -- Modelo legacy actual
        m.categoria_id,
        cat.nombre AS categoria_nombre,
        cat.color AS categoria_color,

        m.forma_pago_id,
        fp.nombre AS forma_pago_nombre,

        m.servicio_id,
        s.nombre AS servicio_nombre,

        m.concepto_manual,
        m.fuente_ingreso_id,
        fi.nombre AS fuente_ingreso_nombre,

        -- Modelo nuevo multidimensional
        m.workspace_id,
        m.usuario_id,
        m.usuario_id_creador,

        m.medio_pago_id,
        mp.nombre AS medio_pago_nombre,
        mp.tipo AS medio_pago_tipo,
        mp.color AS medio_pago_color,

        m.instrumento_id,
        ip.nombre AS instrumento_nombre,
        ip.tipo AS instrumento_tipo,

        m.categoria_gasto_id,
        cg.nombre AS categoria_gasto_nombre,
        cg.color AS categoria_gasto_color,

        -- Campos monetarios y estado
        m.monto,
        m.moneda,
        m.estado,
        m.vencimiento,
        m.observacion,
        m.es_recurrente,
        m.activo,
        m.created_at,
        m.updated_at

      FROM movimientos m
      LEFT JOIN categorias cat
        ON cat.categoria_id = m.categoria_id
      LEFT JOIN formas_pago fp
        ON fp.forma_pago_id = m.forma_pago_id
      LEFT JOIN servicios s
        ON s.servicio_id = m.servicio_id
      LEFT JOIN fuentes_ingreso fi
        ON fi.fuente_ingreso_id = m.fuente_ingreso_id

      LEFT JOIN medios_pago mp
        ON mp.medio_pago_id = m.medio_pago_id
      LEFT JOIN instrumentos_pago ip
        ON ip.instrumento_id = m.instrumento_id
      LEFT JOIN categorias_gasto cg
        ON cg.categoria_gasto_id = m.categoria_gasto_id

      WHERE m.activo = true
        AND m.usuario_id = ${user.usuarioId}
    `;

    if (periodo) {
      movimientos = await sql`
        SELECT *
        FROM (${selectMovimientos}) base
        WHERE base.periodo = ${periodo}
        ORDER BY
          base.tipo_movimiento,
          base.dia,
          base.created_at;
      `;
    } else {
      movimientos = await sql`
        SELECT *
        FROM (${selectMovimientos}) base
        ORDER BY
          base.periodo,
          base.tipo_movimiento,
          base.dia,
          base.created_at;
      `;
    }

    const movimientoIds = movimientos.map((m) => m.movimiento_id);

    let detalles = [];
    let etiquetas = [];

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

      etiquetas = await sql`
        SELECT
          me.movimiento_id,
          e.etiqueta_id,
          e.nombre,
          e.color,
          e.orden_visual
        FROM movimiento_etiquetas me
        JOIN etiquetas e
          ON e.etiqueta_id = me.etiqueta_id
        WHERE me.movimiento_id = ANY(${movimientoIds})
          AND e.activo = true
        ORDER BY me.movimiento_id, e.orden_visual, e.nombre;
      `;
    }

    return res.status(200).json({
      ok: true,
      data: {
        periodo,
        movimientos,
        detalles,
        etiquetas,
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