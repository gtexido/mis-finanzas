export const mapMovimientosDesdeApi = (apiData, periodo = "2026-04") => {
  const payload =
    apiData?.data && !Array.isArray(apiData.data)
      ? apiData.data
      : apiData || {};

  const movimientos = payload.movimientos || [];
  const detalles = payload.detalles || [];
  const etiquetasApi = payload.etiquetas || [];

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

  const mapEtiquetas = (movimientoId) => {
    return etiquetasApi
      .filter((e) => e.movimiento_id === movimientoId)
      .map((e) => ({
        id: e.etiqueta_id,
        etiquetaId: e.etiqueta_id,
        nombre: e.nombre,
        color: e.color,
        ordenVisual: Number(e.orden_visual || 0),
      }));
  };

  const gastos = movimientos
    .filter((m) => m.tipo_movimiento === "GASTO")
    .map((m) => {
      const subconceptos = detalles
        .filter((d) => d.movimiento_id === m.movimiento_id)
        .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
        .map((d) => mapDetalle(d, m));

      const etiquetas = mapEtiquetas(m.movimiento_id);

      return {
        id: m.movimiento_id,
        dia: String(m.dia ?? ""),

        // Legacy actual, para no romper UI existente.
        categoria: (m.categoria_id || "").replace("cat_", ""),
        categoriaId: m.categoria_id || "",
        categoriaNombre: m.categoria_nombre || "",

        formaPago: m.forma_pago_nombre || formaPagoMap[m.forma_pago_id] || "",
        formaPagoId: m.forma_pago_id || "",

        servicio:
          m.concepto_nombre ||
          m.servicio_nombre ||
          servicioMap[m.servicio_id] ||
          m.concepto_manual ||
          m.concepto_id ||
          m.servicio_id ||
          "",
        servicioId: m.servicio_id || "",
        conceptoId: m.concepto_id || "",
        conceptoNombre: m.concepto_nombre || "",
        conceptoManual: m.concepto_manual || "",

        monto: Number(m.monto || 0),
        moneda: m.moneda || "ARS",
        estado: m.estado || "pendiente",
        observacion: m.observacion || "",
        vencimiento: m.vencimiento ? String(m.vencimiento).slice(0, 10) : "",
        esRecurrente: !!m.es_recurrente,

        // Nuevo modelo multidimensional.
        workspaceId: m.workspace_id || "",
        usuarioIdCreador: m.usuario_id_creador || "",

        medioPagoId: m.medio_pago_id || "",
        medioPago: m.medio_pago_nombre || "",
        medioPagoNombre: m.medio_pago_nombre || "",
        medioPagoTipo: m.medio_pago_tipo || "",
        medioPagoColor: m.medio_pago_color || "",

        instrumentoId: m.instrumento_id || "",
        instrumento: m.instrumento_nombre || "",
        instrumentoNombre: m.instrumento_nombre || "",
        instrumentoTipo: m.instrumento_tipo || "",

        categoriaGastoId: m.categoria_gasto_id || "",
        categoriaGasto: m.categoria_gasto_nombre || "",
        categoriaGastoNombre: m.categoria_gasto_nombre || "",
        categoriaGastoColor: m.categoria_gasto_color || "",

        etiquetas,
        etiquetasNombres: etiquetas.map((e) => e.nombre),

        subconceptos,

        // Alias útiles para futuras pantallas o componentes.
        detalle: subconceptos,
        detalles: subconceptos,
      };
    });

    const ingresos = movimientos
    .filter((m) => {
      const tipo = String(m.tipo_movimiento || "").toUpperCase();
      const subtipo = String(m.subtipo_movimiento || "").toUpperCase();
      return tipo === "INGRESO" && subtipo === "INGRESO_EXTRA";
    })
    .map((m) => ({
      id: m.movimiento_id,
      fuente:
        m.fuente_ingreso_nombre ||
        fuenteIngresoMap[m.fuente_ingreso_id] ||
        m.concepto_manual ||
        "Otros ingresos",
      fuenteIngresoId: m.fuente_ingreso_id || "",
      monto: Number(m.monto || 0),
      dia: String(m.dia ?? "1"),

      workspaceId: m.workspace_id || "",
      usuarioIdCreador: m.usuario_id_creador || "",
    }));

  const sueldoMov = movimientos.find((m) => {
    const tipo = String(m.tipo_movimiento || "").toUpperCase();
    const subtipo = String(m.subtipo_movimiento || "").toUpperCase();
    return tipo === "INGRESO" && subtipo === "SUELDO";
  });

  return {
    gastos: { [periodo]: gastos },
    ingresos: { [periodo]: ingresos },
    sueldo: { [periodo]: sueldoMov ? Number(sueldoMov.monto || 0) : 0 },
  };
};