import { neon } from "@neondatabase/serverless";
import { requireAuth, resolveWorkspaceForUser } from "./_auth.js";

function generarId(prefijo = "mov") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizarMoneda(moneda) {
  return String(moneda || "ARS").trim().toUpperCase();
}

function normalizarFecha(fecha) {
  if (!fecha) return null;
  return String(fecha).slice(0, 10);
}

function mapCategoriaId(categoria) {
  return categoria ? `cat_${categoria}` : null;
}

function mapFormaPagoId(formaPago) {
  const map = {
    Manual: "fp_manual",
    Tarjeta: "fp_tarjeta",
    "Débito automático": "fp_debito_automatico",
    "Tarjeta Cordobesa": "fp_tarjeta_cordobesa",
  };

  return map[formaPago] || null;
}

function normalizarListaIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

async function obtenerConceptoActivo(sql, workspaceId, conceptoId) {
  if (!conceptoId) return null;

  const rows = await sql`
    SELECT
      concepto_id,
      nombre,
      categoria_gasto_id,
      medio_pago_id,
      instrumento_id,
      moneda_default
    FROM conceptos
    WHERE concepto_id = ${conceptoId}
      AND workspace_id = ${workspaceId}
      AND activo = true
    LIMIT 1;
  `;

  if (rows.length === 0) {
    const err = new Error("Concepto no válido para el usuario actual");
    err.statusCode = 400;
    throw err;
  }

  return rows[0];
}

async function obtenerEtiquetasConcepto(sql, conceptoId) {
  if (!conceptoId) return [];

  const rows = await sql`
    SELECT ce.etiqueta_id
    FROM concepto_etiquetas ce
    JOIN etiquetas e
      ON e.etiqueta_id = ce.etiqueta_id
    WHERE ce.concepto_id = ${conceptoId}
      AND e.activo = true
    ORDER BY e.orden_visual, e.nombre;
  `;

  return rows.map((r) => r.etiqueta_id).filter(Boolean);
}

function mapServicioId(servicio) {
  const map = {
    "Muni Auto": "ser_muni_auto",
    "Renta Auto/Casa": "ser_renta_auto_casa",
    "Tarjeta Cordobesa": "ser_tarjeta_cordobesa",
    Caruso: "ser_caruso",
    IPV: "ser_ipv",
    Prevencion: "ser_prevencion",
    "Tarjeta Santander": "ser_tarjeta_santander",
    "Tarjeta Santander Dólares": "ser_tarjeta_santander_dolares",
    "Microsoft 365": "ser_microsoft_365",
    "Agua Casa": "ser_agua_casa",
    Netflix: "ser_netflix",
    "Nivel 6 MP": "ser_nivel_6_mp",
    Monotributo: "ser_monotributo",
    Capcut: "ser_capcut",
    Expensas: "ser_expensas",
    "Seguro Auto": "ser_seguro_auto",
    "Luz Casa": "ser_luz_casa",
    Gas: "ser_gas",
    "Cable Casa y Teléfonos": "ser_cable_casa_telefonos",
    "Cable Local": "ser_cable_local",
    "Colegio CESD": "ser_colegio_cesd",
    "Colegio CESD Material Didáctico": "ser_colegio_cesd_material_didactico",
    "Colegio CESD Extendido": "ser_colegio_cesd_extendido",
    "Colegio CESD Bono Vianda": "ser_colegio_cesd_bono_vianda",
    Super: "ser_super",
    Nafta: "ser_nafta",
    "Carne/Pollo/Verdulería/kiosco": "ser_carne_pollo_verduleria_kiosco",
    "Agua Bidones": "ser_agua_bidones",
    "Lucho Gym": "ser_lucho_gym",
    Basquet: "ser_basquet",
    Quini: "ser_quini",
    "Comida Banco": "ser_comida_banco",
    Peluquería: "ser_peluqueria",
    Cumple: "ser_cumple",
    Helado: "ser_helado",
    Regalos: "ser_regalos",
    Otros: "ser_otros",
    Farmacia: "ser_farmacia",
    Cotillón: "ser_cotillon",
    "Jean Vane": "ser_jean_vane",
    Lomito: "ser_lomito",
    "Boda de Oro": "ser_boda_de_oro",
    Prueba: "ser_prueba",
    "Cotillón Jere": "ser_cotillon_jere",
    "Vaper Liquido": "ser_vaper_liquido",
    "Lava auto y panadería": "ser_lava_auto_y_panaderia",
  };

  return map[servicio] || null;
}

