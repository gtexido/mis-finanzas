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

function generarEtiquetaId(nombre) {
  const slug = slugify(nombre) || Math.random().toString(36).slice(2, 10);
  return `tag_${slug}`;
}

function colorDefault() {
  return "#94a3b8";
}

async function obtenerEtiqueta(sql, etiquetaId) {
  const result = await sql`
    SELECT
      etiqueta_id,
      workspace_id,
      nombre,
      color,
      orden_visual,
      activo,
      created_at,
      updated_at
    FROM etiquetas
    WHERE etiqueta_id = ${etiquetaId}
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
      const color = body.color || colorDefault();

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre de la etiqueta",
        });
      }

      const existente = await sql`
        SELECT
          etiqueta_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at
        FROM etiquetas
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
        FROM etiquetas
        WHERE workspace_id = ${workspaceId};
      `;

      const ordenVisual =
        body.ordenVisual ||
        body.orden_visual ||
        Number(maxOrden[0]?.nuevo_orden || 1);

      const etiquetaIdBase =
        body.etiquetaId || body.etiqueta_id || generarEtiquetaId(nombre);

      let etiquetaId = etiquetaIdBase;
      let intento = 1;

      while (true) {
        const existeId = await sql`
          SELECT etiqueta_id
          FROM etiquetas
          WHERE etiqueta_id = ${etiquetaId}
          LIMIT 1;
        `;

        if (existeId.length === 0) break;

        intento += 1;
        etiquetaId = `${etiquetaIdBase}_${intento}`;
      }

      const inserted = await sql`
        INSERT INTO etiquetas (
          etiqueta_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        ) VALUES (
          ${etiquetaId},
          ${workspaceId},
          ${nombre},
          ${color},
          ${Number(ordenVisual)},
          true
        )
        RETURNING
          etiqueta_id,
          workspace_id,
          nombre,
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
      const etiquetaId = body.etiquetaId || body.etiqueta_id;

      if (!etiquetaId) {
        return res.status(400).json({
          ok: false,
          error: "Falta etiquetaId",
        });
      }

      const actual = await obtenerEtiqueta(sql, etiquetaId);

      if (!actual) {
        return res.status(404).json({
          ok: false,
          error: "Etiqueta no encontrada",
        });
      }

      const workspaceId = body.workspaceId || body.workspace_id || actual.workspace_id;
      const nombre = normalizarTexto(body.nombre);

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre de la etiqueta",
        });
      }

      const duplicado = await sql`
        SELECT etiqueta_id
        FROM etiquetas
        WHERE workspace_id = ${workspaceId}
          AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
          AND etiqueta_id <> ${etiquetaId}
        LIMIT 1;
      `;

      if (duplicado.length > 0) {
        return res.status(409).json({
          ok: false,
          error: "Ya existe otra etiqueta con ese nombre",
        });
      }

      const color = body.color || actual.color || colorDefault();

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
        UPDATE etiquetas
        SET
          nombre = ${nombre},
          color = ${color},
          orden_visual = ${Number(ordenVisual)},
          activo = ${activo},
          updated_at = NOW()
        WHERE etiqueta_id = ${etiquetaId}
        RETURNING
          etiqueta_id,
          workspace_id,
          nombre,
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
      const etiquetaId =
        body.etiquetaId ||
        body.etiqueta_id ||
        req.query.etiquetaId;

      if (!etiquetaId) {
        return res.status(400).json({
          ok: false,
          error: "Falta etiquetaId",
        });
      }

      const updated = await sql`
        UPDATE etiquetas
        SET
          activo = false,
          updated_at = NOW()
        WHERE etiqueta_id = ${etiquetaId}
        RETURNING
          etiqueta_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at;
      `;

      if (updated.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "Etiqueta no encontrada",
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
    console.error("Error en /api/etiquetas:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}