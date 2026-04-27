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

function generarCategoriaGastoId(nombre) {
  const slug = slugify(nombre) || Math.random().toString(36).slice(2, 10);
  return `cg_${slug}`;
}

function colorDefault() {
  return "#94a3b8";
}

async function obtenerCategoria(sql, categoriaGastoId) {
  const result = await sql`
    SELECT
      categoria_gasto_id,
      workspace_id,
      nombre,
      color,
      orden_visual,
      activo,
      created_at,
      updated_at
    FROM categorias_gasto
    WHERE categoria_gasto_id = ${categoriaGastoId}
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
          error: "Falta nombre de la categoría",
        });
      }

      const existente = await sql`
        SELECT
          categoria_gasto_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo,
          created_at,
          updated_at
        FROM categorias_gasto
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
        FROM categorias_gasto
        WHERE workspace_id = ${workspaceId};
      `;

      const ordenVisual =
        body.ordenVisual ||
        body.orden_visual ||
        Number(maxOrden[0]?.nuevo_orden || 1);

      const categoriaGastoIdBase =
        body.categoriaGastoId ||
        body.categoria_gasto_id ||
        generarCategoriaGastoId(nombre);

      let categoriaGastoId = categoriaGastoIdBase;
      let intento = 1;

      while (true) {
        const existeId = await sql`
          SELECT categoria_gasto_id
          FROM categorias_gasto
          WHERE categoria_gasto_id = ${categoriaGastoId}
          LIMIT 1;
        `;

        if (existeId.length === 0) break;

        intento += 1;
        categoriaGastoId = `${categoriaGastoIdBase}_${intento}`;
      }

      const inserted = await sql`
        INSERT INTO categorias_gasto (
          categoria_gasto_id,
          workspace_id,
          nombre,
          color,
          orden_visual,
          activo
        ) VALUES (
          ${categoriaGastoId},
          ${workspaceId},
          ${nombre},
          ${color},
          ${Number(ordenVisual)},
          true
        )
        RETURNING
          categoria_gasto_id,
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
      const categoriaGastoId = body.categoriaGastoId || body.categoria_gasto_id;

      if (!categoriaGastoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta categoriaGastoId",
        });
      }

      const actual = await obtenerCategoria(sql, categoriaGastoId);

      if (!actual) {
        return res.status(404).json({
          ok: false,
          error: "Categoría no encontrada",
        });
      }

      const workspaceId = body.workspaceId || body.workspace_id || actual.workspace_id;
      const nombre = normalizarTexto(body.nombre);

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Falta nombre de la categoría",
        });
      }

      const duplicado = await sql`
        SELECT categoria_gasto_id
        FROM categorias_gasto
        WHERE workspace_id = ${workspaceId}
          AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
          AND categoria_gasto_id <> ${categoriaGastoId}
        LIMIT 1;
      `;

      if (duplicado.length > 0) {
        return res.status(409).json({
          ok: false,
          error: "Ya existe otra categoría con ese nombre",
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
        UPDATE categorias_gasto
        SET
          nombre = ${nombre},
          color = ${color},
          orden_visual = ${Number(ordenVisual)},
          activo = ${activo},
          updated_at = NOW()
        WHERE categoria_gasto_id = ${categoriaGastoId}
        RETURNING
          categoria_gasto_id,
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
      const categoriaGastoId =
        body.categoriaGastoId ||
        body.categoria_gasto_id ||
        req.query.categoriaGastoId;

      if (!categoriaGastoId) {
        return res.status(400).json({
          ok: false,
          error: "Falta categoriaGastoId",
        });
      }

      const updated = await sql`
        UPDATE categorias_gasto
        SET
          activo = false,
          updated_at = NOW()
        WHERE categoria_gasto_id = ${categoriaGastoId}
        RETURNING
          categoria_gasto_id,
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
          error: "Categoría no encontrada",
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
    console.error("Error en /api/categorias-gasto:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}