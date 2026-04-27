import { neon } from "@neondatabase/serverless";

function normalizarTexto(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizarTexto(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function generarMedioPagoId(nombre) {
  const slug = slugify(nombre) || Math.random().toString(36).slice(2, 10);
  return `mp_${slug}`;
}

function colorPorTipo(tipo) {
  const map = {
    banco: "#60a5fa",
    billetera: "#a78bfa",
    efectivo: "#94a3b8",
    tarjeta: "#f87171",
    cuenta: "#4ade80",
    otro: "#64748b",
  };

  return map[tipo] || map.otro;
}

async function obtenerMedioPago(sql, medioPagoId) {
  const result = await sql`
    SELECT
      medio_pago_id,
      workspace_id,
      nombre,
      tipo,
      color,
      orden_visual,
      activo,
      created_at,
      updated_at
    FROM medios_pago
    WHERE medio_pago_id = ${medioPagoId}
    LIMIT 1;
  `;

  return result[0] || null;
}

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = req.body || {};

    if (req.method === "POST") {
      const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
      const nombre = normalizarTexto(body.nombre);
      const tipo = normalizarTexto(body.tipo || "banco").toLowerCase();
      const color = body.color || colorPorTipo(tipo);

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre del medio de pago",
        });
      }

      const existente = await sql`
        SELECT
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at
        FROM medios_pago
        WHERE workspace_id = ${workspaceId}
          AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
        LIMIT 1;
      `;

      if (existente.length > 0) {
        return res.status(200).json({
          ok: true,
          data: existente[0],
          alreadyExists: true,
        });
      }

      const maxOrden = await sql`
        SELECT COALESCE(MAX(orden_visual), 0) + 1 AS nuevo_orden
        FROM medios_pago
        WHERE workspace_id = ${workspaceId};
      `;

      const ordenVisual =
        body.ordenVisual ||
        body.orden_visual ||
        Number(maxOrden[0]?.nuevo_orden || 1);

      const medioPagoIdBase =
        body.medioPagoId || body.medio_pago_id || generarMedioPagoId(nombre);

      let medioPagoId = medioPagoIdBase;
      let intento = 1;

      while (true) {
        const existeId = await sql`
          SELECT medio_pago_id
          FROM medios_pago
          WHERE medio_pago_id = ${medioPagoId}
          LIMIT 1;
        `;

        if (existeId.length === 0) break;

        intento += 1;
        medioPagoId = `${medioPagoIdBase}_${intento}`;
      }

      const inserted = await sql`
        INSERT INTO medios_pago (
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo
        ) VALUES (
          ${medioPagoId},
          ${workspaceId},
          ${nombre},
          ${tipo},
          ${color},
          ${Number(ordenVisual)},
          true
        )
        RETURNING
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at;
      `;

      return res.status(200).json({
        ok: true,
        data: inserted[0],
        alreadyExists: false,
      });
    }

    if (req.method === "PUT") {
      const medioPagoId = body.medioPagoId || body.medio_pago_id;

      if (!medioPagoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta medioPagoId",
        });
      }

      const actual = await obtenerMedioPago(sql, medioPagoId);

      if (!actual) {
        return res.status(404).json({
          ok: false,
          error: "Medio de pago no encontrado",
        });
      }

      const workspaceId = body.workspaceId || body.workspace_id || actual.workspace_id;
      const nombre = normalizarTexto(body.nombre);

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre del medio de pago",
        });
      }

      const duplicado = await sql`
        SELECT medio_pago_id
        FROM medios_pago
        WHERE workspace_id = ${workspaceId}
          AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
          AND medio_pago_id <> ${medioPagoId}
        LIMIT 1;
      `;

      if (duplicado.length > 0) {
        return res.status(409).json({
          ok: false,
          error: "Ya existe otro medio de pago con ese nombre",
        });
      }

      const tipo = normalizarTexto(body.tipo || actual.tipo || "otro").toLowerCase();
      const color = body.color || actual.color || colorPorTipo(tipo);
      const ordenVisual =
        body.ordenVisual ||
        body.orden_visual ||
        actual.orden_visual ||
        99;

      const activo =
        body.activo === undefined || body.activo === null
          ? actual.activo
          : !!body.activo;

      const updated = await sql`
        UPDATE medios_pago
        SET
          nombre = ${nombre},
          tipo = ${tipo},
          color = ${color},
          orden_visual = ${Number(ordenVisual)},
          activo = ${activo},
          updated_at = NOW()
        WHERE medio_pago_id = ${medioPagoId}
        RETURNING
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at;
      `;

      return res.status(200).json({
        ok: true,
        data: updated[0],
      });
    }

    if (req.method === "DELETE") {
      const medioPagoId =
        body.medioPagoId || body.medio_pago_id || req.query.medioPagoId;

      if (!medioPagoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta medioPagoId",
        });
      }

      const updated = await sql`
        UPDATE medios_pago
        SET
          activo = false,
          updated_at = NOW()
        WHERE medio_pago_id = ${medioPagoId}
        RETURNING
          medio_pago_id,
          workspace_id,
          nombre,
          tipo,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at;
      `;

      if (updated.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "Medio de pago no encontrado",
        });
      }

      return res.status(200).json({
        ok: true,
        data: updated[0],
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  } catch (error) {
    console.error("Error en /api/medios-pago:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}