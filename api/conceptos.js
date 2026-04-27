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

function generarConceptoId(nombre) {
  const slug = slugify(nombre) || Math.random().toString(36).slice(2, 10);
  return `con_${slug}`;
}

function normalizarListaIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

async function obtenerConcepto(sql, conceptoId) {
  const result = await sql`
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
    WHERE concepto_id = ${conceptoId}
    LIMIT 1;
  `;

  return result[0] || null;
}

async function reemplazarEtiquetasConcepto(sql, conceptoId, etiquetasIds = []) {
  await sql`
    DELETE FROM concepto_etiquetas
    WHERE concepto_id = ${conceptoId};
  `;

  for (const etiquetaId of etiquetasIds) {
    await sql`
      INSERT INTO concepto_etiquetas (
        concepto_id,
        etiqueta_id
      ) VALUES (
        ${conceptoId},
        ${etiquetaId}
      )
      ON CONFLICT (concepto_id, etiqueta_id) DO NOTHING;
    `;
  }
}

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = req.body || {};

    if (req.method === "POST") {
      const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
      const nombre = normalizarTexto(body.nombre);
      const tipoMovimiento = body.tipoMovimiento || body.tipo_movimiento || "GASTO";

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre del concepto",
        });
      }

      const existente = await sql`
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
        WHERE workspace_id = ${workspaceId}
          AND tipo_movimiento = ${tipoMovimiento}
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

      const conceptoIdBase = body.conceptoId || body.concepto_id || generarConceptoId(nombre);

      let conceptoId = conceptoIdBase;
      let intento = 1;

      while (true) {
        const existeId = await sql`
          SELECT concepto_id
          FROM conceptos
          WHERE concepto_id = ${conceptoId}
          LIMIT 1;
        `;

        if (existeId.length === 0) break;

        intento += 1;
        conceptoId = `${conceptoIdBase}_${intento}`;
      }

      const categoriaGastoId =
        body.categoriaGastoId || body.categoria_gasto_id || "cg_otros";

      const medioPagoId =
        body.medioPagoId || body.medio_pago_id || "mp_sin_definir";

      const instrumentoId =
        body.instrumentoId || body.instrumento_id || "ins_manual";

      const monedaDefault = String(
        body.monedaDefault || body.moneda_default || "ARS"
      ).trim().toUpperCase();

      const etiquetasIds = normalizarListaIds(
        body.etiquetasIds || body.etiquetas_ids || body.etiquetas
      );

      const inserted = await sql`
        INSERT INTO conceptos (
          concepto_id,
          workspace_id,
          nombre,
          tipo_movimiento,
          categoria_gasto_id,
          medio_pago_id,
          instrumento_id,
          moneda_default,
          activo
        ) VALUES (
          ${conceptoId},
          ${workspaceId},
          ${nombre},
          ${tipoMovimiento},
          ${categoriaGastoId},
          ${medioPagoId},
          ${instrumentoId},
          ${monedaDefault},
          true
        )
        RETURNING
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
          updated_at;
      `;

      for (const etiquetaId of etiquetasIds) {
        await sql`
          INSERT INTO concepto_etiquetas (
            concepto_id,
            etiqueta_id
          ) VALUES (
            ${conceptoId},
            ${etiquetaId}
          )
          ON CONFLICT (concepto_id, etiqueta_id) DO NOTHING;
        `;
      }

      return res.status(200).json({
        ok: true,
        data: inserted[0],
        alreadyExists: false,
      });
    }

    if (req.method === "PUT") {
      const conceptoId = body.conceptoId || body.concepto_id;

      if (!conceptoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta conceptoId",
        });
      }

      const nombre = normalizarTexto(body.nombre);

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre del concepto",
        });
      }

      const conceptoActual = await obtenerConcepto(sql, conceptoId);

      if (!conceptoActual) {
        return res.status(404).json({
          ok: false,
          error: "Concepto no encontrado",
        });
      }

      const workspaceId = body.workspaceId || body.workspace_id || conceptoActual.workspace_id;
      const tipoMovimiento = body.tipoMovimiento || body.tipo_movimiento || conceptoActual.tipo_movimiento;

      const duplicado = await sql`
        SELECT concepto_id
        FROM conceptos
        WHERE workspace_id = ${workspaceId}
          AND tipo_movimiento = ${tipoMovimiento}
          AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
          AND concepto_id <> ${conceptoId}
        LIMIT 1;
      `;

      if (duplicado.length > 0) {
        return res.status(409).json({
          ok: false,
          error: "Ya existe otro concepto con ese nombre",
        });
      }

      const categoriaGastoId =
        body.categoriaGastoId ||
        body.categoria_gasto_id ||
        conceptoActual.categoria_gasto_id ||
        "cg_otros";

      const medioPagoId =
        body.medioPagoId ||
        body.medio_pago_id ||
        conceptoActual.medio_pago_id ||
        "mp_sin_definir";

      const instrumentoId =
        body.instrumentoId ||
        body.instrumento_id ||
        conceptoActual.instrumento_id ||
        "ins_manual";

      const monedaDefault = String(
        body.monedaDefault ||
          body.moneda_default ||
          conceptoActual.moneda_default ||
          "ARS"
      ).trim().toUpperCase();

      const activo =
        body.activo === undefined || body.activo === null
          ? conceptoActual.activo
          : !!body.activo;

      const updated = await sql`
        UPDATE conceptos
        SET
          nombre = ${nombre},
          tipo_movimiento = ${tipoMovimiento},
          categoria_gasto_id = ${categoriaGastoId},
          medio_pago_id = ${medioPagoId},
          instrumento_id = ${instrumentoId},
          moneda_default = ${monedaDefault},
          activo = ${activo},
          updated_at = NOW()
        WHERE concepto_id = ${conceptoId}
        RETURNING
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
          updated_at;
      `;

      const etiquetasIds = normalizarListaIds(
        body.etiquetasIds || body.etiquetas_ids || body.etiquetas
      );

      await reemplazarEtiquetasConcepto(sql, conceptoId, etiquetasIds);

      return res.status(200).json({
        ok: true,
        data: updated[0],
      });
    }

    if (req.method === "DELETE") {
      const conceptoId = body.conceptoId || body.concepto_id || req.query.conceptoId;

      if (!conceptoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta conceptoId",
        });
      }

      const updated = await sql`
        UPDATE conceptos
        SET
          activo = false,
          updated_at = NOW()
        WHERE concepto_id = ${conceptoId}
        RETURNING
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
          updated_at;
      `;

      if (updated.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "Concepto no encontrado",
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
    console.error("Error en /api/conceptos:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}