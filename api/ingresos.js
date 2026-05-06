import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";

function generarId(prefijo = "mov") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

function normalizarTexto(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fuenteVisibleIngreso(fuente) {
  const normalizada = normalizarTexto(fuente);

  const map = {
    hogar: "Hogar",
    ventas: "Ventas",
    venta: "Ventas",
    "trabajo diario": "Trabajo Diario",
    trabajo: "Trabajo Diario",
    diario: "Trabajo Diario",
    otros: "Otros",
    otro: "Otros",

    // Compatibilidad con fuentes históricas.
    vane: "Hogar",
    gustavo: "Otros",
    anses: "Trabajo Diario",
    "descartables v&g": "Ventas",
    "descartables vg": "Ventas",
  };

  return map[normalizada] || String(fuente || "Otros").trim() || "Otros";
}

function fuenteDefaultPorUsuario(usuarioId) {
  const defaults = {
    usr_gustavo: "fi_gustavo",
    usr_vane: "fi_vane",
  };

  return defaults[usuarioId] || "fi_vane";
}

function mapFuenteIngresoId(fuente, usuarioId) {
  const fuenteNormalizada = normalizarTexto(fuente);

  const map = {
    vane: "fi_vane",
    gustavo: "fi_gustavo",
    anses: "fi_anses",
    "descartables v&g": "fi_descartables_vg",
    "descartables vg": "fi_descartables_vg",

    // Las fuentes genéricas se muestran desde concepto_manual.
    // fuente_ingreso_id queda como bucket técnico por usuario para no migrar esquema ahora.
    hogar: fuenteDefaultPorUsuario(usuarioId),
    ventas: fuenteDefaultPorUsuario(usuarioId),
    "trabajo diario": fuenteDefaultPorUsuario(usuarioId),
    otros: fuenteDefaultPorUsuario(usuarioId),
  };

  return map[fuenteNormalizada] || fuenteDefaultPorUsuario(usuarioId);
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

    const { periodo, dia, fuente, monto } = body;

    if (!periodo || !monto) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    const movimientoId = generarId("mov");
    const fechaOperacion = `${periodo}-${String(dia || 1).padStart(2, "0")}`;
    const userWorkspace = await resolveWorkspaceForUser(sql, user);
    const workspaceId = userWorkspace.workspaceId || "ws_default";
    user.workspaceId = workspaceId;
    user.workspaceNombre = userWorkspace.workspaceNombre || user.workspaceNombre;
    const fuenteVisible = fuenteVisibleIngreso(fuente);
    const fuenteIngresoId = mapFuenteIngresoId(fuenteVisible, user.usuarioId);

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
        concepto_manual,
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
        'INGRESO_EXTRA',
        ${fechaOperacion},
        ${periodo},
        ${Number(dia || 1)},
        ${null},
        ${null},
        ${null},
        ${fuenteVisible},
        ${fuenteIngresoId},
        ${user.usuarioId},
        ${user.usuarioId},
        ${workspaceId},
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
        fuente_ingreso_id: fuenteIngresoId,
        workspace_id: workspaceId,
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