async function obtenerTipoCambioPorFecha(sql, fechaConversion) {
  const fecha = normalizarFecha(fechaConversion);

  if (fecha) {
    const cotizaciones = await sql`
      SELECT valor
      FROM cotizaciones
      WHERE fecha = ${fecha}
        AND moneda_origen = 'USD'
        AND moneda_destino = 'ARS'
        AND tipo = 'tarjeta'
      LIMIT 1;
    `;

    if (cotizaciones.length > 0) {
      return toNumber(cotizaciones[0].valor, null);
    }
  }

  const parametros = await sql`
    SELECT valor
    FROM parametros
    WHERE clave = 'tipo_cambio_default'
    LIMIT 1;
  `;

  if (parametros.length > 0) {
    return toNumber(parametros[0].valor, 1);
  }

  return 1;
}

async function calcularDetalleMonetario(sql, sub, monedaMovimiento = "ARS", fechaConversion) {
  const monto = toNumber(sub?.monto ?? sub?.montoUSD ?? 0);
  const moneda = normalizarMoneda(sub?.moneda || monedaMovimiento);

  let tipoCambio =
    sub?.tipoCambio !== null && sub?.tipoCambio !== undefined && sub?.tipoCambio !== ""
      ? toNumber(sub.tipoCambio, null)
      : sub?.tipo_cambio !== null && sub?.tipo_cambio !== undefined && sub?.tipo_cambio !== ""
        ? toNumber(sub.tipo_cambio, null)
        : null;

  if (moneda === "USD" && !tipoCambio) {
    tipoCambio = await obtenerTipoCambioPorFecha(sql, fechaConversion);
  }

  let montoARSCalculado =
    sub?.montoARSCalculado !== null &&
    sub?.montoARSCalculado !== undefined &&
    sub?.montoARSCalculado !== ""
      ? toNumber(sub.montoARSCalculado, null)
      : sub?.monto_ars_calculado !== null &&
        sub?.monto_ars_calculado !== undefined &&
        sub?.monto_ars_calculado !== ""
        ? toNumber(sub.monto_ars_calculado, null)
        : null;

  if (montoARSCalculado === null) {
    if (moneda === "ARS") {
      montoARSCalculado = monto;
    } else if (moneda === "USD") {
      montoARSCalculado = monto * toNumber(tipoCambio, 1);
    } else {
      montoARSCalculado = monto;
    }
  }

  return {
    monto,
    moneda,
    tipoCambio,
    montoARSCalculado,
  };
}

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = requireAuth(req, res);
    if (!user) return;
    const body = req.body || {};

    const {
      id,
      periodo,
      dia,
      categoria,
      formaPago,

      // Nuevo modelo multidimensional
      conceptoId,
      medioPagoId,
      instrumentoId,
      categoriaGastoId,
      etiquetasIds = [],

      servicio,
      monto,
      moneda,
      estado,
      observacion,
      vencimiento,
      esRecurrente,
      subconceptos = [],
    } = body;

    const userWorkspace = await resolveWorkspaceForUser(sql, user);
    const workspaceId = userWorkspace.workspaceId || "ws_default";
    user.workspaceId = workspaceId;
    user.workspaceNombre = userWorkspace.workspaceNombre || user.workspaceNombre;
    const usuarioId = user.usuarioId;
    const usuarioIdCreador = user.usuarioId;

    if (!id || !periodo || !monto) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    const movimientoPropio = await sql`
      SELECT
        movimiento_id,
        concepto_id,
        concepto_manual,
        servicio_id,
        categoria_id,
        forma_pago_id,
        medio_pago_id,
        instrumento_id,
        categoria_gasto_id,
        moneda
      FROM movimientos
      WHERE movimiento_id = ${id}
        AND usuario_id = ${usuarioId}
        AND tipo_movimiento = 'GASTO'
      LIMIT 1;
    `;

    if (movimientoPropio.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Movimiento no encontrado para el usuario actual",
      });
    }

    const movimientoActual = movimientoPropio[0];
    const conceptoNuevoId = conceptoId || body.concepto_id || movimientoActual.concepto_id || null;

    if (!servicio && !conceptoNuevoId && !movimientoActual.concepto_manual && !movimientoActual.servicio_id) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    const conceptoActivo = await obtenerConceptoActivo(sql, workspaceId, conceptoNuevoId);
    const servicioFinal = servicio || conceptoActivo?.nombre || movimientoActual.concepto_manual || null;

    const categoriaId = categoria !== undefined ? mapCategoriaId(categoria) : movimientoActual.categoria_id;
    const formaPagoId = formaPago !== undefined ? mapFormaPagoId(formaPago) : movimientoActual.forma_pago_id;
    const servicioId = servicioFinal ? mapServicioId(servicioFinal) : movimientoActual.servicio_id;
    const conceptoManual = conceptoNuevoId ? null : servicioId ? null : servicioFinal || movimientoActual.concepto_manual || null;
    const fechaOperacion = `${periodo}-${String(dia || 1).padStart(2, "0")}`;
    const fechaConversion = normalizarFecha(vencimiento || fechaOperacion);
    const monedaMovimiento = normalizarMoneda(
      moneda || conceptoActivo?.moneda_default || movimientoActual.moneda || "ARS"
    );

    const medioPagoNuevoId =
      medioPagoId || body.medio_pago_id || conceptoActivo?.medio_pago_id || movimientoActual.medio_pago_id || null;
    const instrumentoNuevoId =
      instrumentoId || body.instrumento_id || conceptoActivo?.instrumento_id || movimientoActual.instrumento_id || null;
    const categoriaGastoNuevoId =
      categoriaGastoId || body.categoria_gasto_id || conceptoActivo?.categoria_gasto_id || movimientoActual.categoria_gasto_id || null;

    const etiquetasPayload = normalizarListaIds(
      etiquetasIds.length ? etiquetasIds : body.etiquetas || body.etiquetas_ids
    );
    const etiquetasNormalizadas = etiquetasPayload.length
      ? etiquetasPayload
      : await obtenerEtiquetasConcepto(sql, conceptoNuevoId);

    const detallesNormalizados = [];

    if (Array.isArray(subconceptos) && subconceptos.length > 0) {
      for (const sub of subconceptos) {
        const detalleMonetario = await calcularDetalleMonetario(
          sql,
          sub,
          monedaMovimiento,
          fechaConversion
        );

        detallesNormalizados.push({
          ...sub,
          ...detalleMonetario,
        });
      }
    }

    const montoCabecera =
      detallesNormalizados.length > 0
        ? detallesNormalizados.reduce(
            (acc, item) => acc + toNumber(item.montoARSCalculado, 0),
            0
          )
        : toNumber(monto, 0);
    await sql`
      UPDATE movimientos
      SET
        fecha_operacion = ${fechaOperacion},
        periodo = ${periodo},
        dia = ${Number(dia || 1)},
        categoria_id = ${categoriaId},
        forma_pago_id = ${formaPagoId},
        servicio_id = ${servicioId},
        concepto_manual = ${conceptoManual},

        workspace_id = COALESCE(workspace_id, ${workspaceId}),
        usuario_id_creador = COALESCE(usuario_id_creador, ${usuarioIdCreador}),
        usuario_id = COALESCE(usuario_id, ${usuarioId}),
        concepto_id = ${conceptoNuevoId},
        medio_pago_id = ${medioPagoNuevoId},
        instrumento_id = ${instrumentoNuevoId},
        categoria_gasto_id = ${categoriaGastoNuevoId},

        monto = ${montoCabecera},
        moneda = ${monedaMovimiento},
        estado = ${estado || "pendiente"},
        vencimiento = ${vencimiento || null},
        observacion = ${observacion || null},
        es_recurrente = ${!!esRecurrente},
        updated_at = NOW()
      WHERE movimiento_id = ${id}
        AND usuario_id = ${usuarioId};
    `;

    await sql`
      DELETE FROM movimiento_etiquetas
      WHERE movimiento_id = ${id}
        AND movimiento_id IN (
          SELECT movimiento_id FROM movimientos WHERE usuario_id = ${usuarioId}
        );
    `;

    if (etiquetasNormalizadas.length > 0) {
      for (const etiquetaId of etiquetasNormalizadas) {
        await sql`
          INSERT INTO movimiento_etiquetas (
            movimiento_id,
            etiqueta_id
          ) VALUES (
            ${id},
            ${etiquetaId}
          )
          ON CONFLICT (movimiento_id, etiqueta_id) DO NOTHING;
        `;
      }
    }

    await sql`
      DELETE FROM detalle_movimiento
      WHERE movimiento_id = ${id}
        AND movimiento_id IN (
          SELECT movimiento_id FROM movimientos WHERE usuario_id = ${usuarioId}
        );
    `;

    if (detallesNormalizados.length > 0) {
      let orden = 1;

      for (const sub of detallesNormalizados) {
        const detalleId = generarId("det");

        await sql`
          INSERT INTO detalle_movimiento (
            detalle_id,
            movimiento_id,
            nombre_item,
            monto,
            moneda,
            tipo_cambio,
            monto_ars_calculado,
            orden,
            observacion,
            activo
          ) VALUES (
            ${detalleId},
            ${id},
            ${sub.nombre || sub.nombreItem || "Item"},
            ${toNumber(sub.monto, 0)},
            ${normalizarMoneda(sub.moneda)},
            ${sub.tipoCambio},
            ${toNumber(sub.montoARSCalculado, 0)},
            ${orden},
            ${sub.observacion || null},
            true
          );
        `;

        orden++;
      }
    }

    return res.status(200).json({
      ok: true,
      data: { movimiento_id: id },
    });
  } catch (error) {
    console.error("Error en /api/gastos-update:", error);
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}