import { neon } from "@neondatabase/serverless";
import { requireAuth } from "./_auth.js";

function generarId(prefijo = "mov") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;
    const body = req.body || {};

    const { periodo, monto } = body;

    if (!periodo || !monto) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    // Ver si ya existe sueldo para ese período
    const existente = await sql`
      SELECT movimiento_id
      FROM movimientos
      WHERE periodo = ${periodo}
        AND tipo_movimiento = 'INGRESO'
        AND subtipo_movimiento = 'SUELDO'
        AND usuario_id = ${user.usuarioId}
        AND activo = true
      LIMIT 1;
    `;

    if (existente.length > 0) {
      await sql`
        UPDATE movimientos
        SET
          monto = ${Number(monto)},
          updated_at = NOW()
        WHERE movimiento_id = ${existente[0].movimiento_id}
          AND usuario_id = ${user.usuarioId};
      `;

      return res.status(200).json({
        ok: true,
        data: {
          movimiento_id: existente[0].movimiento_id,
          updated: true,
        },
      });
    }

    const movimientoId = generarId("mov");
    const fechaOperacion = `${periodo}-01`;

    await sql`
      INSERT INTO movimientos (
        movimiento_id,
        tipo_movimiento,
        subtipo_movimiento,
        fecha_operacion,
        periodo,
        dia,
        categoria_id,
        forma_pago_id,
        servicio_id,
        fuente_ingreso_id,
        usuario_id,
        usuario_id_creador,
        workspace_id,
        monto,
        moneda,
        estado,
        vencimiento,
        observacion,
        es_recurrente,
        activo
      ) VALUES (
        ${movimientoId},
        'INGRESO',
        'SUELDO',
        ${fechaOperacion},
        ${periodo},
        1,
        ${null},
        ${null},
        ${null},
        ${null},
        ${user.usuarioId},
        ${user.usuarioId},
        ${user.workspaceId || "ws_default"},
        ${Number(monto)},
        'ARS',
        'pagado',
        ${null},
        'Sueldo mensual',
        false,
        true
      );
    `;

    return res.status(200).json({
      ok: true,
      data: {
        movimiento_id: movimientoId,
        updated: false,
      },
    });
  } catch (error) {
    console.error("Error en /api/sueldo:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}