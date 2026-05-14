export const ABRIL_GASTOS = []; // Sin datos precargados — se cargan desde Google Sheets

export const SHEETS_URL = null;
export const syncSheets = () => {};
export const syncFullBackup = () => {};

export const medioPagoDesdeCategoriaLegacy = (categoria) => {
  const map = {
    bancon: "mp_bancon",
    santander: "mp_santander",
    personal_pay: "mp_personal_pay",
    mercado_pago: "mp_mercado_pago",
  };
  return map[categoria] || "mp_sin_definir";
};

export const instrumentoDesdeFormaPagoLegacy = (formaPago) => {
  const map = {
    Manual: "ins_manual",
    Tarjeta: "ins_tarjeta_credito",
    "Débito automático": "ins_debito_automatico",
    "Tarjeta Cordobesa": "ins_tarjeta_credito",
  };
  return map[formaPago] || "ins_sin_definir";
};

export const categoriaLegacyDesdeMedioPagoId = (medioPagoId) => {
  const map = {
    mp_bancon: "bancon",
    mp_santander: "santander",
    mp_personal_pay: "personal_pay",
    mp_mercado_pago: "mercado_pago",
  };
  return map[medioPagoId] || "otros";
};

export const formaPagoLegacyDesdeInstrumentoId = (instrumentoId) => {
  const map = {
    ins_manual: "Manual",
    ins_tarjeta_credito: "Tarjeta",
    ins_debito: "Manual",
    ins_debito_automatico: "Débito automático",
    ins_transferencia: "Manual",
    ins_efectivo: "Manual",
  };
  return map[instrumentoId] || "Manual";
};

export const categoriaGastoDesdeServicio = (servicio = "") => {
  const s = String(servicio).trim();
  const reglas = [
    { id:"cg_supermercado", vals:["Super","Carne/Pollo/Verdulería/kiosco"] },
    { id:"cg_nafta", vals:["Nafta"] },
    { id:"cg_educacion", vals:["Colegio CESD","Colegio CESD Material Didáctico","Colegio CESD Extendido","Colegio CESD Bono Vianda","Basquet"] },
    { id:"cg_servicios", vals:["Luz Casa","Gas","Agua Casa","Cable Casa y Teléfonos","Cable Local","Agua Bidones"] },
    { id:"cg_suscripciones", vals:["Tarjeta Santander Dólares","Microsoft 365","Netflix","Capcut","Nivel 6 MP"] },
    { id:"cg_salud", vals:["Farmacia","Prevencion","Caruso"] },
    { id:"cg_comida", vals:["Comida Banco","Lomito","Helado"] },
    { id:"cg_hogar", vals:["Expensas","Seguro Auto"] },
    { id:"cg_impuestos", vals:["Monotributo","Muni Auto","Renta Auto/Casa","IPV"] },
    { id:"cg_tarjetas", vals:["Tarjeta Santander","Tarjeta Cordobesa"] },
    { id:"cg_deporte", vals:["Lucho Gym"] },
  ];
  return reglas.find((r) => r.vals.includes(s))?.id || "cg_otros";
};

export const etiquetasDesdeServicio = (servicio = "") => {
  const s = String(servicio).trim();
  const fijos = ["Luz Casa","Gas","Agua Casa","Cable Casa y Teléfonos","Cable Local","Expensas","Seguro Auto","Monotributo","Muni Auto","Renta Auto/Casa","IPV","Tarjeta Santander","Tarjeta Santander Dólares","Tarjeta Cordobesa","Colegio CESD","Prevencion","Caruso"];
  const suscripciones = ["Tarjeta Santander Dólares","Microsoft 365","Netflix","Capcut","Nivel 6 MP"];
  const tags = [];
  if (fijos.includes(s)) tags.push("tag_fijo");
  else tags.push("tag_variable");
  if (suscripciones.includes(s)) tags.push("tag_suscripcion");
  return tags;
};
