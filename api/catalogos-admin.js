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

function normalizarListaIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function colorDefault(tipo = "otro") {
  const map = {
    banco: "#60a5fa",
    billetera: "#a78bfa",
    efectivo: "#94a3b8",
    tarjeta: "#f87171",
    cuenta: "#4ade80",
    otro: "#64748b",
  };

  return map[tipo] || "#94a3b8";
}

function generarId(recurso, nombre) {
  const slug = slugify(nombre) || Math.random().toString(36).slice(2, 10);

  const prefijos = {
    concepto: "con",
    medio_pago: "mp",
    categoria_gasto: "cg",
    etiqueta: "tag",
  };

  return `${prefijos[recurso] || "cat"}_${slug}`;
}

async function generarIdUnico(sql, tabla, campoId, idBase) {
  let id = idBase;
  let intento = 1;

  while (true) {
    const rows = await sql(
      `SELECT ${campoId} AS id FROM ${tabla} WHERE ${campoId} = $1 LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return id;

    intento += 1;
    id = `${idBase}_${intento}`;
  }
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

async function crearConcepto(sql, body) {
  const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
  const nombre = normalizarTexto(body.nombre);
  const tipoMovimiento = body.tipoMovimiento || body.tipo_movimiento || "GASTO";

  if (!nombre) throw new Error("Falta nombre del concepto");

  const existente = await sql`
    SELECT *
    FROM conceptos
    WHERE workspace_id = ${workspaceId}
      AND tipo_movimiento = ${tipoMovimiento}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
    LIMIT 1;
  `;

  if (existente.length > 0) {
    return { data: existente[0], alreadyExists: true };
  }

  const idBase =
    body.conceptoId ||
    body.concepto_id ||
    generarId("concepto", nombre);

  const conceptoId = await generarIdUnico(
    sql,
    "conceptos",
    "concepto_id",
    idBase
  );

  const categoriaGastoId =
    body.categoriaGastoId || body.categoria_gasto_id || "cg_otros";

  const medioPagoId =
    body.medioPagoId || body.medio_pago_id || "mp_sin_definir";

  const instrumentoId =
    body.instrumentoId || body.instrumento_id || "ins_manual";

  const monedaDefault = String(
    body.monedaDefault || body.moneda_default || "ARS"
  )
    .trim()
    .toUpperCase();

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
    RETURNING *;
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

  return { data: inserted[0], alreadyExists: false };
}

async function actualizarConcepto(sql, body) {
  const conceptoId = body.conceptoId || body.concepto_id;
  if (!conceptoId) throw new Error("Falta conceptoId");

  const actual = await sql`
    SELECT *
    FROM conceptos
    WHERE concepto_id = ${conceptoId}
    LIMIT 1;
  `;

  if (actual.length === 0) throw new Error("Concepto no encontrado");

  const nombre = normalizarTexto(body.nombre);
  if (!nombre) throw new Error("Falta nombre del concepto");

  const workspaceId =
    body.workspaceId || body.workspace_id || actual[0].workspace_id;

  const tipoMovimiento =
    body.tipoMovimiento || body.tipo_movimiento || actual[0].tipo_movimiento;

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
    const err = new Error("Ya existe otro concepto con ese nombre");
    err.statusCode = 409;
    throw err;
  }

  const categoriaGastoId =
    body.categoriaGastoId ||
    body.categoria_gasto_id ||
    actual[0].categoria_gasto_id ||
    "cg_otros";

  const medioPagoId =
    body.medioPagoId ||
    body.medio_pago_id ||
    actual[0].medio_pago_id ||
    "mp_sin_definir";

  const instrumentoId =
    body.instrumentoId ||
    body.instrumento_id ||
    actual[0].instrumento_id ||
    "ins_manual";

  const monedaDefault = String(
    body.monedaDefault || body.moneda_default || actual[0].moneda_default || "ARS"
  )
    .trim()
    .toUpperCase();

  const activo =
    body.activo === undefined || body.activo === null
      ? actual[0].activo
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
    RETURNING *;
  `;

  const etiquetasIds = normalizarListaIds(
    body.etiquetasIds || body.etiquetas_ids || body.etiquetas
  );

  await reemplazarEtiquetasConcepto(sql, conceptoId, etiquetasIds);

  return { data: updated[0] };
}

async function desactivarConcepto(sql, body) {
  const conceptoId = body.conceptoId || body.concepto_id;
  if (!conceptoId) throw new Error("Falta conceptoId");

  const updated = await sql`
    UPDATE conceptos
    SET activo = false, updated_at = NOW()
    WHERE concepto_id = ${conceptoId}
    RETURNING *;
  `;

  if (updated.length === 0) throw new Error("Concepto no encontrado");

  return { data: updated[0] };
}

async function crearMedioPago(sql, body) {
  const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
  const nombre = normalizarTexto(body.nombre);
  const tipo = normalizarTexto(body.tipo || "banco").toLowerCase();
  const color = body.color || colorDefault(tipo);

  if (!nombre) throw new Error("Falta nombre del medio de pago");

  const existente = await sql`
    SELECT *
    FROM medios_pago
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
    LIMIT 1;
  `;

  if (existente.length > 0) {
    return { data: existente[0], alreadyExists: true };
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

  const idBase =
    body.medioPagoId ||
    body.medio_pago_id ||
    generarId("medio_pago", nombre);

  const medioPagoId = await generarIdUnico(
    sql,
    "medios_pago",
    "medio_pago_id",
    idBase
  );

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
    RETURNING *;
  `;

  return { data: inserted[0], alreadyExists: false };
}

async function actualizarMedioPago(sql, body) {
  const medioPagoId = body.medioPagoId || body.medio_pago_id;
  if (!medioPagoId) throw new Error("Falta medioPagoId");

  const actual = await sql`
    SELECT *
    FROM medios_pago
    WHERE medio_pago_id = ${medioPagoId}
    LIMIT 1;
  `;

  if (actual.length === 0) throw new Error("Medio de pago no encontrado");

  const workspaceId =
    body.workspaceId || body.workspace_id || actual[0].workspace_id;

  const nombre = normalizarTexto(body.nombre);
  if (!nombre) throw new Error("Falta nombre del medio de pago");

  const duplicado = await sql`
    SELECT medio_pago_id
    FROM medios_pago
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
      AND medio_pago_id <> ${medioPagoId}
    LIMIT 1;
  `;

  if (duplicado.length > 0) {
    const err = new Error("Ya existe otro medio de pago con ese nombre");
    err.statusCode = 409;
    throw err;
  }

  const tipo = normalizarTexto(body.tipo || actual[0].tipo || "otro").toLowerCase();
  const color = body.color || actual[0].color || colorDefault(tipo);

  const ordenVisual =
    body.ordenVisual ||
    body.orden_visual ||
    actual[0].orden_visual ||
    99;

  const activo =
    body.activo === undefined || body.activo === null
      ? actual[0].activo
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
    RETURNING *;
  `;

  return { data: updated[0] };
}

async function desactivarMedioPago(sql, body) {
  const medioPagoId = body.medioPagoId || body.medio_pago_id;
  if (!medioPagoId) throw new Error("Falta medioPagoId");

  const updated = await sql`
    UPDATE medios_pago
    SET activo = false, updated_at = NOW()
    WHERE medio_pago_id = ${medioPagoId}
    RETURNING *;
  `;

  if (updated.length === 0) throw new Error("Medio de pago no encontrado");

  return { data: updated[0] };
}

async function crearCategoriaGasto(sql, body) {
  const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
  const nombre = normalizarTexto(body.nombre);
  const color = body.color || "#94a3b8";

  if (!nombre) throw new Error("Falta nombre de la categoría");

  const existente = await sql`
    SELECT *
    FROM categorias_gasto
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
    LIMIT 1;
  `;

  if (existente.length > 0) {
    return { data: existente[0], alreadyExists: true };
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

  const idBase =
    body.categoriaGastoId ||
    body.categoria_gasto_id ||
    generarId("categoria_gasto", nombre);

  const categoriaGastoId = await generarIdUnico(
    sql,
    "categorias_gasto",
    "categoria_gasto_id",
    idBase
  );

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
    RETURNING *;
  `;

  return { data: inserted[0], alreadyExists: false };
}

async function actualizarCategoriaGasto(sql, body) {
  const categoriaGastoId = body.categoriaGastoId || body.categoria_gasto_id;
  if (!categoriaGastoId) throw new Error("Falta categoriaGastoId");

  const actual = await sql`
    SELECT *
    FROM categorias_gasto
    WHERE categoria_gasto_id = ${categoriaGastoId}
    LIMIT 1;
  `;

  if (actual.length === 0) throw new Error("Categoría no encontrada");

  const workspaceId =
    body.workspaceId || body.workspace_id || actual[0].workspace_id;

  const nombre = normalizarTexto(body.nombre);
  if (!nombre) throw new Error("Falta nombre de la categoría");

  const duplicado = await sql`
    SELECT categoria_gasto_id
    FROM categorias_gasto
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
      AND categoria_gasto_id <> ${categoriaGastoId}
    LIMIT 1;
  `;

  if (duplicado.length > 0) {
    const err = new Error("Ya existe otra categoría con ese nombre");
    err.statusCode = 409;
    throw err;
  }

  const color = body.color || actual[0].color || "#94a3b8";

  const ordenVisual =
    body.ordenVisual ||
    body.orden_visual ||
    actual[0].orden_visual ||
    99;

  const activo =
    body.activo === undefined || body.activo === null
      ? actual[0].activo
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
    RETURNING *;
  `;

  return { data: updated[0] };
}

async function desactivarCategoriaGasto(sql, body) {
  const categoriaGastoId = body.categoriaGastoId || body.categoria_gasto_id;
  if (!categoriaGastoId) throw new Error("Falta categoriaGastoId");

  const updated = await sql`
    UPDATE categorias_gasto
    SET activo = false, updated_at = NOW()
    WHERE categoria_gasto_id = ${categoriaGastoId}
    RETURNING *;
  `;

  if (updated.length === 0) throw new Error("Categoría no encontrada");

  return { data: updated[0] };
}

async function crearEtiqueta(sql, body) {
  const workspaceId = body.workspaceId || body.workspace_id || "ws_default";
  const nombre = normalizarTexto(body.nombre);
  const color = body.color || "#94a3b8";

  if (!nombre) throw new Error("Falta nombre de la etiqueta");

  const existente = await sql`
    SELECT *
    FROM etiquetas
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
    LIMIT 1;
  `;

  if (existente.length > 0) {
    return { data: existente[0], alreadyExists: true };
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

  const idBase =
    body.etiquetaId ||
    body.etiqueta_id ||
    generarId("etiqueta", nombre);

  const etiquetaId = await generarIdUnico(
    sql,
    "etiquetas",
    "etiqueta_id",
    idBase
  );

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
    RETURNING *;
  `;

  return { data: inserted[0], alreadyExists: false };
}

async function actualizarEtiqueta(sql, body) {
  const etiquetaId = body.etiquetaId || body.etiqueta_id;
  if (!etiquetaId) throw new Error("Falta etiquetaId");

  const actual = await sql`
    SELECT *
    FROM etiquetas
    WHERE etiqueta_id = ${etiquetaId}
    LIMIT 1;
  `;

  if (actual.length === 0) throw new Error("Etiqueta no encontrada");

  const workspaceId =
    body.workspaceId || body.workspace_id || actual[0].workspace_id;

  const nombre = normalizarTexto(body.nombre);
  if (!nombre) throw new Error("Falta nombre de la etiqueta");

  const duplicado = await sql`
    SELECT etiqueta_id
    FROM etiquetas
    WHERE workspace_id = ${workspaceId}
      AND LOWER(TRIM(nombre)) = LOWER(TRIM(${nombre}))
      AND etiqueta_id <> ${etiquetaId}
    LIMIT 1;
  `;

  if (duplicado.length > 0) {
    const err = new Error("Ya existe otra etiqueta con ese nombre");
    err.statusCode = 409;
    throw err;
  }

  const color = body.color || actual[0].color || "#94a3b8";

  const ordenVisual =
    body.ordenVisual ||
    body.orden_visual ||
    actual[0].orden_visual ||
    99;

  const activo =
    body.activo === undefined || body.activo === null
      ? actual[0].activo
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
    RETURNING *;
  `;

  return { data: updated[0] };
}

async function desactivarEtiqueta(sql, body) {
  const etiquetaId = body.etiquetaId || body.etiqueta_id;
  if (!etiquetaId) throw new Error("Falta etiquetaId");

  const updated = await sql`
    UPDATE etiquetas
    SET activo = false, updated_at = NOW()
    WHERE etiqueta_id = ${etiquetaId}
    RETURNING *;
  `;

  if (updated.length === 0) throw new Error("Etiqueta no encontrada");

  return { data: updated[0] };
}

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = req.body || {};
    const recurso = body.recurso || req.query.recurso;

    if (!recurso) {
      return res.status(400).json({
        ok: false,
        error: "Falta recurso",
      });
    }

    let result;

    if (recurso === "concepto") {
      if (req.method === "POST") result = await crearConcepto(sql, body);
      else if (req.method === "PUT") result = await actualizarConcepto(sql, body);
      else if (req.method === "DELETE") result = await desactivarConcepto(sql, body);
    }

    if (recurso === "medio_pago") {
      if (req.method === "POST") result = await crearMedioPago(sql, body);
      else if (req.method === "PUT") result = await actualizarMedioPago(sql, body);
      else if (req.method === "DELETE") result = await desactivarMedioPago(sql, body);
    }

    if (recurso === "categoria_gasto") {
      if (req.method === "POST") result = await crearCategoriaGasto(sql, body);
      else if (req.method === "PUT") result = await actualizarCategoriaGasto(sql, body);
      else if (req.method === "DELETE") result = await desactivarCategoriaGasto(sql, body);
    }

    if (recurso === "etiqueta") {
      if (req.method === "POST") result = await crearEtiqueta(sql, body);
      else if (req.method === "PUT") result = await actualizarEtiqueta(sql, body);
      else if (req.method === "DELETE") result = await desactivarEtiqueta(sql, body);
    }

    if (!result) {
      return res.status(405).json({
        ok: false,
        error: "Método o recurso no permitido",
      });
    }

    return res.status(200).json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Error en /api/catalogos-admin:", error);

    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}