export const COLORES = ["#4ade80","#f87171","#60a5fa","#a78bfa","#fbbf24","#94a3b8","#fb923c","#f472b6","#34d399","#38bdf8","#e879f9","#facc15"];

export const TIPOS_MEDIO_PAGO = [
  { id:"banco", label:"Banco" },
  { id:"billetera", label:"Billetera" },
  { id:"efectivo", label:"Efectivo" },
  { id:"tarjeta", label:"Tarjeta" },
  { id:"cuenta", label:"Cuenta" },
  { id:"otro", label:"Otro" },
];

export const DEFAULT_CONFIG = {
  categorias: [
    { id:"bancon", label:"Bancon", color:"#4ade80" },
    { id:"santander", label:"Santander", color:"#f87171" },
    { id:"personal_pay", label:"Personal Pay", color:"#60a5fa" },
    { id:"mercado_pago", label:"Mercado Pago", color:"#a78bfa" },
    { id:"gastos_fijos", label:"Gastos Fijos", color:"#fbbf24" },
    { id:"otros", label:"Otros", color:"#94a3b8" },
  ],
  formasPago: ["Manual","Tarjeta","Débito automático","Tarjeta Cordobesa"],
  mediosPago: [
    { id:"mp_bancon", nombre:"Bancon", color:"#4ade80" },
    { id:"mp_santander", nombre:"Santander", color:"#f87171" },
    { id:"mp_personal_pay", nombre:"Personal Pay", color:"#60a5fa" },
    { id:"mp_mercado_pago", nombre:"Mercado Pago", color:"#a78bfa" },
    { id:"mp_efectivo", nombre:"Efectivo", color:"#94a3b8" },
    { id:"mp_sin_definir", nombre:"Sin definir", color:"#64748b" },
  ],
  instrumentosPago: [
    { id:"ins_manual", nombre:"Manual" },
    { id:"ins_tarjeta_credito", nombre:"Tarjeta crédito" },
    { id:"ins_debito", nombre:"Débito" },
    { id:"ins_debito_automatico", nombre:"Débito automático" },
    { id:"ins_transferencia", nombre:"Transferencia" },
    { id:"ins_efectivo", nombre:"Efectivo" },
    { id:"ins_sin_definir", nombre:"Sin definir" },
  ],
  categoriasGasto: [
    { id:"cg_supermercado", nombre:"Supermercado", color:"#22c55e" },
    { id:"cg_nafta", nombre:"Nafta", color:"#f97316" },
    { id:"cg_educacion", nombre:"Educación", color:"#38bdf8" },
    { id:"cg_servicios", nombre:"Servicios", color:"#facc15" },
    { id:"cg_suscripciones", nombre:"Suscripciones", color:"#a78bfa" },
    { id:"cg_salud", nombre:"Salud", color:"#fb7185" },
    { id:"cg_comida", nombre:"Comida", color:"#fb923c" },
    { id:"cg_hogar", nombre:"Hogar", color:"#60a5fa" },
    { id:"cg_impuestos", nombre:"Impuestos", color:"#f87171" },
    { id:"cg_tarjetas", nombre:"Tarjetas", color:"#ef4444" },
    { id:"cg_otros", nombre:"Otros", color:"#94a3b8" },
  ],
  etiquetas: [
    { id:"tag_fijo", nombre:"Fijo", color:"#38bdf8" },
    { id:"tag_variable", nombre:"Variable", color:"#f97316" },
    { id:"tag_recurrente", nombre:"Recurrente", color:"#22c55e" },
    { id:"tag_suscripcion", nombre:"Suscripción", color:"#a78bfa" },
  ],
  servicios: {
    bancon: ["Muni Auto","Renta Auto/Casa","Tarjeta Cordobesa"],
    santander: ["Caruso","IPV","Prevencion","Tarjeta Santander","Tarjeta Santander Dólares","Microsoft 365","Agua Casa","Netflix","Nivel 6 MP","Monotributo","Capcut"],
    personal_pay: ["Expensas","Seguro Auto","Luz Casa","Gas","Cable Casa y Teléfonos","Cable Local"],
    mercado_pago: ["Colegio CESD","Colegio CESD Material Didáctico","Colegio CESD Extendido","Colegio CESD Bono Vianda"],
    gastos_fijos: ["Super","Nafta","Carne/Pollo/Verdulería/kiosco","Agua Bidones","Lucho Gym","Basquet","Quini","Comida Banco"],
    otros: ["Peluquería","Cumple","Helado","Regalos","Otros"],
  },
  conceptosDolar: ["Tarjeta Santander Dólares"],
  fuentesIngreso: ["Hogar","Ventas","Trabajo Diario","Otros"],
  tipoCambio: 1415,
};

export const SUBCONCEPTOS_USD_SUGERIDOS = ["Google One","YouTube","ChatGPT","Netflix","Spotify","Microsoft 365","Apple","Amazon","iCloud","Disney+","HBO","Canva","Notion","Dropbox","Otro"];

export const FUENTES_INGRESO_GENERICAS = ["Hogar", "Ventas", "Trabajo Diario", "Otros"];

export const MAPA_FUENTES_INGRESO_LEGACY = {
  Vane: "Hogar",
  Anses: "Trabajo Diario",
  "Descartables V&G": "Ventas",
};
