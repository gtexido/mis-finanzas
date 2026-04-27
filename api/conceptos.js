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
  } catch (error) {
    console.error("Error en /api/conceptos:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}