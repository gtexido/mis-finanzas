export const mapCatalogosDesdeApi = (catalogos, tipoCambioActual = 1415) => {
  const categorias = (catalogos.categorias || []).map(c => ({
    id: c.categoria_id.replace("cat_", ""),
    label: c.nombre,
    color: c.color,
  }));

  const formasPago = (catalogos.formasPago || []).map(fp => fp.nombre);

  const servicios = {};
  (catalogos.servicios || []).forEach(s => {
    const catId = (s.categoria_id || "").replace("cat_", "");
    if (!servicios[catId]) servicios[catId] = [];
    servicios[catId].push(s.nombre);
  });

  const conceptosDolar = (catalogos.servicios || [])
    .filter(s => s.usa_subconceptos_usd === true || s.tipo_moneda_default === "USD")
    .map(s => s.nombre);

  const fuentesIngreso = (catalogos.fuentesIngreso || []).map(f => f.nombre);

  const tipoCambioParam = (catalogos.parametros || []).find(
    p => p.clave === "tipo_cambio_default"
  );

  return {
    categorias,
    formasPago,
    servicios,
    conceptosDolar,
    fuentesIngreso,
    tipoCambio: tipoCambioParam ? Number(tipoCambioParam.valor) : tipoCambioActual,
  };
};