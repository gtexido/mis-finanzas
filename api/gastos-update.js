import { neon } from "@neondatabase/serverless";

function mapCategoriaId(categoria) {
  return categoria ? `cat_${categoria}` : null;
}

function mapFormaPagoId(formaPago) {
  const map = {
    "Manual": "fp_manual",
    "Tarjeta": "fp_tarjeta",
    "Débito automático": "fp_debito_automatico",
    "Tarjeta Cordobesa": "fp_tarjeta_cordobesa",
  };
  return map[formaPago] || null;
}

function mapServicioId(servicio) {
  const map = {
    "Muni Auto": "ser_muni_auto",
    "Renta Auto/Casa": "ser_renta_auto_casa",
    "Tarjeta Cordobesa": "ser_tarjeta_cordobesa",
    "Caruso": "ser_caruso",
    "IPV": "ser_ipv",
    "Prevencion": "ser_prevencion",
    "Tarjeta Santander": "ser_tarjeta_santander",
    "Tarjeta Santander Dólares": "ser_tarjeta_santander_dolares",
    "Microsoft 365": "ser_microsoft_365",
    "Agua Casa": "ser_agua_casa",
    "Netflix": "ser_netflix",
    "Nivel 6 MP": "ser_nivel_6_mp",
    "Monotributo": "ser_monotributo",
    "Capcut": "ser_capcut",
    "Expensas": "ser_expensas",
    "Seguro Auto": "ser_seguro_auto",
    "Luz Casa": "ser_luz_casa",
    "Gas": "ser_gas",
    "Cable Casa y Teléfonos": "ser_cable_casa_telefonos",
    "Cable Local": "ser_cable_local",
    "Colegio CESD": "ser_colegio_cesd",
    "Colegio CESD Material Didáctico": "ser_colegio_cesd_material_didactico",
    "Colegio CESD Extendido": "ser_colegio_cesd_extendido",
    "Colegio CESD Bono Vianda": "ser_colegio_cesd_bono_vianda",
    "Super": "ser_super",
    "Nafta": "ser_nafta",
    "Carne/Pollo/Verdulería/kiosco": "ser_carne_pollo_verduleria_kiosco",
    "Agua Bidones": "ser_agua_bidones",
    "Lucho Gym": "ser_lucho_gym",
    "Basquet": "ser_basquet",
    "Quini": "ser_quini",
    "Comida Banco": "ser_comida_banco",
    "Peluquería": "ser_peluqueria",
    "Cumple": "ser_cumple",
    "Helado": "ser_helado",
    "Regalos": "ser_regalos",
    "Otros": "ser_otros",
    "Farmacia": "ser_farmacia",
    "Cotillón": "ser_cotillon",
    "Jean Vane": "ser_jean_vane",
    "Lomito": "ser_lomito",
    "Boda de Oro": "ser_boda_de_oro",
    "Prueba": "ser_prueba",
    "Cotillón Jere": "ser_cotillon_jere",
    "Vaper Liquido": "ser_vaper_liquido",
    "Lava auto y panadería": "ser_lava_auto_y_panaderia",
  };
  return map[servicio] || null;
}

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = req.body || {};

    const {
      id,
      periodo,
      dia,
      categoria,
      formaPago,
      servicio,
      monto,
      moneda,
      estado,
      observacion,
      vencimiento,
      esRecurrente,
      subconceptos = [],
    } = body;

    if (!id || !periodo || !categoria || !servicio) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos obligatorios",
      });
    }

    const categoriaId = mapCategoriaId(categoria);
    const formaPagoId = mapFormaPagoId(formaPago);
    const servicioId = mapServicioId(servicio);
    const conceptoManual = servicioId ? null : (servicio || null);
    const fechaOperacion = `${periodo}-${String(dia || 1).padStart(2, "0")}`;

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
        monto = ${Number(monto || 0)},
        moneda = ${moneda || "ARS"},
        estado = ${estado || "pendiente"},
        vencimiento = ${vencimiento || null},
        observacion = ${observacion || null},
        es_recurrente = ${!!esRecurrente},
        updated_at = NOW()
      WHERE movimiento_id = ${id};
    `;

    await sql`
  DELETE FROM detalle_movimiento
  WHERE movimiento_id = ${id};
`;

if (Array.isArray(subconceptos) && subconceptos.length > 0) {
  let orden = 1;

  for (const sub of subconceptos) {
    const detalleId = `det_${Math.random().toString(36).slice(2, 14)}`;

    await sql`
      INSERT INTO detalle_movimiento (
        detalle_id,
        movimiento_id,
        nombre_item,
        monto,
        moneda,
        orden,
        observacion,
        activo
      ) VALUES (
        ${detalleId},
        ${id},
        ${sub.nombre || "Item"},
        ${Number(sub.montoUSD || 0)},
        'USD',
        ${orden},
        ${null},
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
    return res.status(500).json({
      ok: false,
      error: error.message || "Error interno",
    });
  }
}