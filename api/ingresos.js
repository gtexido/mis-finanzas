import { neon } from "@neondatabase/serverless";

function generarId(prefijo = "mov") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

function mapFuenteIngresoId(fuente) {
  const map = {
    "Vane": "fi_vane",
    "Anses": "fi_anses",
    "Descartables V&G": "fi_descartables_vg",
  };
  return map[fuente] || null;
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
    const body = req.body || {};

    const { periodo, dia, fuente, monto } = body;

    if (!periodo || !fuente || !monto) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    const movimientoId = generarId("mov");
    const fechaOperacion = `${periodo}-${String(dia || 1).padStart(2, "0")}`;
    const fuenteIngresoId = mapFuenteIngresoId(fuente);

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
        'INGRESO_EXTRA',
        ${fechaOperacion},
        ${periodo},
        ${Number(dia || 1)},
        ${null},
        ${null},
        ${null},
        ${fuenteIngresoId},
        ${Number(monto)},
        'ARS',
        'pagado',
        ${null},
        ${null},
        false,
        true
      );
    `;

    return res.status(200).json({
      ok: true,
      data: {
        movimiento_id: movimientoId,
      },
    });
  } catch (error) {
    console.error("Error en /api/ingresos:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}