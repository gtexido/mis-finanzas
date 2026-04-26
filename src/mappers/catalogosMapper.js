export const mapCatalogosDesdeApi = (catalogos, tipoCambioActual = 1415) => {
  const categorias = (catalogos.categorias || []).map((c) => ({
    id: c.categoria_id.replace("cat_", ""),
    label: c.nombre,
    color: c.color,
  }));

  const formasPago = (catalogos.formasPago || []).map((fp) => fp.nombre);

  const servicios = {};
  (catalogos.servicios || []).forEach((s) => {
    const catId = (s.categoria_id || "").replace("cat_", "");
    if (!servicios[catId]) servicios[catId] = [];
    servicios[catId].push(s.nombre);
  });

  const conceptosDolar = (catalogos.servicios || [])
    .filter((s) => s.usa_subconceptos_usd === true || s.tipo_moneda_default === "USD")
    .map((s) => s.nombre);

  const fuentesIngreso = (catalogos.fuentesIngreso || []).map((f) => f.nombre);

  const tipoCambioParam = (catalogos.parametros || []).find(
    (p) => p.clave === "tipo_cambio_default"
  );

  const mediosPago = (catalogos.mediosPago || []).map((m) => ({
    id: m.medio_pago_id,
    nombre: m.nombre,
    label: m.nombre,
    tipo: m.tipo,
    color: m.color || "#64748b",
    ordenVisual: Number(m.orden_visual || 0),
  }));

  const instrumentosPago = (catalogos.instrumentosPago || []).map((i) => ({
    id: i.instrumento_id,
    nombre: i.nombre,
    label: i.nombre,
    tipo: i.tipo,
    ordenVisual: Number(i.orden_visual || 0),
  }));

  const categoriasGasto = (catalogos.categoriasGasto || []).map((c) => ({
    id: c.categoria_gasto_id,
    nombre: c.nombre,
    label: c.nombre,
    color: c.color || "#64748b",
    ordenVisual: Number(c.orden_visual || 0),
  }));

  const etiquetas = (catalogos.etiquetas || []).map((e) => ({
    id: e.etiqueta_id,
    nombre: e.nombre,
    label: e.nombre,
    color: e.color || "#64748b",
    ordenVisual: Number(e.orden_visual || 0),
  }));

  return {
    categorias,
    formasPago,
    servicios,
    conceptosDolar,
    fuentesIngreso,
    tipoCambio: tipoCambioParam ? Number(tipoCambioParam.valor) : tipoCambioActual,

    // Nuevo modelo multidimensional.
    mediosPago,
    instrumentosPago,
    categoriasGasto,
    etiquetas,
  };
};