export const mapMovimientosDesdeApi = (apiData, periodo = "2026-04") => {
  const movimientos = apiData.movimientos || [];
  const detalles = apiData.detalles || [];

  const formaPagoMap = {
    fp_manual: "Manual",
    fp_tarjeta: "Tarjeta",
    fp_debito_automatico: "Débito automático",
    fp_tarjeta_cordobesa: "Tarjeta Cordobesa",
  };

  const servicioMap = {
    ser_muni_auto: "Muni Auto",
    ser_renta_auto_casa: "Renta Auto/Casa",
    ser_tarjeta_cordobesa: "Tarjeta Cordobesa",
    ser_caruso: "Caruso",
    ser_ipv: "IPV",
    ser_prevencion: "Prevencion",
    ser_tarjeta_santander: "Tarjeta Santander",
    ser_tarjeta_santander_dolares: "Tarjeta Santander Dólares",
    ser_microsoft_365: "Microsoft 365",
    ser_agua_casa: "Agua Casa",
    ser_netflix: "Netflix",
    ser_nivel_6_mp: "Nivel 6 MP",
    ser_monotributo: "Monotributo",
    ser_capcut: "Capcut",
    ser_expensas: "Expensas",
    ser_seguro_auto: "Seguro Auto",
    ser_luz_casa: "Luz Casa",
    ser_gas: "Gas",
    ser_cable_casa_telefonos: "Cable Casa y Teléfonos",
    ser_cable_local: "Cable Local",
    ser_colegio_cesd: "Colegio CESD",
    ser_colegio_cesd_material_didactico: "Colegio CESD Material Didáctico",
    ser_colegio_cesd_extendido: "Colegio CESD Extendido",
    ser_colegio_cesd_bono_vianda: "Colegio CESD Bono Vianda",
    ser_super: "Super",
    ser_nafta: "Nafta",
    ser_carne_pollo_verduleria_kiosco: "Carne/Pollo/Verdulería/kiosco",
    ser_agua_bidones: "Agua Bidones",
    ser_lucho_gym: "Lucho Gym",
    ser_basquet: "Basquet",
    ser_quini: "Quini",
    ser_comida_banco: "Comida Banco",
    ser_peluqueria: "Peluquería",
    ser_cumple: "Cumple",
    ser_helado: "Helado",
    ser_regalos: "Regalos",
    ser_otros: "Otros",
    ser_farmacia: "Farmacia",
    ser_cotillon: "Cotillón",
    ser_jean_vane: "Jean Vane",
    ser_lomito: "Lomito",
    ser_boda_de_oro: "Boda de Oro",
    ser_prueba: "Prueba",
    ser_cotillon_jere: "Cotillón Jere",
    ser_vaper_liquido: "Vaper Liquido",
    ser_lava_auto_y_panaderia: "Lava auto y panadería",
  };

  const fuenteIngresoMap = {
    fi_vane: "Vane",
    fi_anses: "Anses",
    fi_descartables_vg: "Descartables V&G",
  };

  const mapDetalle = (d, movimiento) => ({
    id: d.detalle_id,
    detalleId: d.detalle_id,
    movimientoId: d.movimiento_id,

    nombre: d.nombre_item,
    nombreItem: d.nombre_item,

    monto: Number(d.monto || 0),
    moneda: d.moneda || movimiento.moneda || "ARS",

    tipoCambio:
      d.tipo_cambio !== null && d.tipo_cambio !== undefined
        ? Number(d.tipo_cambio)
        : null,

    montoARSCalculado:
      d.monto_ars_calculado !== null && d.monto_ars_calculado !== undefined
        ? Number(d.monto_ars_calculado)
        : null,

    orden: Number(d.orden || 0),
    observacion: d.observacion || "",
    activo: d.activo !== false,
  });

  const gastos = movimientos
    .filter((m) => m.tipo_movimiento === "GASTO")
    .map((m) => {
      const subconceptos = detalles
        .filter((d) => d.movimiento_id === m.movimiento_id)
        .sort((a, b) => (Number(a.orden || 0) - Number(b.orden || 0)))
        .map((d) => mapDetalle(d, m));

      return {
        id: m.movimiento_id,
        dia: String(m.dia ?? ""),
        categoria: (m.categoria_id || "").replace("cat_", ""),
        formaPago: formaPagoMap[m.forma_pago_id] || "",
        servicio: servicioMap[m.servicio_id] || m.concepto_manual || m.servicio_id || "",
        monto: Number(m.monto || 0),
        moneda: m.moneda || "ARS",
        estado: m.estado || "pendiente",
        observacion: m.observacion || "",
        vencimiento: m.vencimiento ? String(m.vencimiento).slice(0, 10) : "",
        esRecurrente: !!m.es_recurrente,

        subconceptos,

        // Alias útiles para futuras pantallas o componentes.
        detalle: subconceptos,
        detalles: subconceptos,
      };
    });

  const ingresos = movimientos
    .filter((m) => m.tipo_movimiento === "INGRESO" && m.subtipo_movimiento === "INGRESO_EXTRA")
    .map((m) => ({
      id: m.movimiento_id,
      fuente: fuenteIngresoMap[m.fuente_ingreso_id] || "",
      monto: Number(m.monto || 0),
      dia: String(m.dia ?? "1"),
    }));

  const sueldoMov = movimientos.find(
    (m) => m.tipo_movimiento === "INGRESO" && m.subtipo_movimiento === "SUELDO"
  );

  return {
    gastos: { [periodo]: gastos },
    ingresos: { [periodo]: ingresos },
    sueldo: { [periodo]: sueldoMov ? Number(sueldoMov.monto || 0) : 0 },
  };
};