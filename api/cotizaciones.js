import { neon } from "@neondatabase/serverless";

function generarId(prefijo = "cot") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

function normalizarFecha(fecha) {
  if (!fecha) return null;
  return String(fecha).slice(0, 10);
}

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === "GET") {
      const {
        fecha,
        tipo = "tarjeta",
        monedaOrigen = "USD",
        monedaDestino = "ARS",
      } = req.query || {};

      if (!fecha) {
        return res.status(400).json({
          ok: false,
          error: "La fecha es obligatoria",
        });
      }

      const fechaNormalizada = normalizarFecha(fecha);

      const rows = await sql`
        SELECT
          cotizacion_id,
          fecha,
          moneda_origen,
          moneda_destino,
          tipo,
          valor,
          fuente,
          created_at,
          updated_at
        FROM cotizaciones
        WHERE fecha = ${fechaNormalizada}
          AND moneda_origen = ${monedaOrigen}
          AND moneda_destino = ${monedaDestino}
          AND tipo = ${tipo}
        LIMIT 1;
      `;

      return res.status(200).json({
        ok: true,
        data: rows[0] || null,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const {
        fecha,
        tipo = "tarjeta",
        monedaOrigen = "USD",
        monedaDestino = "ARS",
        valor,
        fuente = "manual",
      } = body;

      if (!fecha || valor === null || valor === undefined || valor === "") {
        return res.status(400).json({
          ok: false,
          error: "Fecha y valor son obligatorios",
        });
      }

      const fechaNormalizada = normalizarFecha(fecha);
      const cotizacionId = generarId("cot");

      const rows = await sql`
        INSERT INTO cotizaciones (
          cotizacion_id,
          fecha,
          moneda_origen,
          moneda_destino,
          tipo,
          valor,
          fuente,
          created_at,
          updated_at
        ) VALUES (
          ${cotizacionId},
          ${fechaNormalizada},
          ${monedaOrigen},
          ${monedaDestino},
          ${tipo},
          ${Number(valor)},
          ${fuente},
          NOW(),
          NOW()
        )
        ON CONFLICT (fecha, moneda_origen, moneda_destino, tipo)
        DO UPDATE SET
          valor = EXCLUDED.valor,
          fuente = EXCLUDED.fuente,
          updated_at = NOW()
        RETURNING
          cotizacion_id,
          fecha,
          moneda_origen,
          moneda_destino,
          tipo,
          valor,
          fuente,
          created_at,
          updated_at;
      `;

      return res.status(200).json({
        ok: true,
        data: rows[0],
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  } catch (error) {
    console.error("Error en /api/cotizaciones:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}