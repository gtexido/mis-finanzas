// ======================================================
// 📦 IMPORTS
// ======================================================
// React
import { useState, useEffect, useCallback } from "react";

// Services (API)
import {
  getCatalogos,
  getMovimientos,
  crearGasto,
  eliminarGasto,
  actualizarGasto,
  crearIngreso,
  eliminarIngreso,
  guardarSueldoNeon,
  getCotizacionPorFecha,
  crearConcepto,
  actualizarConcepto,
  desactivarConcepto,
  crearMedioPago,
  actualizarMedioPago,
  desactivarMedioPago,
  crearCategoriaGasto,
  actualizarCategoriaGasto,
  desactivarCategoriaGasto,
  crearEtiqueta,
  actualizarEtiqueta,
  desactivarEtiqueta,
  login,
  logout,
  getSessionUser
} from "./services/api";

// Utils
import { fmtARS, fmtUSD, fmtFecha } from "./utils/formatters";
const fmtARSCompact = (valor) => {
  const n = Number(valor || 0);
  const signo = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs >= 1000000) {
    return `${signo}$ ${(abs / 1000000).toLocaleString("es-AR", {
      maximumFractionDigits: 1,
    })} M`;
  }

  if (abs >= 1000) {
    return `${signo}$ ${Math.round(abs / 1000).toLocaleString("es-AR")} mil`;
  }

  return fmtARS(n);
};

import { diasRestantes, getGrupoVencimiento, semaforo } from "./utils/dates";
import { montoReal, montoUSDReal } from "./utils/money";

// Mappers
import { mapCatalogosDesdeApi } from "./mappers/catalogosMapper";
import { mapMovimientosDesdeApi } from "./mappers/movimientosMapper";

// Components
import VencBadge from "./components/VencBadge";
import CotizadorWidget from "./components/CotizadorWidget";
import SubconceptosModal from "./components/SubconceptosModal";
import EditModal from "./components/EditModal";
import DetalleView from "./components/DetalleView";
import VencimientosView from "./components/VencimientosView";

// ======================================================
// ⚙️ CONFIGURACIÓN / CONSTANTES
// ======================================================


const COLORES = ["#4ade80","#f87171","#60a5fa","#a78bfa","#fbbf24","#94a3b8","#fb923c","#f472b6","#34d399","#38bdf8","#e879f9","#facc15"];
const TIPOS_MEDIO_PAGO = [
  { id:"banco", label:"Banco" },
  { id:"billetera", label:"Billetera" },
  { id:"efectivo", label:"Efectivo" },
  { id:"tarjeta", label:"Tarjeta" },
  { id:"cuenta", label:"Cuenta" },
  { id:"otro", label:"Otro" },
];

// Config fallback temporal. La configuración principal ya viene desde Neon.
const DEFAULT_CONFIG = {
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
  // Conceptos que son "tarjeta dólares" — se manejan como subconceptos
  conceptosDolar: ["Tarjeta Santander Dólares"],
  fuentesIngreso: ["Hogar","Ventas","Trabajo Diario","Otros"],
  tipoCambio: 1415,
};

// Subconceptos sugeridos para tarjeta dólares
const SUBCONCEPTOS_USD_SUGERIDOS = ["Google One","YouTube","ChatGPT","Netflix","Spotify","Microsoft 365","Apple","Amazon","iCloud","Disney+","HBO","Canva","Notion","Dropbox","Otro"];

const FUENTES_INGRESO_GENERICAS = ["Hogar", "Ventas", "Trabajo Diario", "Otros"];
const MAPA_FUENTES_INGRESO_LEGACY = {
  Vane: "Hogar",
  Anses: "Trabajo Diario",
  "Descartables V&G": "Ventas",
};
const normalizarFuenteIngreso = (fuente = "") => {
  const nombre = String(fuente || "").trim();
  if (!nombre) return "Otros";
  return MAPA_FUENTES_INGRESO_LEGACY[nombre] || (FUENTES_INGRESO_GENERICAS.includes(nombre) ? nombre : "Otros");
};


const ABRIL_GASTOS = []; // Sin datos precargados — se cargan desde Google Sheets

// ── Google Sheets Sync (LEGACY - DESACTIVADO) ─────────────────────────────────────────────────────────
// INSTRUCCIONES: Reemplazá TU_URL_AQUI con la URL de tu Google Apps Script
// La URL empieza con: https://script.google.com/macros/s/...../exec
// ── Google Sheets Sync (LEGACY - DESACTIVADO) ────────────────────────────────
const SHEETS_URL = null;

const syncSheets = () => {};
const syncFullBackup = () => {};
// ──────────────────────────────────────────────────────────────────────────────

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const getMesKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;
const slug = (s) => s.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")+"_"+Date.now();
const pct = (a,b) => b===0?null:Math.round(((a-b)/b)*100);
const fmtMonto = (monto, moneda = "ARS") => {
  const n = Number(monto || 0);

  if (moneda === "USD") {
    return `USD ${n.toFixed(2)}`;
  }

  return `$ ${n.toLocaleString("es-AR")}`;
};

const montoDetalle = (item) =>
  Number(item.monto ?? item.montoUSD ?? 0);

const medioPagoDesdeCategoriaLegacy = (categoria) => {
  const map = {
    bancon: "mp_bancon",
    santander: "mp_santander",
    personal_pay: "mp_personal_pay",
    mercado_pago: "mp_mercado_pago",
  };
  return map[categoria] || "mp_sin_definir";
};

const instrumentoDesdeFormaPagoLegacy = (formaPago) => {
  const map = {
    Manual: "ins_manual",
    Tarjeta: "ins_tarjeta_credito",
    "Débito automático": "ins_debito_automatico",
    "Tarjeta Cordobesa": "ins_tarjeta_credito",
  };
  return map[formaPago] || "ins_sin_definir";
};

const categoriaLegacyDesdeMedioPagoId = (medioPagoId) => {
  const map = {
    mp_bancon: "bancon",
    mp_santander: "santander",
    mp_personal_pay: "personal_pay",
    mp_mercado_pago: "mercado_pago",
  };
  return map[medioPagoId] || "otros";
};

const formaPagoLegacyDesdeInstrumentoId = (instrumentoId) => {
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

const categoriaGastoDesdeServicio = (servicio = "") => {
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

const etiquetasDesdeServicio = (servicio = "") => {
  const s = String(servicio).trim();
  const fijos = ["Luz Casa","Gas","Agua Casa","Cable Casa y Teléfonos","Cable Local","Expensas","Seguro Auto","Monotributo","Muni Auto","Renta Auto/Casa","IPV","Tarjeta Santander","Tarjeta Santander Dólares","Tarjeta Cordobesa","Colegio CESD","Prevencion","Caruso"];
  const suscripciones = ["Tarjeta Santander Dólares","Microsoft 365","Netflix","Capcut","Nivel 6 MP"];
  const tags = [];
  if (fijos.includes(s)) tags.push("tag_fijo");
  else tags.push("tag_variable");
  if (suscripciones.includes(s)) tags.push("tag_suscripcion");
  return tags;
};
  
// LEGACY parcial: localStorage queda temporalmente como respaldo de UI.
const load = () => {
  try {
    const c = localStorage.getItem("gcfg_v7");
    const r = localStorage.getItem("grec_v7");

    return {
      data: { gastos: {}, ingresos: {}, sueldo: {} },
      config: c ? JSON.parse(c) : DEFAULT_CONFIG,
      recurrentes: r ? JSON.parse(r) : [],
    };
  } catch {
    return {
      data: { gastos: {}, ingresos: {}, sueldo: {} },
      config: DEFAULT_CONFIG,
      recurrentes: []
    };
  }
};


// ======================================================
// 🚀 COMPONENTE PRINCIPAL
// ======================================================

// ======================================================
// 🧠 ESTADO GLOBAL
// ======================================================

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const now=new Date();
  const stored=load();
  const [view,setView]=useState("home");
  const [analisisTab,setAnalisisTab]=useState("medio");
  const [data,setData]=useState(stored.data);
  const [cfg,setCfg]=useState(stored.config);
  const [recurrentes,setRecurrentes]=useState(stored.recurrentes);
  const [mes,setMes]=useState({y:2026,m:3});
  const [form,setForm]=useState({
  categoria:"",
  formaPago:"",
  servicio:"",
  monto:"",
  moneda:"ARS",
  estado:"pagado",
  observacion:"",
  dia:String(now.getDate()),
  esRecurrente:false,
  vencimiento:"",
  subconceptos:[],
  conceptoId:"",
  medioPagoId:"",
  instrumentoId:"",
  categoriaGastoId:"",
  etiquetasIds:[],
  tipoGasto:"simple",
  accionCompuesto:"nuevo",
  decisionManual:false,
});
  const [sueldoInput,setSueldoInput]=useState("");
  const [ingForm,setIngForm]=useState({fuente:"",monto:"",dia:String(now.getDate())});
  const [toast,setToast]=useState(null);
  const [authUser,setAuthUser]=useState(getSessionUser());
  const [loginForm,setLoginForm]=useState({ usuarioId:"usr_gustavo", pin:"" });
  const [loginLoading,setLoginLoading]=useState(false);
  const [loginError,setLoginError]=useState("");
  const [confirmDel,setConfirmDel]=useState(null);
  const [editingGasto,setEditingGasto]=useState(null);
  const [editingMesKey,setEditingMesKey]=useState(null);
  const [subconceptosGasto,setSubconceptosGasto]=useState(null); // gasto en edición de subconceptos
  const [acumModal,setAcumModal]=useState(null); // {existente, nuevo}
  const [filtroEstado,setFiltroEstado]=useState("todos");
  const [cfgTab,setCfgTab]=useState("conceptos");
  const [busquedaConceptoCfg,setBusquedaConceptoCfg]=useState("");
  const [editConcepto,setEditConcepto]=useState(null);
  const [busquedaMedioCfg,setBusquedaMedioCfg]=useState("");
  const [editMedio,setEditMedio]=useState(null);
  const [nuevoMedio,setNuevoMedio]=useState({ nombre:"", tipo:"banco", color:"#60a5fa", ordenVisual:"" });
  const [busquedaCategoriaGastoCfg,setBusquedaCategoriaGastoCfg]=useState("");
  const [editCategoriaGasto,setEditCategoriaGasto]=useState(null);
  const [nuevaCategoriaGasto,setNuevaCategoriaGasto]=useState({ nombre:"", color:"#60a5fa", ordenVisual:"" });
  const [busquedaEtiquetaCfg,setBusquedaEtiquetaCfg]=useState("");
  const [editEtiqueta,setEditEtiqueta]=useState(null);
  const [nuevaEtiqueta,setNuevaEtiqueta]=useState({ nombre:"", color:"#f97316", ordenVisual:"" });
  const [tcInput,setTcInput]=useState("");
  const [showCotizador,setShowCotizador]=useState(false);
  const [gestionServModal,setGestionServModal]=useState(null); // catId para gestionar servicios inline
  const [gestionCatModal,setGestionCatModal]=useState(false);
  const [nuevoServInline,setNuevoServInline]=useState("");
  const [replicarStep,setReplicarStep]=useState(null); // null | 'modal' | 'confirmar' | 'done'
  const [prepararMesOculto,setPrepararMesOculto]=useState(null);
  const [excluirReplicar,setExcluirReplicar]=useState(new Set());
  const [filtCatReplicar,setFiltCatReplicar]=useState("todos");
  const [mesesAtrasVar,setMesesAtrasVar]=useState(3);
  const [newCatLabel,setNewCatLabel]=useState(""); const [newCatColor,setNewCatColor]=useState("#60a5fa"); const [editCat,setEditCat]=useState(null);
  const [newForma,setNewForma]=useState(""); const [editForma,setEditForma]=useState(null);
  const [selCatServ,setSelCatServ]=useState(""); const [newServ,setNewServ]=useState("");
  const [newFuente,setNewFuente]=useState(""); const [editFuente,setEditFuente]=useState(null);

  const mesKey=getMesKey(mes.y,mes.m);
  const tc=cfg.tipoCambio||1415;
  
  const normalizarFechaConversion = (gasto = {}) => {
  if (gasto.vencimiento) {
    return String(gasto.vencimiento).slice(0, 10);
  }

  if (gasto.fechaOperacion) {
    return String(gasto.fechaOperacion).slice(0, 10);
  }

  if (gasto.fecha_operacion) {
    return String(gasto.fecha_operacion).slice(0, 10);
  }

  const dia = String(gasto.dia || now.getDate()).padStart(2, "0");
  return `${mesKey}-${dia}`;
};

const resolverTipoCambioPorFecha = async (gasto = {}) => {
  const fechaConversion = normalizarFechaConversion(gasto);

  try {
    const cotizacion = await getCotizacionPorFecha(fechaConversion, "tarjeta");

    if (cotizacion?.valor !== null && cotizacion?.valor !== undefined) {
      return {
        fechaConversion,
        tipoCambio: Number(cotizacion.valor),
        fuente: cotizacion.fuente || "cotizaciones",
      };
    }
  } catch (error) {
    console.warn("No se encontró cotización para fecha:", fechaConversion, error);
  }

  return {
    fechaConversion,
    tipoCambio: Number(tc || 1),
    fuente: "tipo_cambio_default",
  };
};

const abrirSubconceptosConCotizacion = async (gasto) => {
  const cotizacion = await resolverTipoCambioPorFecha(gasto);

  setSubconceptosGasto({
    ...gasto,
    fechaConversion: cotizacion.fechaConversion,
    tcConversion: cotizacion.tipoCambio,
    fuenteTC: cotizacion.fuente,
  });
};

// ======================================================
// 🔄 EFECTOS (Carga inicial / sincronización)
// ======================================================

  // Guardar en localStorage cada vez que cambian los datos
  useEffect(()=>{ try{localStorage.setItem("gapp_v7",JSON.stringify(data));}catch{} },[data]);
  useEffect(()=>{ try{localStorage.setItem("gcfg_v7",JSON.stringify(cfg));}catch{} },[cfg]);
  useEffect(()=>{ try{localStorage.setItem("grec_v7",JSON.stringify(recurrentes));}catch{} },[recurrentes]);

// Fuente principal de lectura: Neon vía API
useEffect(() => {
  if (!authUser) return;

  const cargarDesdeApi = async () => {
    try {
      const catalogosApi = await getCatalogos();
      const movimientosApi = await getMovimientos("2026-04");

      const nuevoCfg = mapCatalogosDesdeApi(catalogosApi);
      const nuevoData = mapMovimientosDesdeApi(movimientosApi, "2026-04");

      setCfg(nuevoCfg);
      setData(nuevoData);

    } catch (e) {
      console.error("Error:", e);
    }
  };

  cargarDesdeApi();
}, [authUser?.usuarioId]);

  const toast_=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2400); };

  const gastosDelMes=data.gastos[mesKey]||[];
const ingresosDelMes=data.ingresos[mesKey]||[];
const sueldoDelMes=data.sueldo[mesKey]||0;

useEffect(() => {
  setSueldoInput(sueldoDelMes ? String(sueldoDelMes) : "");
}, [sueldoDelMes, mesKey]);
  const toARS_=(g)=>montoReal(g,tc);
  const totalGastos=gastosDelMes.reduce((a,g)=>a+toARS_(g),0);
  const totalPagado=gastosDelMes.filter(g=>g.estado==="pagado").reduce((a,g)=>a+toARS_(g),0);
  const totalPendiente=gastosDelMes.filter(g=>g.estado==="pendiente").reduce((a,g)=>a+toARS_(g),0);
  const totalUSD_=gastosDelMes.reduce((a,g)=>a+montoUSDReal(g),0);
  const totalIngresosExtras=ingresosDelMes.reduce((a,i)=>a+Number(i.monto),0);
  const totalIngresos=totalIngresosExtras+Number(sueldoDelMes);
  const diaActualMes = mes.y === now.getFullYear() && mes.m === now.getMonth() ? now.getDate() : new Date(mes.y, mes.m + 1, 0).getDate();
  const diasDelMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const ingresosHoy = ingresosDelMes.filter(i=>Number(i.dia)===diaActualMes).reduce((a,i)=>a+Number(i.monto||0),0);
  const movimientosIngresosMes = ingresosDelMes.length + (Number(sueldoDelMes)>0 ? 1 : 0);
  const promedioDiarioIngresos = diaActualMes > 0 ? totalIngresos / diaActualMes : 0;
  const proyeccionIngresosMes = promedioDiarioIngresos * diasDelMes;
  const metaIngresosMes = Math.max(Number(sueldoDelMes || 0), totalIngresos, 1);
  const avanceIngresosPct = Math.min(100, Math.round((totalIngresos / metaIngresosMes) * 100));
  const ingresosPorFuente = (cfg.fuentesIngreso || FUENTES_INGRESO_GENERICAS).map((fuente, idx)=>{
    const items = ingresosDelMes.filter(i=>normalizarFuenteIngreso(i.fuente)===fuente);
    const total = items.reduce((a,i)=>a+Number(i.monto||0),0);
    return { fuente, total, items, color: COLORES[idx % COLORES.length] };
  }).filter(f=>f.total>0 || f.fuente===ingForm.fuente);
  const fuenteMayorIngreso = ingresosPorFuente.filter(f=>f.total>0).sort((a,b)=>b.total-a.total)[0] || null;
  const saldo=totalIngresos-totalGastos;
  const saldoColor=saldo>=0?"#4ade80":"#f87171";
  const gastosPorCat=cfg.categorias.map(cat=>({...cat,total:gastosDelMes.filter(g=>g.categoria===cat.id).reduce((a,g)=>a+toARS_(g),0),items:gastosDelMes.filter(g=>g.categoria===cat.id)}));
  const [filtroCatInicio,setFiltroCatInicio]=useState(null); // categoría seleccionada desde inicio
  const gastosFiltrados=filtroEstado==="todos"?gastosDelMes:gastosDelMes.filter(g=>g.estado===filtroEstado);
  const gastosPorCatF=cfg.categorias.map(cat=>({...cat,items:gastosFiltrados.filter(g=>g.categoria===cat.id),total:gastosFiltrados.filter(g=>g.categoria===cat.id).reduce((a,g)=>a+toARS_(g),0)}));
  const [busqueda,setBusqueda]=useState("");
  const [mostrarTodosConceptos,setMostrarTodosConceptos]=useState(false);
  const gastosPorCatFiltrado2=cfg.categorias
    .filter(cat=>!filtroCatInicio||cat.id===filtroCatInicio)
    .map(cat=>({
      ...cat,
      items:gastosFiltrados.filter(g=>g.categoria===cat.id&&(busqueda===""||g.servicio.toLowerCase().includes(busqueda.toLowerCase()))),
      total:gastosFiltrados.filter(g=>g.categoria===cat.id&&(busqueda===""||g.servicio.toLowerCase().includes(busqueda.toLowerCase()))).reduce((a,g)=>a+toARS_(g),0)
    }));
  const todosVenc=Object.values(data.gastos).flat().filter(g=>g.estado==="pendiente"&&g.vencimiento);
  const vencUrgentes=todosVenc.filter(g=>{ const d=diasRestantes(g.vencimiento); return d!==null&&d<=7; }).length;

  const alertasProximas = todosVenc
  .map(g => ({
    ...g,
    dias: diasRestantes(g.vencimiento),
    montoARS: toARS_(g)
  }))
  .filter(g => g.dias !== null && g.dias >= 0 && g.dias <= 3)
  .sort((a, b) => {
    if (a.dias !== b.dias) return a.dias - b.dias;
    return b.montoARS - a.montoARS;
  });

const cantidadAlertasProximas = alertasProximas.length;
const totalAlertasProximas = alertasProximas.reduce((acc, g) => acc + g.montoARS, 0);
const mayorAlertaProxima = alertasProximas.length > 0 ? alertasProximas[0] : null;

// ── Home Premium: métricas ejecutivas del mes ───────────────────────────────
const porcentajeUsoIngreso = totalIngresos > 0 ? Math.round((totalGastos / totalIngresos) * 100) : 0;
const porcentajeSaldoIngreso = totalIngresos > 0 ? Math.round((saldo / totalIngresos) * 100) : 0;
const gastosOrdenadosPorMonto = [...gastosDelMes].sort((a, b) => toARS_(b) - toARS_(a));
const gastoMayorDelMes = gastosOrdenadosPorMonto[0] || null;
const categoriasConGasto = gastosPorCat.filter((cat) => cat.total > 0).sort((a, b) => b.total - a.total);
const categoriaMayorDelMes = categoriasConGasto[0] || null;
const totalOperacionesMes = gastosDelMes.length;
const ticketPromedioMes = totalOperacionesMes > 0 ? totalGastos / totalOperacionesMes : 0;
const pagosRealizadosPct = totalGastos > 0 ? Math.round((totalPagado / totalGastos) * 100) : 0;
const saludFinanciera =
  totalIngresos <= 0
    ? { label: "Sin ingresos cargados", color: "#94a3b8", icon: "🧭", detalle: "Cargá ingresos para calcular tu margen real." }
    : saldo >= 0 && porcentajeUsoIngreso <= 70
      ? { label: "Muy saludable", color: "#4ade80", icon: "🟢", detalle: "Hay margen para ahorrar o anticipar pagos." }
      : saldo >= 0 && porcentajeUsoIngreso <= 90
        ? { label: "Controlado", color: "#fbbf24", icon: "🟡", detalle: "Venís bien; mantené bajo control los gastos principales." }
        : saldo >= 0
          ? { label: "Ajustado", color: "#fb923c", icon: "🟠", detalle: "Queda poco margen: priorizá pagos y evitá gastos nuevos." }
          : { label: "En rojo", color: "#f87171", icon: "🔴", detalle: "Los gastos superan los ingresos: toca ordenar prioridades." };
const recomendacionHome =
  totalIngresos <= 0
    ? "Cargá tus ingresos para ver capacidad real de ahorro y presión de gastos."
    : saldo < 0
      ? `Revisá primero ${categoriaMayorDelMes?.label || "la categoría principal"}: concentra ${categoriaMayorDelMes ? fmtARS(categoriaMayorDelMes.total) : fmtARS(0)}.`
      : totalPendiente > 0
        ? `Tenés ${fmtARS(totalPendiente)} pendiente. Conviene priorizar vencimientos antes de sumar nuevos gastos.`
        : `Cierre prolijo: te queda ${fmtARS(saldo)} disponible. Buen momento para separar ahorro.`;
const accionesHome = [
  totalIngresos <= 0 && { icon:"💰", titulo:"Cargar ingresos", detalle:"Sumalos para medir tu margen real." },
  saldo < 0 && { icon:"🧯", titulo:"Reducir presión", detalle:"Revisá primero los gastos más altos." },
  cantidadAlertasProximas > 0 && { icon:"⚠️", titulo:"Atender vencimientos", detalle:`Hay ${cantidadAlertasProximas} vencimiento${cantidadAlertasProximas > 1 ? "s" : ""} urgente${cantidadAlertasProximas > 1 ? "s" : ""}.` },
  totalPendiente > 0 && { icon:"⏳", titulo:"Ordenar pagos pendientes", detalle:`Quedan ${fmtARS(totalPendiente)} sin pagar.` },
  categoriaMayorDelMes && { icon:"🔎", titulo:"Revisar mayor foco", detalle:`${categoriaMayorDelMes.label} explica ${totalGastos > 0 ? Math.round((categoriaMayorDelMes.total / totalGastos) * 100) : 0}% del gasto.` },
  saldo > 0 && totalPendiente === 0 && { icon:"🏦", titulo:"Reservar ahorro", detalle:`Reservá una parte de ${fmtARS(saldo)} antes del próximo mes.` },
].filter(Boolean).slice(0, 2);
const topCategoriasHome = categoriasConGasto.slice(0, 3);


const crearRankingAnalisis = (items, obtenerClave, obtenerMeta = () => ({})) => {
  const mapa = new Map();

  items.forEach((g) => {
    const clave = obtenerClave(g) || "Sin definir";
    const meta = obtenerMeta(g) || {};
    const actual = mapa.get(clave) || {
      nombre: clave,
      total: 0,
      totalUSD: 0,
      cantidad: 0,
      color: meta.color || "#64748b",
      items: [],
    };

    actual.total += toARS_(g);
    actual.totalUSD += montoUSDReal(g);
    actual.cantidad += 1;
    actual.items.push(g);

    if (!actual.color && meta.color) actual.color = meta.color;
    mapa.set(clave, actual);
  });

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

const crearRankingEtiquetas = (items) => {
  const mapa = new Map();

  items.forEach((g) => {
    const etiquetas = Array.isArray(g.etiquetas) && g.etiquetas.length
      ? g.etiquetas
      : [{ nombre: "Sin etiqueta", color: "#64748b" }];

    etiquetas.forEach((tag) => {
      const nombre = tag.nombre || "Sin etiqueta";
      const actual = mapa.get(nombre) || {
        nombre,
        total: 0,
        totalUSD: 0,
        cantidad: 0,
        color: tag.color || "#64748b",
        items: [],
      };

      actual.total += toARS_(g);
      actual.totalUSD += montoUSDReal(g);
      actual.cantidad += 1;
      actual.items.push(g);
      mapa.set(nombre, actual);
    });
  });

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

const analisisPorMedio = crearRankingAnalisis(
  gastosDelMes,
  (g) => g.medioPagoNombre || g.medioPago || g.categoriaNombre || "Sin definir",
  (g) => ({ color: g.medioPagoColor })
);

const analisisPorCategoriaReal = crearRankingAnalisis(
  gastosDelMes,
  (g) => g.categoriaGastoNombre || g.categoriaGasto || "Sin categoría",
  (g) => ({ color: g.categoriaGastoColor })
);

const analisisPorInstrumento = crearRankingAnalisis(
  gastosDelMes,
  (g) => g.instrumentoNombre || g.instrumento || g.formaPago || "Sin instrumento"
);

const analisisPorEtiqueta = crearRankingEtiquetas(gastosDelMes);

const opcionesAnalisis = [
  { id: "medio", label: "Medio", icon: "🏦", items: analisisPorMedio, descripcion: "Dónde se concentra el gasto." },
  { id: "categoria", label: "Categoría", icon: "🧩", items: analisisPorCategoriaReal, descripcion: "En qué se está gastando." },
  { id: "instrumento", label: "Instrumento", icon: "💳", items: analisisPorInstrumento, descripcion: "Cómo se está pagando." },
  { id: "etiqueta", label: "Etiqueta", icon: "🏷️", items: analisisPorEtiqueta, descripcion: "Qué tipo de gasto domina." },
];

const analisisActual = opcionesAnalisis.find((o) => o.id === analisisTab) || opcionesAnalisis[0];
const mayorAnalisis = analisisActual.items[0] || null;
const maxAnalisis = Math.max(...analisisActual.items.map((x) => x.total), 1);

const esDolarConcepto = (nombre) => cfg.conceptosDolar?.includes(nombre);

const normalizarTexto = (txt = "") =>
  String(txt)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const gastosDelMesActual = data.gastos[mesKey] || [];

const buscarGastoSimilar = (formActual) => {
  if (!formActual.servicio || !formActual.categoria) return null;

  return gastosDelMesActual.find((g) =>
    normalizarTexto(g.servicio) === normalizarTexto(formActual.servicio) &&
    g.categoria === formActual.categoria
  ) || null;
};

const contarRepeticionesServicio = (servicio) => {
  return gastosDelMesActual.filter(
    (g) => normalizarTexto(g.servicio) === normalizarTexto(servicio)
  ).length;
};

const gastoCompuestoExistente = buscarGastoSimilar(form);

const gastoTieneDesglose = (g) =>
  !!g && Array.isArray(g.subconceptos) && g.subconceptos.length > 0;

const esServicioCompuesto = (nombre) => {
  if (!nombre) return false;

  const similar = gastosDelMesActual.find(
    (g) => normalizarTexto(g.servicio) === normalizarTexto(nombre)
  );

  const repeticiones = contarRepeticionesServicio(nombre);

  return (
    esDolarConcepto(nombre) ||
    gastoTieneDesglose(similar) ||
    repeticiones >= 2
  );
};

const sugerenciaCarga = {
  candidatoExistente: gastoCompuestoExistente,
  accionSugerida: gastoCompuestoExistente ? "existente" : "nuevo",
  tipoSugerido:
  gastoCompuestoExistente
    ? (gastoTieneDesglose(gastoCompuestoExistente) ? "detalle" : "simple")
    : esServicioCompuesto(form.servicio)
      ? "detalle"
      : "simple",
};

useEffect(() => {
  if (!form.servicio) return;
  if (form.decisionManual) return;

  if (sugerenciaCarga.candidatoExistente || esServicioCompuesto(form.servicio)) {
    setForm((prev) => ({
      ...prev,
      tipoGasto: sugerenciaCarga.tipoSugerido,
      accionCompuesto: sugerenciaCarga.accionSugerida,
      monto: sugerenciaCarga.tipoSugerido === "detalle" ? "" : prev.monto,
    }));
  }
}, [form.servicio, form.categoria, mesKey, data.gastos]);

// ======================================================
// 🧩 HANDLERS (acciones del usuario / CRUD / cambios de estado)
// ======================================================
const calcularTotalARSDetalle = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((acc, item) => {
    const monedaItem = String(item.moneda || "ARS").trim().toUpperCase();
    const monto = Number(item.monto ?? item.montoUSD ?? 0);

    const montoARSGuardado = item.montoARSCalculado ?? item.monto_ars_calculado;
    if (
      montoARSGuardado !== null &&
      montoARSGuardado !== undefined &&
      montoARSGuardado !== "" &&
      Number.isFinite(Number(montoARSGuardado))
    ) {
      return acc + Number(montoARSGuardado);
    }

    if (monedaItem === "USD") {
      const tipoCambio = Number(item.tipoCambio ?? item.tipo_cambio ?? tc ?? 1);
      return acc + monto * (Number.isFinite(tipoCambio) ? tipoCambio : 1);
    }

    return acc + monto;
  }, 0);
};

const tieneSubconceptosValidos = (items = []) => Array.isArray(items) && items.length > 0;

const guardarGasto = async (extra = {}) => {
  let f = { ...form, ...extra };

  if (!f.servicio) {
    toast_("Completá el concepto", "err");
    return;
  }

  if (f.tipoGasto !== "detalle" && !f.monto) {
    toast_("Ingresá el monto", "err");
    return;
  }

  if (f.tipoGasto === "detalle" && (!f.subconceptos || f.subconceptos.length === 0)) {
    toast_("Agregá al menos un ítem al desglose", "err");
    return;
  }

  const usarExistente =
    f.accionCompuesto === "existente" &&
    !!gastoCompuestoExistente;

  if (usarExistente) {
    try {
      const subconceptosFinales =
        f.tipoGasto === "detalle"
          ? [
              ...(gastoCompuestoExistente.subconceptos || []),
              ...(f.subconceptos || []),
            ]
          : (gastoCompuestoExistente.subconceptos || []);

      const montoFinal =
        f.tipoGasto === "detalle" && tieneSubconceptosValidos(subconceptosFinales)
          ? calcularTotalARSDetalle(subconceptosFinales)
          : Number(gastoCompuestoExistente.monto || 0) + Number(f.monto || 0);

      await actualizarGasto({
        id: gastoCompuestoExistente.id,
        periodo: mesKey,
        dia: gastoCompuestoExistente.dia,
        categoria: gastoCompuestoExistente.categoria || categoriaLegacyDesdeMedioPagoId(gastoCompuestoExistente.medioPagoId || f.medioPagoId),
        formaPago: gastoCompuestoExistente.formaPago || formaPagoLegacyDesdeInstrumentoId(gastoCompuestoExistente.instrumentoId || f.instrumentoId),
        conceptoId: gastoCompuestoExistente.conceptoId || gastoCompuestoExistente.concepto_id || f.conceptoId || null,
        medioPagoId: gastoCompuestoExistente.medioPagoId || f.medioPagoId || medioPagoDesdeCategoriaLegacy(gastoCompuestoExistente.categoria),
        instrumentoId: gastoCompuestoExistente.instrumentoId || f.instrumentoId || instrumentoDesdeFormaPagoLegacy(gastoCompuestoExistente.formaPago),
        categoriaGastoId: gastoCompuestoExistente.categoriaGastoId || f.categoriaGastoId || categoriaGastoDesdeServicio(gastoCompuestoExistente.servicio),
        etiquetasIds: gastoCompuestoExistente.etiquetasIds || f.etiquetasIds || etiquetasDesdeServicio(gastoCompuestoExistente.servicio),
        servicio: gastoCompuestoExistente.servicio,
        monto: montoFinal,
        moneda: gastoCompuestoExistente.moneda || f.moneda || "ARS",
        estado: gastoCompuestoExistente.estado || f.estado || "pagado",
        observacion: gastoCompuestoExistente.observacion || "",
        vencimiento: gastoCompuestoExistente.vencimiento || null,
        esRecurrente: !!gastoCompuestoExistente.esRecurrente,
        subconceptos: subconceptosFinales,
      });

      const movimientosApi = await getMovimientos(mesKey);
      const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

      setData((prev) => ({
        ...prev,
        gastos: {
          ...prev.gastos,
          [mesKey]: nuevoData.gastos[mesKey] || [],
        },
        ingresos: {
          ...prev.ingresos,
          [mesKey]: nuevoData.ingresos[mesKey] || [],
        },
        sueldo: {
          ...prev.sueldo,
          [mesKey]: nuevoData.sueldo[mesKey] || 0,
        },
      }));

      setForm({
        categoria: "",
        formaPago: "",
        servicio: "",
        monto: "",
        moneda: "ARS",
        estado: "pagado",
        observacion: "",
        dia: String(now.getDate()),
        esRecurrente: false,
        vencimiento: "",
        subconceptos: [],
        conceptoId: "",
        medioPagoId: "",
        instrumentoId: "",
        categoriaGastoId: "",
        etiquetasIds: [],
        tipoGasto: "simple",
        accionCompuesto: "nuevo",
        decisionManual: false,
        crearConceptoPendiente: false,
      });

      toast_("✅ Gasto actualizado");
      return;
    } catch (e) {
      console.error(e);
      toast_("No se pudo actualizar el gasto existente", "err");
      return;
    }
  }

if (!f.conceptoId && f.crearConceptoPendiente && !f.decisionManual) {
  try {
    const nombreConcepto = String(f.servicio || "").trim();

    if (!nombreConcepto) {
      toast_("Escribí el nombre del concepto", "err");
      return;
    }

    const conceptoCreado = await crearConcepto({
      nombre: nombreConcepto,
      workspaceId: "ws_default",
      tipoMovimiento: "GASTO",
      categoriaGastoId: f.categoriaGastoId || "cg_otros",
      medioPagoId: f.medioPagoId || "mp_sin_definir",
      instrumentoId: f.instrumentoId || "ins_manual",
      monedaDefault: f.moneda || "ARS",
      etiquetasIds: f.etiquetasIds?.length ? f.etiquetasIds : ["tag_variable"],
    });

    const catalogosApi = await getCatalogos();
    const cfgActualizada = mapCatalogosDesdeApi(catalogosApi, tc);
    setCfg(cfgActualizada);

    const conceptoActualizado =
      (cfgActualizada.conceptos || []).find((c) => c.id === conceptoCreado.concepto_id) ||
      (cfgActualizada.conceptos || []).find(
        (c) => String(c.nombre || "").trim().toLowerCase() === nombreConcepto.toLowerCase()
      );

    if (conceptoActualizado) {
      f = {
        ...f,
        conceptoId: conceptoActualizado.id,
        servicio: conceptoActualizado.nombre,
        medioPagoId: conceptoActualizado.medioPagoId || f.medioPagoId || "mp_sin_definir",
        instrumentoId: conceptoActualizado.instrumentoId || f.instrumentoId || "ins_manual",
        categoriaGastoId: conceptoActualizado.categoriaGastoId || f.categoriaGastoId || "cg_otros",
        etiquetasIds: conceptoActualizado.etiquetasIds?.length
          ? conceptoActualizado.etiquetasIds
          : f.etiquetasIds || [],
        moneda: conceptoActualizado.monedaDefault || f.moneda || "ARS",
        categoria: categoriaLegacyDesdeMedioPagoId(
          conceptoActualizado.medioPagoId || f.medioPagoId || "mp_sin_definir"
        ),
        formaPago: formaPagoLegacyDesdeInstrumentoId(
          conceptoActualizado.instrumentoId || f.instrumentoId || "ins_manual"
        ),
        crearConceptoPendiente: false,
      };
    }
  } catch (e) {
    console.error(e);
    toast_(e.message || "No se pudo crear el concepto", "err");
    return;
  }
}

try {
  const subconceptosPayload = f.subconceptos || [];
  const montoCabecera = tieneSubconceptosValidos(subconceptosPayload)
    ? calcularTotalARSDetalle(subconceptosPayload)
    : Number(f.monto || 0);

  await crearGasto({
    periodo: mesKey,
    dia: f.dia,
    categoria: f.categoria || categoriaLegacyDesdeMedioPagoId(f.medioPagoId),
    formaPago: f.formaPago || formaPagoLegacyDesdeInstrumentoId(f.instrumentoId),
    conceptoId: f.conceptoId || null,
    medioPagoId: f.medioPagoId || medioPagoDesdeCategoriaLegacy(f.categoria),
    instrumentoId: f.instrumentoId || instrumentoDesdeFormaPagoLegacy(f.formaPago),
    categoriaGastoId: f.categoriaGastoId || categoriaGastoDesdeServicio(f.servicio),
    etiquetasIds: f.etiquetasIds?.length ? f.etiquetasIds : etiquetasDesdeServicio(f.servicio),
    servicio: f.servicio,
    monto: montoCabecera,
    moneda: f.moneda || "ARS",
    estado: f.estado || "pagado",
    observacion: f.observacion || "",
    vencimiento: f.vencimiento || null,
    esRecurrente: !!f.esRecurrente,
    subconceptos: subconceptosPayload,
  });

  const movimientosApi = await getMovimientos(mesKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [mesKey]: nuevoData.gastos[mesKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [mesKey]: nuevoData.ingresos[mesKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [mesKey]: nuevoData.sueldo[mesKey] || 0,
      },
    }));

    setForm({
      categoria: "",
      formaPago: "",
      servicio: "",
      monto: "",
      moneda: "ARS",
      estado: "pagado",
      observacion: "",
      dia: String(now.getDate()),
      esRecurrente: false,
      vencimiento: "",
      subconceptos: [],
      conceptoId: "",
      medioPagoId: "",
      instrumentoId: "",
      categoriaGastoId: "",
      etiquetasIds: [],
      tipoGasto: "simple",
      accionCompuesto: "nuevo",
      decisionManual: false,
      crearConceptoPendiente: false,
    });

    toast_("¡Gasto guardado en Neon!");
  } catch (e) {
    console.error(e);
    toast_("No se pudo guardar en Neon", "err");
  }
};

  const _guardarNuevo=(f)=>{
    const nuevo={...f,monto:Number(f.monto),id:Date.now(),subconceptos:f.subconceptos||[]};
    setData(prev=>{
      const updated={...prev,gastos:{...prev.gastos,[mesKey]:[...(prev.gastos[mesKey]||[]),nuevo]}};
      syncSheets("gastos", mesKey, updated.gastos[mesKey]);
      return updated;
    });
    if(f.esRecurrente&&!f.recurrenteId) setRecurrentes(prev=>[...prev,{id:Date.now()+1,categoria:f.categoria,formaPago:f.formaPago,servicio:f.servicio,monto:f.monto,moneda:f.moneda,observacion:f.observacion}]);
    setForm(p=>({...p,servicio:"",monto:"",observacion:"",dia:String(now.getDate()),esRecurrente:false,vencimiento:"",subconceptos:[]}));
    toast_("¡Gasto guardado!");
  };

  const handleAcumular=()=>{
    const {existente,nuevo}=acumModal;
    setData(prev=>{
      const updated={...prev,gastos:{...prev.gastos,[mesKey]:prev.gastos[mesKey].map(g=>g.id===existente.id?{...g,monto:g.monto+nuevo.monto}:g)}};
      syncSheets("gastos", mesKey, updated.gastos[mesKey]);
      return updated;
    });
    setAcumModal(null);
    setForm(p=>({...p,servicio:"",monto:"",observacion:"",dia:String(now.getDate()),esRecurrente:false,vencimiento:"",subconceptos:[]}));
    toast_(`+${fmtARS(nuevo.monto)} sumado a ${existente.servicio}`);
  };
  const handleNuevaNota=()=>{ _guardarNuevo(acumModal.nuevo); setAcumModal(null); };

  const handleEditSave = async (gastoEditado) => {
  const key = editingMesKey || mesKey;

  try {
	  await actualizarGasto({
      id: gastoEditado.id,
      periodo: key,
      dia: gastoEditado.dia,
      categoria: gastoEditado.categoria,
      formaPago: gastoEditado.formaPago,
      medioPagoId: gastoEditado.medioPagoId || medioPagoDesdeCategoriaLegacy(gastoEditado.categoria),
      instrumentoId: gastoEditado.instrumentoId || instrumentoDesdeFormaPagoLegacy(gastoEditado.formaPago),
      categoriaGastoId: gastoEditado.categoriaGastoId || categoriaGastoDesdeServicio(gastoEditado.servicio),
      etiquetasIds: gastoEditado.etiquetasIds || gastoEditado.etiquetas?.map(e => e.id || e.etiquetaId) || etiquetasDesdeServicio(gastoEditado.servicio),
      servicio: gastoEditado.servicio,
      monto: Number(gastoEditado.monto || 0),
      moneda: gastoEditado.moneda || "ARS",
      estado: gastoEditado.estado || "pendiente",
      observacion: gastoEditado.observacion || "",
      vencimiento: gastoEditado.vencimiento || null,
      esRecurrente: !!gastoEditado.esRecurrente,
      subconceptos: gastoEditado.subconceptos || [],
    });

    const movimientosApi = await getMovimientos(key);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, key);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [key]: nuevoData.gastos[key] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [key]: nuevoData.ingresos[key] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [key]: nuevoData.sueldo[key] || 0,
      },
    }));

    setEditingGasto(null);
    setEditingMesKey(null);
    toast_("✅ Cambios guardados en Neon");
  } catch (e) {
    console.error("ERROR EN handleEditSave", e);
    toast_("No se pudo editar en Neon", "err");
  }
};

const handleSubconceptosSave = (items) => {
  if (!subconceptosGasto) return;

  const monedaBase = subconceptosGasto.moneda || editingGasto?.moneda || form.moneda || "ARS";
const tcAplicable = Number(subconceptosGasto.tcConversion || tc || 1);

  const itemsNormalizados = (items || []).map((it, idx) => {
    const monedaItem = String(it.moneda || monedaBase || "ARS").trim().toUpperCase();
    const monto = Number(it.monto ?? it.montoUSD ?? 0);

    const tipoCambio =
      it.tipoCambio !== null && it.tipoCambio !== undefined && it.tipoCambio !== ""
        ? Number(it.tipoCambio)
        : monedaItem === "USD"
          ? tcAplicable
          : null;

    const montoARSCalculado =
      it.montoARSCalculado !== null &&
      it.montoARSCalculado !== undefined &&
      it.montoARSCalculado !== ""
        ? Number(it.montoARSCalculado)
        : monedaItem === "USD"
          ? monto * Number(tipoCambio || tcAplicable || 1)
          : monto;

    return {
      id: it.id || it.detalleId || `det_tmp_${Date.now()}_${idx}`,
      nombre: it.nombre || it.nombreItem || "Item",
      monto,
      moneda: monedaItem,
      tipoCambio,
      montoARSCalculado,
      orden: it.orden || idx + 1,
      observacion: it.observacion || "",
    };
  });

  if (editingGasto && editingGasto.id === subconceptosGasto.id) {
    setEditingGasto((prev) => ({
      ...prev,
      moneda: prev.moneda || monedaBase,
      subconceptos: itemsNormalizados,
    }));
  } else {
    setForm((prev) => ({
      ...prev,
      moneda: prev.moneda || monedaBase,
      subconceptos: itemsNormalizados,
      accionCompuesto: prev.accionCompuesto,
    }));
  }

  setSubconceptosGasto(null);
  toast_("🧾 Desglose guardado");
};

  const openEdit=(g,key=null)=>{ setEditingGasto({...g}); setEditingMesKey(key); };
 const toggleEstado = async (id) => {
  try {
    const gastoActual = (data.gastos[mesKey] || []).find((g) => g.id === id);

    if (!gastoActual) {
      toast_("No se encontró el gasto", "err");
      return;
    }

    const nuevoEstado =
      gastoActual.estado === "pagado" ? "pendiente" : "pagado";

    await actualizarGasto({
      id: gastoActual.id,
      periodo: mesKey,
      dia: gastoActual.dia,
      categoria: gastoActual.categoria,
      formaPago: gastoActual.formaPago,
      medioPagoId: gastoActual.medioPagoId || medioPagoDesdeCategoriaLegacy(gastoActual.categoria),
      instrumentoId: gastoActual.instrumentoId || instrumentoDesdeFormaPagoLegacy(gastoActual.formaPago),
      categoriaGastoId: gastoActual.categoriaGastoId || categoriaGastoDesdeServicio(gastoActual.servicio),
      etiquetasIds: gastoActual.etiquetasIds || gastoActual.etiquetas?.map(e => e.id || e.etiquetaId) || etiquetasDesdeServicio(gastoActual.servicio),
      servicio: gastoActual.servicio,
      monto: Number(gastoActual.monto || 0),
      moneda: gastoActual.moneda || "ARS",
      estado: nuevoEstado,
      observacion: gastoActual.observacion || "",
      vencimiento: gastoActual.vencimiento || null,
      esRecurrente: !!gastoActual.esRecurrente,
      subconceptos: gastoActual.subconceptos || [],
    });

    const movimientosApi = await getMovimientos(mesKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [mesKey]: nuevoData.gastos[mesKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [mesKey]: nuevoData.ingresos[mesKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [mesKey]: nuevoData.sueldo[mesKey] || 0,
      },
    }));

    toast_(
      nuevoEstado === "pagado"
        ? "Marcado como pagado"
        : "Marcado como pendiente"
    );
  } catch (e) {
    console.error(e);
    toast_("No se pudo actualizar el estado en Neon", "err");
  }
};
 const guardarIngreso = async () => {
  if (!ingForm.fuente) {
    toast_("Seleccioná una fuente", "err");
    return;
  }

  if (!ingForm.monto || Number(ingForm.monto) <= 0) {
    toast_("Ingresá un monto válido", "err");
    return;
  }

  if (!ingForm.dia || Number(ingForm.dia) < 1 || Number(ingForm.dia) > 31) {
    toast_("Ingresá un día válido", "err");
    return;
  }

  try {
    await crearIngreso({
      periodo: mesKey,
      dia: Number(ingForm.dia),
      fuente: ingForm.fuente,
      monto: Number(ingForm.monto),
    });

    const movimientosApi = await getMovimientos(mesKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [mesKey]: nuevoData.gastos[mesKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [mesKey]: nuevoData.ingresos[mesKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [mesKey]: nuevoData.sueldo[mesKey] || 0,
      },
    }));

    setIngForm((f) => ({
      ...f,
      fuente: "",
      monto: "",
      dia: String(now.getDate()),
    }));

    toast_("¡Ingreso guardado en Neon!");
  } catch (e) {
    console.error(e);
    toast_("No se pudo guardar ingreso en Neon", "err");
  }
};

const guardarSueldo = async () => {
  if (!sueldoInput || Number(sueldoInput) <= 0) {
    toast_("Ingresá un sueldo válido", "err");
    return;
  }

  try {
    await guardarSueldoNeon({
      periodo: mesKey,
      monto: Number(sueldoInput),
    });

    const movimientosApi = await getMovimientos(mesKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [mesKey]: nuevoData.gastos[mesKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [mesKey]: nuevoData.ingresos[mesKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [mesKey]: nuevoData.sueldo[mesKey] || 0,
      },
    }));

    setSueldoInput("");
    toast_("Sueldo guardado en Neon");
  } catch (e) {
    console.error(e);
    toast_("No se pudo guardar sueldo en Neon", "err");
  }
};

const eliminar = async (tipo, id) => {
  try {
    if (tipo === "gastos") {
      await eliminarGasto(id);
    } else if (tipo === "ingresos") {
      await eliminarIngreso(id);
    } else {
      toast_("Tipo no soportado", "err");
      setConfirmDel(null);
      return;
    }

    const movimientosApi = await getMovimientos(mesKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [mesKey]: nuevoData.gastos[mesKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [mesKey]: nuevoData.ingresos[mesKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [mesKey]: nuevoData.sueldo[mesKey] || 0,
      },
    }));

    setConfirmDel(null);
    toast_(tipo === "gastos" ? "Gasto eliminado" : "Ingreso eliminado");
  } catch (e) {
    console.error(e);
    setConfirmDel(null);
    toast_("No se pudo eliminar en Neon", "err");
  }
};
  //const eliminar=(tipo,id)=>{ setData(prev=>({...prev,[tipo]:{...prev[tipo],[mesKey]:(prev[tipo][mesKey]||[]).filter(g=>g.id!==id)}})); setConfirmDel(null); toast_("Eliminado","err"); };
  const cambiarMes=(dir)=>setMes(prev=>{ let m=prev.m+dir,y=prev.y; if(m>11){m=0;y++;} if(m<0){m=11;y--;} return{y,m}; });
  const exportCSV=()=>{ const rows=[["Dia","Categoria","Forma Pago","Servicio","Monto","Moneda","USD Total","Estado","Vencimiento","Obs"]]; gastosDelMes.forEach(g=>{ const usd=montoUSDReal(g); rows.push([g.dia,g.categoria,g.formaPago,g.servicio,g.monto,g.moneda,usd||"",g.estado,g.vencimiento||"",g.observacion]); }); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"})); a.download=`gastos_${mesKey}.csv`; a.click(); toast_("CSV exportado"); };

  const addCat=()=>{if(!newCatLabel.trim()){toast_("Ingresá nombre","err");return;}setCfg(p=>({...p,categorias:[...p.categorias,{id:slug(newCatLabel),label:newCatLabel.trim(),color:newCatColor}]}));setNewCatLabel("");setNewCatColor("#60a5fa");toast_("Agregado");};
  const saveCat=()=>{if(!editCat?.label.trim())return;setCfg(p=>({...p,categorias:p.categorias.map(c=>c.id===editCat.id?{...c,label:editCat.label,color:editCat.color}:c)}));setEditCat(null);toast_("Actualizado");};
  const delCat=(id)=>{setCfg(p=>({...p,categorias:p.categorias.filter(c=>c.id!==id)}));toast_("Eliminado","err");};
  const addForma=()=>{if(!newForma.trim()||cfg.formasPago.includes(newForma.trim())){toast_("Verificá","err");return;}setCfg(p=>({...p,formasPago:[...p.formasPago,newForma.trim()]}));setNewForma("");toast_("Agregado");};
  const saveForma=()=>{if(!editForma?.val.trim())return;setCfg(p=>{const fp=[...p.formasPago];fp[editForma.idx]=editForma.val.trim();return{...p,formasPago:fp};});setEditForma(null);toast_("Actualizado");};
  const delForma=(idx)=>{setCfg(p=>({...p,formasPago:p.formasPago.filter((_,i)=>i!==idx)}));toast_("Eliminado","err");};
  const addServ=()=>{if(!selCatServ||!newServ.trim()){toast_("Completá campos","err");return;}setCfg(p=>{const s={...p.servicios};s[selCatServ]=[...(s[selCatServ]||[]),newServ.trim()];return{...p,servicios:s};});setNewServ("");toast_("Agregado");};
  const delServ=(catId,idx)=>{setCfg(p=>{const s={...p.servicios};s[catId]=(s[catId]||[]).filter((_,i)=>i!==idx);return{...p,servicios:s};});toast_("Eliminado","err");};
  const addFuente=()=>{if(!newFuente.trim()||cfg.fuentesIngreso.includes(newFuente.trim())){toast_("Verificá","err");return;}setCfg(p=>({...p,fuentesIngreso:[...p.fuentesIngreso,newFuente.trim()]}));setNewFuente("");toast_("Agregado");};
  const saveFuente=()=>{if(!editFuente?.val.trim())return;setCfg(p=>{const f=[...p.fuentesIngreso];f[editFuente.idx]=editFuente.val.trim();return{...p,fuentesIngreso:f};});setEditFuente(null);toast_("Actualizado");};
  const delFuente=(idx)=>{setCfg(p=>({...p,fuentesIngreso:p.fuentesIngreso.filter((_,i)=>i!==idx)}));toast_("Eliminado","err");};
  const guardarTC=()=>{if(!tcInput)return;setCfg(p=>({...p,tipoCambio:Number(tcInput)}));setTcInput("");toast_("TC actualizado");};

  const refrescarCatalogos = async () => {
    const catalogosApi = await getCatalogos();
    const cfgActualizada = mapCatalogosDesdeApi(catalogosApi, tc);
    setCfg(cfgActualizada);
    return cfgActualizada;
  };

  const abrirEditarConcepto = (concepto) => {
    setEditConcepto({
      id: concepto.id,
      nombre: concepto.nombre || "",
      categoriaGastoId: concepto.categoriaGastoId || "cg_otros",
      medioPagoId: concepto.medioPagoId || "mp_sin_definir",
      instrumentoId: concepto.instrumentoId || "ins_manual",
      monedaDefault: concepto.monedaDefault || "ARS",
      etiquetasIds: Array.isArray(concepto.etiquetasIds) ? concepto.etiquetasIds : [],
      activo: true,
    });
  };

  const toggleEtiquetaConceptoEdit = (etiquetaId) => {
    setEditConcepto((p) => {
      if (!p) return p;
      const actuales = p.etiquetasIds || [];
      const existe = actuales.includes(etiquetaId);
      return {
        ...p,
        etiquetasIds: existe
          ? actuales.filter((id) => id !== etiquetaId)
          : [...actuales, etiquetaId],
      };
    });
  };

  const guardarConceptoEditado = async () => {
    if (!editConcepto?.id) return;
    if (!String(editConcepto.nombre || "").trim()) {
      toast_("Ingresá un nombre para el concepto", "err");
      return;
    }

    try {
      await actualizarConcepto({
        conceptoId: editConcepto.id,
        nombre: editConcepto.nombre.trim(),
        categoriaGastoId: editConcepto.categoriaGastoId || "cg_otros",
        medioPagoId: editConcepto.medioPagoId || "mp_sin_definir",
        instrumentoId: editConcepto.instrumentoId || "ins_manual",
        monedaDefault: editConcepto.monedaDefault || "ARS",
        etiquetasIds: editConcepto.etiquetasIds || [],
        activo: true,
      });

      await refrescarCatalogos();
      setEditConcepto(null);
      toast_("✅ Concepto actualizado");
    } catch (e) {
      console.error(e);
      toast_(e.message || "No se pudo actualizar el concepto", "err");
    }
  };

  const desactivarConceptoCfg = async (concepto) => {
    if (!concepto?.id) return;
    const ok = window.confirm(`¿Desactivar el concepto "${concepto.nombre}"? No se borran gastos históricos.`);
    if (!ok) return;

    try {
      await desactivarConcepto(concepto.id);
      await refrescarCatalogos();
      if (editConcepto?.id === concepto.id) setEditConcepto(null);
      toast_("Concepto desactivado", "err");
    } catch (e) {
      console.error(e);
      toast_(e.message || "No se pudo desactivar el concepto", "err");
    }
  };

  const conceptosConfigFiltrados = (cfg.conceptos || [])
    .filter((c) => String(c.nombre || "").toLowerCase().includes(busquedaConceptoCfg.trim().toLowerCase()))
    .sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es"));

  const mediosConfigFiltrados = (cfg.mediosPago || [])
    .filter((m) => String(m.nombre || "").toLowerCase().includes(busquedaMedioCfg.trim().toLowerCase()))
    .sort((a,b)=>(Number(a.ordenVisual||99)-Number(b.ordenVisual||99)) || String(a.nombre||"").localeCompare(String(b.nombre||""),"es"));

  const abrirEditarMedio = (medio) => {
    setEditMedio({
      id: medio.id,
      nombre: medio.nombre || "",
      tipo: medio.tipo || "otro",
      color: medio.color || "#64748b",
      ordenVisual: medio.ordenVisual ?? 99,
      activo: true,
    });
  };

  const crearMedioPagoCfg = async () => {
    const nombre = String(nuevoMedio.nombre || "").trim();
    if (!nombre) { toast_("Ingresá un nombre para el medio de pago", "err"); return; }
    try {
      await crearMedioPago({ nombre, tipo: nuevoMedio.tipo || "banco", color: nuevoMedio.color || "#60a5fa", ordenVisual: nuevoMedio.ordenVisual ? Number(nuevoMedio.ordenVisual) : undefined, workspaceId: "ws_default" });
      await refrescarCatalogos();
      setNuevoMedio({ nombre:"", tipo:"banco", color:"#60a5fa", ordenVisual:"" });
      toast_("✅ Medio de pago creado");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear el medio de pago", "err"); }
  };

  const guardarMedioEditado = async () => {
    if (!editMedio?.id) return;
    if (!String(editMedio.nombre || "").trim()) { toast_("Ingresá un nombre para el medio de pago", "err"); return; }
    try {
      await actualizarMedioPago({ medioPagoId: editMedio.id, nombre: editMedio.nombre.trim(), tipo: editMedio.tipo || "otro", color: editMedio.color || "#64748b", ordenVisual: Number(editMedio.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditMedio(null);
      toast_("✅ Medio de pago actualizado");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar el medio de pago", "err"); }
  };

  const desactivarMedioPagoCfg = async (medio) => {
    if (!medio?.id) return;
    const ok = window.confirm(`¿Desactivar el medio de pago "${medio.nombre}"? No se borran gastos históricos.`);
    if (!ok) return;
    try {
      await desactivarMedioPago(medio.id);
      await refrescarCatalogos();
      if (editMedio?.id === medio.id) setEditMedio(null);
      toast_("Medio de pago desactivado", "err");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo desactivar el medio de pago", "err"); }
  };

  const categoriasGastoConfigFiltradas = (cfg.categoriasGasto || [])
    .filter((c) => String(c.nombre || "").toLowerCase().includes(busquedaCategoriaGastoCfg.trim().toLowerCase()))
    .sort((a,b)=>(Number(a.ordenVisual||99)-Number(b.ordenVisual||99)) || String(a.nombre||"").localeCompare(String(b.nombre||""),"es"));

  const etiquetasConfigFiltradas = (cfg.etiquetas || [])
    .filter((e) => String(e.nombre || "").toLowerCase().includes(busquedaEtiquetaCfg.trim().toLowerCase()))
    .sort((a,b)=>(Number(a.ordenVisual||99)-Number(b.ordenVisual||99)) || String(a.nombre||"").localeCompare(String(b.nombre||""),"es"));

  const abrirEditarCategoriaGasto = (categoria) => {
    setEditCategoriaGasto({
      id: categoria.id,
      nombre: categoria.nombre || "",
      color: categoria.color || "#64748b",
      ordenVisual: categoria.ordenVisual ?? 99,
      activo: true,
    });
  };

  const crearCategoriaGastoCfg = async () => {
    const nombre = String(nuevaCategoriaGasto.nombre || "").trim();
    if (!nombre) { toast_("Ingresá un nombre para la categoría", "err"); return; }
    try {
      await crearCategoriaGasto({ nombre, color: nuevaCategoriaGasto.color || "#64748b", ordenVisual: nuevaCategoriaGasto.ordenVisual ? Number(nuevaCategoriaGasto.ordenVisual) : undefined, workspaceId: "ws_default" });
      await refrescarCatalogos();
      setNuevaCategoriaGasto({ nombre:"", color:"#60a5fa", ordenVisual:"" });
      toast_("✅ Categoría creada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear la categoría", "err"); }
  };

  const guardarCategoriaGastoEditada = async () => {
    if (!editCategoriaGasto?.id) return;
    if (!String(editCategoriaGasto.nombre || "").trim()) { toast_("Ingresá un nombre para la categoría", "err"); return; }
    try {
      await actualizarCategoriaGasto({ categoriaGastoId: editCategoriaGasto.id, nombre: editCategoriaGasto.nombre.trim(), color: editCategoriaGasto.color || "#64748b", ordenVisual: Number(editCategoriaGasto.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditCategoriaGasto(null);
      toast_("✅ Categoría actualizada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar la categoría", "err"); }
  };

  const desactivarCategoriaGastoCfg = async (categoria) => {
    if (!categoria?.id) return;
    const ok = window.confirm(`¿Desactivar la categoría "${categoria.nombre}"? No se borran gastos históricos.`);
    if (!ok) return;
    try {
      await desactivarCategoriaGasto(categoria.id);
      await refrescarCatalogos();
      if (editCategoriaGasto?.id === categoria.id) setEditCategoriaGasto(null);
      toast_("Categoría desactivada", "err");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo desactivar la categoría", "err"); }
  };

  const abrirEditarEtiqueta = (etiqueta) => {
    setEditEtiqueta({
      id: etiqueta.id,
      nombre: etiqueta.nombre || "",
      color: etiqueta.color || "#64748b",
      ordenVisual: etiqueta.ordenVisual ?? 99,
      activo: true,
    });
  };

  const crearEtiquetaCfg = async () => {
    const nombre = String(nuevaEtiqueta.nombre || "").trim();
    if (!nombre) { toast_("Ingresá un nombre para la etiqueta", "err"); return; }
    try {
      await crearEtiqueta({ nombre, color: nuevaEtiqueta.color || "#64748b", ordenVisual: nuevaEtiqueta.ordenVisual ? Number(nuevaEtiqueta.ordenVisual) : undefined, workspaceId: "ws_default" });
      await refrescarCatalogos();
      setNuevaEtiqueta({ nombre:"", color:"#f97316", ordenVisual:"" });
      toast_("✅ Etiqueta creada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear la etiqueta", "err"); }
  };

  const guardarEtiquetaEditada = async () => {
    if (!editEtiqueta?.id) return;
    if (!String(editEtiqueta.nombre || "").trim()) { toast_("Ingresá un nombre para la etiqueta", "err"); return; }
    try {
      await actualizarEtiqueta({ etiquetaId: editEtiqueta.id, nombre: editEtiqueta.nombre.trim(), color: editEtiqueta.color || "#64748b", ordenVisual: Number(editEtiqueta.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditEtiqueta(null);
      toast_("✅ Etiqueta actualizada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar la etiqueta", "err"); }
  };

  const desactivarEtiquetaCfg = async (etiqueta) => {
    if (!etiqueta?.id) return;
    const ok = window.confirm(`¿Desactivar la etiqueta "${etiqueta.nombre}"? No se borran gastos históricos.`);
    if (!ok) return;
    try {
      await desactivarEtiqueta(etiqueta.id);
      await refrescarCatalogos();
      if (editEtiqueta?.id === etiqueta.id) setEditEtiqueta(null);
      toast_("Etiqueta desactivada", "err");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo desactivar la etiqueta", "err"); }
  };

const ultimoDiaDelMes = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const moverFechaAlMesSiguiente = (fecha) => {
  if (!fecha) return "";

  const fechaStr = String(fecha).slice(0, 10);
  const [anio, mesNumero, diaNumero] = fechaStr.split("-").map(Number);

  if (!anio || !mesNumero || !diaNumero) return "";

  let nuevoMesIndex = mesNumero; // mesNumero viene 1-12; como index siguiente queda igual
  let nuevoAnio = anio;

  if (nuevoMesIndex > 11) {
    nuevoMesIndex = 0;
    nuevoAnio += 1;
  }

  const diaFinal = Math.min(diaNumero, ultimoDiaDelMes(nuevoAnio, nuevoMesIndex));
  return `${nuevoAnio}-${String(nuevoMesIndex + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
};

const moverDiaAlMesSiguiente = (dia, nextKey) => {
  const [anio, mesNumero] = String(nextKey).split("-").map(Number);
  const monthIndex = mesNumero - 1;
  const diaNum = Number(dia || 1);
  const diaFinal = Math.min(
    Number.isFinite(diaNum) && diaNum > 0 ? diaNum : 1,
    ultimoDiaDelMes(anio, monthIndex)
  );

  return String(diaFinal);
};

const prepararSubconceptosParaReplica = (subconceptos = []) => {
  return (subconceptos || []).map((s, idx) => {
    const monedaItem = String(s.moneda || "ARS").trim().toUpperCase();

    return {
      id: undefined,
      nombre: s.nombre || s.nombreItem || "Item",
      monto: Number(s.monto ?? s.montoUSD ?? 0),
      moneda: monedaItem,
      orden: s.orden || idx + 1,
      observacion: s.observacion || "",

      // Importante:
      // Si es USD, NO copiamos tipoCambio ni montoARSCalculado.
      // El backend lo recalcula con la fecha de vencimiento del nuevo mes.
      tipoCambio: monedaItem === "USD" ? null : s.tipoCambio ?? null,
      montoARSCalculado: monedaItem === "USD" ? null : s.montoARSCalculado ?? null,
    };
  });
};

  // ── Replicar mes ──
  const mesKeyAnterior=()=>{ let m=mes.m-1,y=mes.y; if(m<0){m=11;y--;} return getMesKey(y,m); };
  const mesKeySiguiente=()=>{ let m=mes.m+1,y=mes.y; if(m>11){m=0;y++;} return getMesKey(y,m); };
  const mesNombreSig=()=>{ let m=mes.m+1; return MESES[m>11?0:m]; };
  const yaHayMesSiguiente=()=> !!(data.gastos[mesKeySiguiente()]?.length);
  const mostrarReplicar=()=> gastosDelMes.length>0 && !yaHayMesSiguiente() && prepararMesOculto !== mesKey;
  const gastosFuenteReplicar= gastosDelMes;
  const gastosIncluidos= gastosFuenteReplicar.filter(g=>!excluirReplicar.has(g.id));
  const toggleExcluir=(id)=>setExcluirReplicar(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const confirmarReplica = async () => {
  const nextKey = mesKeySiguiente();

  if (!gastosIncluidos.length) {
    toast_("No hay gastos seleccionados para replicar", "err");
    return;
  }

  try {
    for (const g of gastosIncluidos) {
      const subconceptosReplica = prepararSubconceptosParaReplica(g.subconceptos || []);
      const tieneDetalle = subconceptosReplica.length > 0;

      const diaReplica = moverDiaAlMesSiguiente(g.dia, nextKey);
      const vencimientoReplica = g.vencimiento
        ? moverFechaAlMesSiguiente(g.vencimiento)
        : "";

      await crearGasto({
        periodo: nextKey,
        dia: diaReplica,
        categoria: g.categoria,
        formaPago: g.formaPago,
        medioPagoId: g.medioPagoId || medioPagoDesdeCategoriaLegacy(g.categoria),
        instrumentoId: g.instrumentoId || instrumentoDesdeFormaPagoLegacy(g.formaPago),
        categoriaGastoId: g.categoriaGastoId || categoriaGastoDesdeServicio(g.servicio),
        etiquetasIds: g.etiquetasIds || g.etiquetas?.map(e => e.id || e.etiquetaId) || etiquetasDesdeServicio(g.servicio),
        servicio: g.servicio,
        monto: tieneDetalle ? 0 : Number(g.monto || 0),
        moneda: g.moneda || "ARS",
        estado: "pendiente",
        observacion: g.observacion || "",
        vencimiento: vencimientoReplica || null,
        esRecurrente: !!g.esRecurrente,
        subconceptos: subconceptosReplica,
      });
    }

    const movimientosApi = await getMovimientos(nextKey);
    const nuevoData = mapMovimientosDesdeApi(movimientosApi, nextKey);

    setData((prev) => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [nextKey]: nuevoData.gastos[nextKey] || [],
      },
      ingresos: {
        ...prev.ingresos,
        [nextKey]: nuevoData.ingresos[nextKey] || [],
      },
      sueldo: {
        ...prev.sueldo,
        [nextKey]: nuevoData.sueldo[nextKey] || 0,
      },
    }));

    setReplicarStep("done");
    toast_(`✅ ${gastosIncluidos.length} gastos copiados a ${mesNombreSig()}`);
  } catch (e) {
    console.error("Error replicando mes:", e);
    toast_("No se pudo replicar el mes en Neon", "err");
  }
};

// ======================================================
// 💾 BACKUP / RESTORE LOCAL (LEGACY / opcional)
// ======================================================

  // ── Backup / Restore de datos ──────────────────────────────────────────────
  const exportarBackup = () => {
    const backup = { data, config: cfg, recurrentes, version: 'v1', fecha: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mis-finanzas-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast_('💾 Backup descargado');
  };
  const importarBackup = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.data) throw new Error('Archivo inválido');
        setData(backup.data);
        if (backup.config) setCfg(backup.config);
        if (backup.recurrentes) setRecurrentes(backup.recurrentes);
        toast_('✅ Datos restaurados correctamente');
      } catch (err) { toast_('❌ Error al leer el archivo', 'err'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


// ======================================================
// 🧱 HELPERS DE UI (estilos inline y render interno)
// ======================================================

  const lbl={fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:1,marginBottom:8,display:"block"};
  const rowS={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1e1e2e"};
  const ib=(bg,color)=>({background:bg,border:"none",color,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13,fontWeight:600});

  // Render gasto en detalle
  // Render gasto en detalle
const GastoRow=({item})=>{
  const dias=diasRestantes(item.vencimiento);
  const s=item.estado==="pendiente"?semaforo(dias):null;
  const ars=toARS_(item);
  const tieneSubconceptos=item.subconceptos&&item.subconceptos.length>0;
  const totalMostrarARS = montoReal(item, tc);
  const totalUSDDetalle = montoUSDReal(item);

  return(
    <div style={{ padding:"7px 0",borderBottom:"1px solid #1e1e2e",cursor:"pointer",borderRadius:8 }} onClick={()=>openEdit(item)}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
            <div style={{ fontSize:14,fontWeight:500 }}>{item.servicio}</div>
            {tieneSubconceptos&&<span style={{ fontSize:10,color:"#38bdf8",background:"#1e3a5f",padding:"1px 6px",borderRadius:10 }}>🧾 {item.subconceptos.length} ítems</span>}
            <span style={{ fontSize:10,color:"#64748b",marginLeft:"auto" }}>✎</span>
          </div>

          {tieneSubconceptos&&(
            <div style={{ marginBottom:6,padding:"6px 8px",background:"#0f1a2e",borderRadius:10,fontSize:11 }}>
              {item.subconceptos.map(sub=>(
                <div key={sub.id} style={{ display:"flex",justifyContent:"space-between",color:"#64748b",paddingBottom:2 }}>
                  <span>{sub.nombre}</span>
                  <span style={{ color:"#38bdf8",fontFamily:"'Space Mono',monospace" }}>
                    {fmtMonto(
                      Number(sub.monto ?? sub.montoUSD ?? 0),
                      sub.moneda || item.moneda || "ARS"
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:4,alignItems:"center" }}>
            <span onClick={e=>{e.stopPropagation();toggleEstado(item.id);}} style={{ display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:item.estado==="pagado"?"#14532d":"#422006",color:item.estado==="pagado"?"#4ade80":"#fb923c",cursor:"pointer" }}>
              {item.estado==="pagado"?"✅ Pagado":"⏳ Pendiente"}
            </span>
            {item.formaPago==="Débito automático"&&<span style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:700,background:"#1e2a3e",color:"#60a5fa",border:"1px solid #60a5fa33" }}>🏦 Débito auto.</span>}
            {s&&<VencBadge fecha={item.vencimiento} estado={item.estado}/>}
          </div>

          <div style={{ fontSize:11,color:"#64748b" }}>
            {item.dia}/{mes.m+1} · {item.formaPago}{item.vencimiento?` · Vence ${fmtFecha(item.vencimiento)}`:""}{item.observacion?` · ${item.observacion}`:""}
          </div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8 }}>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:totalMostrarARS>0?"#e2e8f0":"#64748b" }}>
            {fmtARS(totalMostrarARS)}
          </div>

          {totalUSDDetalle > 0 && (
            <div style={{ fontSize:11,color:"#a78bfa" }}>
              {fmtUSD(totalUSDDetalle)}
            </div>
          )}

          <button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12 }} onClick={e=>{e.stopPropagation();setConfirmDel({...item,tipo:"gastos"});}}>✕</button>
        </div>
      </div>
    </div>
  );
};

  const esDolar_form = esDolarConcepto(form.servicio);

  const textoConcepto = String(form.servicio || "").trim();
  const textoConceptoLower = textoConcepto.toLowerCase();
  const conceptosDisponibles = cfg.conceptos || [];
  const conceptosFiltrados = conceptosDisponibles.filter((concepto) => {
    if (!textoConceptoLower) return true;
    return String(concepto.nombre || "").toLowerCase().includes(textoConceptoLower);
  });
  const conceptoExacto = conceptosDisponibles.find(
    (concepto) => String(concepto.nombre || "").toLowerCase() === textoConceptoLower
  );
  const conceptosVisibles = mostrarTodosConceptos
    ? conceptosFiltrados
    : conceptosFiltrados.slice(0, textoConceptoLower ? 8 : 10);
 
 const crearConceptoDesdeTexto = () => {
  const nombre = String(form.servicio || "").trim();

  if (!nombre) {
    toast_("Escribí el nombre del concepto", "err");
    return;
  }

  setForm((f) => ({
    ...f,
    servicio: nombre,
    conceptoId: "",
    crearConceptoPendiente: true,
    decisionManual: false,
  }));

  toast_("Concepto preparado. Elegí medio, instrumento, categoría y guardá el gasto.");
};


const handleLogin = async (e) => {
  e.preventDefault();
  setLoginError("");
  setLoginLoading(true);

  try {
    const user = await login(loginForm.usuarioId, loginForm.pin);
    setAuthUser(user);
    setLoginForm((prev) => ({ ...prev, pin: "" }));
    toast_(`Bienvenido, ${user.nombre}`);
  } catch (error) {
    setLoginError(error.message || "No se pudo iniciar sesión");
  } finally {
    setLoginLoading(false);
  }
};

const handleLogout = () => {
  logout();
  setAuthUser(null);
  setData({ gastos:{}, ingresos:{}, sueldo:{} });
  setView("home");
};

if (!authUser) {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif",background:"#0a0a0f",minHeight:"100vh",color:"#e2e8f0",maxWidth:480,margin:"0 auto",padding:"32px 18px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select,button{font-family:'DM Sans',sans-serif;}
        .inf{width:100%;background:#1a1a24;border:1.5px solid #2a2a3e;border-radius:12px;padding:13px;color:#e2e8f0;font-size:16px;outline:none;}
        .inf:focus{border-color:#7c3aed;}
        .pb{border:none;border-radius:14px;padding:14px 16px;cursor:pointer;font-weight:700;font-size:15px;}
      `}</style>

      <div style={{ marginTop:48,background:"#13131a",border:"1px solid #1e1e2e",borderRadius:24,padding:22,boxShadow:"0 18px 50px rgba(0,0,0,.28)" }}>
        <div style={{ fontSize:42,marginBottom:12 }}>🔐</div>
        <h1 style={{ fontSize:25,marginBottom:6 }}>Mis Finanzas</h1>
        <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.6,marginBottom:22 }}>
          Acceso privado por usuario. Cada uno ve solamente sus propios movimientos.
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ display:"block",fontSize:12,color:"#64748b",fontWeight:700,marginBottom:8 }}>USUARIO</label>
          <select
            className="inf"
            value={loginForm.usuarioId}
            onChange={(e)=>setLoginForm((prev)=>({ ...prev, usuarioId:e.target.value }))}
            style={{ marginBottom:14 }}
          >
            <option value="usr_gustavo">Gustavo</option>
            <option value="usr_vane">Vane</option>
          </select>

          <label style={{ display:"block",fontSize:12,color:"#64748b",fontWeight:700,marginBottom:8 }}>PIN</label>
          <input
            className="inf"
            type="password"
            inputMode="numeric"
            placeholder="Ingresá tu PIN"
            value={loginForm.pin}
            onChange={(e)=>setLoginForm((prev)=>({ ...prev, pin:e.target.value }))}
            style={{ marginBottom:12 }}
          />

          {loginError && (
            <div style={{ background:"#2a1515",border:"1px solid #7f1d1d",color:"#fecaca",borderRadius:12,padding:10,fontSize:13,marginBottom:12 }}>
              {loginError}
            </div>
          )}

          <button className="pb" disabled={loginLoading} style={{ width:"100%",background:"#7c3aed",color:"#fff",opacity:loginLoading ? .7 : 1 }}>
            {loginLoading ? "Validando..." : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop:18,fontSize:12,color:"#64748b",lineHeight:1.6 }}>
          Modo seguro: el filtro se aplica también en API/Neon, no solo en pantalla.
        </div>
      </div>
    </div>
  );
}


// ======================================================
// 🎨 RENDER PRINCIPAL
// ======================================================
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif",background:"#0a0a0f",minHeight:"100vh",color:"#e2e8f0",maxWidth:480,margin:"0 auto",paddingBottom:88 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input,select{font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{display:none;}
        .pb{border:none;border-radius:12px;padding:10px 16px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;transition:all 0.15s;}
        .pb:active{transform:scale(0.96);}
        .card{background:#13131a;border-radius:20px;padding:18px;margin-bottom:12px;border:1px solid #1e1e2e;}
        .inf{width:100%;background:#1a1a24;border:1.5px solid #2a2a3e;border-radius:12px;padding:11px 13px;color:#e2e8f0;font-size:15px;outline:none;}
        .inf:focus{border-color:#7c3aed;}
        select.inf option{background:#1a1a24;}
        .ni{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;flex:1;padding:8px 0;border-radius:12px;}
        .ni:active{background:#1e1e2e;}
        .toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999;padding:12px 24px;border-radius:40px;font-weight:600;font-size:14px;animation:fio 2.4s ease;white-space:nowrap;}
        @keyframes fio{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}
        .pgb{height:6px;border-radius:3px;background:#1e1e2e;overflow:hidden;margin-top:8px;}
        .pgf{height:100%;border-radius:3px;transition:width 0.5s;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;z-index:900;}
        .ob{background:#13131a;border-radius:20px 20px 0 0;padding:28px 24px;width:100%;max-width:480px;border:1px solid #2a2a3e;}
        .tb{border:none;border-radius:10px;padding:7px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:12px;transition:all 0.15s;}
        .cd{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.15s;flex-shrink:0;}
        .ei{background:#1a1a24;border:1.5px solid #7c3aed;border-radius:10px;padding:7px 10px;color:#e2e8f0;font-size:14px;outline:none;flex:1;font-family:'DM Sans',sans-serif;}
        .stat-box{flex:1;background:#13131a;border-radius:16px;padding:12px 14px;border:1px solid #1e1e2e;}
      `}</style>
      <div style={{ position:"sticky",top:0,zIndex:850,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0a0a0fcc",backdropFilter:"blur(10px)",borderBottom:"1px solid #1e1e2e",padding:"9px 14px",marginBottom:8 }}>
        <div style={{ fontSize:12,color:"#94a3b8" }}>🔐 {authUser.nombre}</div>
        <button className="pb" style={{ background:"#1e1e2e",color:"#cbd5e1",fontSize:12,padding:"7px 10px" }} onClick={handleLogout}>
          Salir
        </button>
      </div>

      {toast&&<div className="toast" style={{ background:toast.type==="err"?"#7f1d1d":"#14532d",color:toast.type==="err"?"#fca5a5":"#86efac" }}>{toast.msg}</div>}

      {/* Modal subconceptos USD */}
      {subconceptosGasto&&<SubconceptosModal gasto={subconceptosGasto} tc={subconceptosGasto.tcConversion || tc} onSave={handleSubconceptosSave} onClose={()=>setSubconceptosGasto(null)}/>}

      {/* Modal gestión servicios inline */}
      {gestionServModal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:955 }} onClick={()=>setGestionServModal(null)}>
          <div style={{ background:"#13131a",borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:480,border:"1px solid #2a2a3e",maxHeight:"80vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            {(()=>{ const cat=cfg.categorias.find(c=>c.id===gestionServModal); const ss=cfg.servicios[gestionServModal]||[]; return(<>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <div style={{ fontWeight:700,fontSize:16 }}>📝 Servicios — <span style={{ color:cat?.color }}>{cat?.label}</span></div>
                <button onClick={()=>setGestionServModal(null)} style={{ background:"#1e1e2e",border:"none",color:"#94a3b8",borderRadius:10,padding:"6px 12px",cursor:"pointer" }}>✕</button>
              </div>
              {/* Agregar nuevo */}
              <div style={{ display:"flex",gap:8,marginBottom:16 }}>
                <input className="inf" placeholder="Nuevo servicio..." value={nuevoServInline} onChange={e=>setNuevoServInline(e.target.value)} style={{ flex:1 }}/>
                <button className="pb" style={{ background:"#7c3aed",color:"#fff" }} onClick={()=>{ if(!nuevoServInline.trim())return; setCfg(p=>{const s={...p.servicios};s[gestionServModal]=[...(s[gestionServModal]||[]),nuevoServInline.trim()];return{...p,servicios:s};}); setNuevoServInline(""); toast_("Servicio agregado"); }}>+</button>
              </div>
              {/* Lista */}
              {ss.map((s,idx)=>(<div key={idx} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1e1e2e" }}>
                <span style={{ fontSize:14 }}>{s}</span>
                <button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12 }} onClick={()=>{ setCfg(p=>{const sv={...p.servicios};sv[gestionServModal]=(sv[gestionServModal]||[]).filter((_,i)=>i!==idx);return{...p,servicios:sv};}); toast_("Eliminado","err"); }}>✕</button>
              </div>))}
              {ss.length===0&&<div style={{ color:"#64748b",fontSize:13,textAlign:"center",padding:"20px 0" }}>Sin servicios. Agregá uno arriba.</div>}
            </>);})()} 
          </div>
        </div>
      )}

      {/* Modal gestión categorías/formas inline desde Cargar */}
      {gestionCatModal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:955 }} onClick={()=>setGestionCatModal(false)}>
          <div style={{ background:"#13131a",borderRadius:"20px 20px 0 0",padding:"24px 20px",width:"100%",maxWidth:480,border:"1px solid #2a2a3e",maxHeight:"85vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:16 }}>⚙️ Gestionar</div>
              <button onClick={()=>setGestionCatModal(false)} style={{ background:"#1e1e2e",border:"none",color:"#94a3b8",borderRadius:10,padding:"6px 12px",cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:14 }}>Para gestión completa usá la sección ⚙️ Config</div>
            <div style={{ fontWeight:600,fontSize:14,marginBottom:10,color:"#7c3aed" }}>Categorías</div>
            {cfg.categorias.map(cat=>(<div key={cat.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #1e1e2e" }}>
              <div style={{ width:12,height:12,borderRadius:"50%",background:cat.color }}/>
              <span style={{ fontSize:14,flex:1 }}>{cat.label}</span>
              <button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12 }} onClick={()=>{ setCfg(p=>({...p,categorias:p.categorias.filter(c=>c.id!==cat.id)})); toast_("Eliminado","err"); }}>✕</button>
            </div>))}
            <div style={{ fontWeight:600,fontSize:14,marginBottom:10,marginTop:16,color:"#7c3aed" }}>Formas de pago</div>
            {cfg.formasPago.map((fp,idx)=>(<div key={idx} style={{ display:"flex",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e1e2e" }}>
              <span style={{ fontSize:14,flex:1 }}>{fp}</span>
              <button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12 }} onClick={()=>{ setCfg(p=>({...p,formasPago:p.formasPago.filter((_,i)=>i!==idx)})); toast_("Eliminado","err"); }}>✕</button>
            </div>))}
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editingGasto && editingGasto.id && (
        <EditModal
          gasto={editingGasto}
          config={cfg}
          tc={tc}
          onSave={handleEditSave}
          onClose={() => {
            setEditingGasto(null);
            setEditingMesKey(null);
          }}
          onAbrirSubconceptos={abrirSubconceptosConCotizacion}
        />
      )}

      {/* Modal acumulación */}
      {acumModal&&(
        <div className="ov" onClick={()=>setAcumModal(null)}>
          <div className="ob" onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16,fontWeight:700,marginBottom:6 }}>💰 Ya existe este concepto</div>
            <div style={{ fontSize:13,color:"#94a3b8",marginBottom:20 }}>
              <strong style={{ color:"#e2e8f0" }}>{acumModal.existente.servicio}</strong> tiene <strong style={{ color:"#4ade80" }}>{fmtARS(acumModal.existente.monto)}</strong> cargado.<br/>
              Estás agregando <strong style={{ color:"#fbbf24" }}>{fmtARS(acumModal.nuevo.monto)}</strong> más.
            </div>
            <div style={{ background:"#1a1a24",borderRadius:14,padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontSize:13,color:"#64748b" }}>Nuevo total si acumulás</span>
              <span style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:700,color:"#4ade80" }}>{fmtARS(acumModal.existente.monto+acumModal.nuevo.monto)}</span>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="pb" style={{ flex:1,background:"#14532d",color:"#4ade80",fontSize:13 }} onClick={handleAcumular}>➕ Sumar al existente</button>
              <button className="pb" style={{ flex:1,background:"#1e1e2e",color:"#94a3b8",fontSize:13 }} onClick={handleNuevaNota}>Crear nueva fila</button>
            </div>
            <button className="pb" style={{ width:"100%",background:"transparent",color:"#64748b",marginTop:8,fontSize:13 }} onClick={()=>setAcumModal(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel&&(
        <div className="ov" onClick={()=>setConfirmDel(null)}>
          <div className="ob" onClick={e=>e.stopPropagation()}>
            <p style={{ fontWeight:600,fontSize:16,marginBottom:8 }}>¿Eliminar este registro?</p>
            <p style={{ color:"#94a3b8",fontSize:14,marginBottom:24 }}>{confirmDel.servicio}</p>
            <div style={{ display:"flex",gap:10 }}>
              <button className="pb" style={{ flex:1,background:"#1e1e2e",color:"#94a3b8" }} onClick={()=>setConfirmDel(null)}>Cancelar</button>
              <button className="pb" style={{ flex:1,background:"#7f1d1d",color:"#fca5a5" }} onClick={()=>eliminar(confirmDel.tipo,confirmDel.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      {view!=="ingresos"&&(
        <div style={{ padding:"18px 14px 0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,color:"#7c3aed",letterSpacing:2,textTransform:"uppercase" }}>Mis Finanzas</div>
            <div style={{ fontSize:18,fontWeight:700 }}>{view==="config"?"Ajustes":view==="analisis"?"Análisis":view==="variacion"?"Evolución":view==="vencimientos"?"Vencimientos":`${MESES[mes.m]} ${mes.y}`}</div>
          </div>
          {!["config","variacion","vencimientos"].includes(view)&&(
            <div style={{ display:"flex",gap:8 }}>
              <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"6px 11px",minWidth:34 }} onClick={()=>cambiarMes(-1)}>‹</button>
              <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"6px 11px",minWidth:34 }} onClick={()=>cambiarMes(1)}>›</button>
            </div>
          )}
        </div>
      )}

      <div style={{ padding:view==="ingresos"?"18px 12px 0":"12px 12px 0" }}>

        {/* HOME */}
        {view==="home"&&(<>
          <div className="card" style={{ position:"relative",overflow:"hidden",background:"radial-gradient(circle at top right,#7c3aed55 0%,transparent 36%),linear-gradient(135deg,#111827 0%,#1a1230 52%,#0f172a 100%)",border:`1px solid ${saludFinanciera.color}55`,boxShadow:"0 12px 32px rgba(0,0,0,0.24)",padding:14,borderRadius:18,marginBottom:10 }}>
            <div style={{ position:"absolute",right:-36,top:-44,width:108,height:108,borderRadius:"50%",background:`${saludFinanciera.color}18` }}/>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,position:"relative" }}>
              <div>
                <div style={{ fontSize:10,color:"#94a3b8",fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",marginBottom:4 }}>Resumen del mes</div>
                <div style={{ fontSize:12,color:"#cbd5e1",marginBottom:3 }}>Disponible estimado</div>
                <div style={{ fontFamily:"'Space Mono',monospace",fontSize:32,lineHeight:1.05,fontWeight:700,color:saldoColor }}>{fmtARS(saldo)}</div>
              </div>
              <div style={{ background:`${saludFinanciera.color}1f`,border:`1px solid ${saludFinanciera.color}55`,borderRadius:14,padding:"7px 8px",minWidth:78,textAlign:"center" }}>
                <div style={{ fontSize:15 }}>{saludFinanciera.icon}</div>
                <div style={{ fontSize:10,fontWeight:800,color:saludFinanciera.color,marginTop:1 }}>{saludFinanciera.label}</div>
              </div>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12,position:"relative" }}>
              <div className="stat-box" style={{ background:"rgba(19,19,26,0.78)",padding:"9px 10px",borderRadius:14 }}>
                <div style={{ fontSize:10,color:"#64748b",marginBottom:3,fontWeight:800 }}>INGRESOS</div>
                <div style={{ fontSize:14,fontWeight:800,color:"#4ade80",whiteSpace:"nowrap" }}>{fmtARS(totalIngresos)}</div>
              </div>
              <div className="stat-box" style={{ background:"rgba(19,19,26,0.78)",padding:"9px 10px",borderRadius:14 }}>
                <div style={{ fontSize:10,color:"#64748b",marginBottom:3,fontWeight:800 }}>GASTOS</div>
                <div style={{ fontSize:14,fontWeight:800,color:"#f87171",whiteSpace:"nowrap" }}>{fmtARS(totalGastos)}</div>
              </div>
            </div>

            {totalIngresos>0&&<>
              <div className="pgb" style={{ height:6,marginTop:10,background:"rgba(30,30,46,0.9)" }}>
                <div className="pgf" style={{ width:`${Math.min(porcentajeUsoIngreso,100)}%`,background:saludFinanciera.color }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#94a3b8",marginTop:5 }}>
                <span>{porcentajeUsoIngreso}% del ingreso utilizado</span>
                <span>{porcentajeSaldoIngreso}% libre</span>
              </div>
            </>}
          </div>

          <div className="card" style={{ background:"#101827",border:"1px solid #1e293b",padding:"10px 11px",borderRadius:16,marginBottom:9 }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:9 }}>
              <div style={{ width:26,height:26,borderRadius:10,background:"#38bdf822",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>💡</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                  <div style={{ fontSize:10,color:"#38bdf8",fontWeight:900,letterSpacing:1,textTransform:"uppercase" }}>Diagnóstico</div>
                  <div style={{ width:5,height:5,borderRadius:"50%",background:saludFinanciera.color }}/>
                </div>
                <div style={{ fontSize:12,color:"#e2e8f0",lineHeight:1.32,fontWeight:700 }}>{recomendacionHome}</div>
              </div>
            </div>
          </div>


          {accionesHome.length>0&&<div className="card" style={{ padding:"10px 11px",borderRadius:16,marginBottom:9,border:"1px solid #2a1a4e",background:"linear-gradient(135deg,#15111f,#101827)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8 }}>
              <div>
                <div style={{ fontSize:10,color:"#c4b5fd",fontWeight:900,letterSpacing:1,textTransform:"uppercase" }}>Qué conviene hacer ahora</div>
                <div style={{ fontSize:10,color:"#64748b",marginTop:1 }}>Dos focos para avanzar sin ruido</div>
              </div>
              <div style={{ width:28,height:28,borderRadius:10,background:"#7c3aed22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>🎯</div>
            </div>
            <div style={{ display:"grid",gap:6 }}>
              {accionesHome.map((accion,idx)=>(
                <div key={`${accion.titulo}-${idx}`} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:12,background:"#0b1020",border:"1px solid #1e293b" }}>
                  <div style={{ width:26,height:26,borderRadius:9,background:"#1e1b4b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>{accion.icon}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:800,color:"#e2e8f0" }}>{accion.titulo}</div>
                    <div style={{ fontSize:10,color:"#94a3b8",lineHeight:1.25,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{accion.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          <div style={{ display:"grid",gridTemplateColumns:totalUSD_>0?"1fr 1fr 1fr":"1fr 1fr",gap:6,marginBottom:10 }}>
            <div className="stat-box" style={{ border:"1px solid #14532d",background:"#0f1f17",padding:"8px 9px",borderRadius:13 }}>
              <div style={{ fontSize:10,color:"#86efac",marginBottom:2,fontWeight:800 }}>PAGADO</div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:800,color:"#4ade80",whiteSpace:"nowrap" }}>{fmtARS(totalPagado)}</div>
              <div style={{ fontSize:10,color:"#94a3b8",marginTop:3 }}>{pagosRealizadosPct}%</div>
            </div>
            <div className="stat-box" style={{ border:"1px solid #422006",background:"#21160b",padding:"8px 9px",borderRadius:13 }}>
              <div style={{ fontSize:10,color:"#fdba74",marginBottom:2,fontWeight:800 }}>PENDIENTE</div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:800,color:"#fb923c",whiteSpace:"nowrap" }}>{fmtARS(totalPendiente)}</div>
              <div style={{ fontSize:10,color:"#94a3b8",marginTop:3 }}>{gastosDelMes.filter(g=>g.estado==="pendiente").length} ítems</div>
            </div>
            {totalUSD_>0&&<div className="stat-box" style={{ border:"1px solid #1e3a5f",background:"#0b1726",padding:"8px 9px",borderRadius:13 }}>
              <div style={{ fontSize:10,color:"#7dd3fc",marginBottom:2,fontWeight:800 }}>USD</div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#38bdf8" }}>{fmtUSD(totalUSD_)}</div>
              <div style={{ fontSize:10,color:"#94a3b8",marginTop:3 }}>incluido en ARS</div>
            </div>}
          </div>

          <div className="card" style={{ padding:"9px 11px",borderRadius:15,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:800,letterSpacing:0.6,textTransform:"uppercase" }}>Actividad del mes</div>
              <div style={{ fontSize:11,color:"#94a3b8",marginTop:3 }}>{totalOperacionesMes} operaciones · ticket prom. <span style={{ color:"#e2e8f0",fontWeight:800 }}>{fmtARS(ticketPromedioMes)}</span></div>
            </div>
            <div onClick={()=>gastoMayorDelMes&&setView("resumen")} style={{ minWidth:105,textAlign:"right",cursor:gastoMayorDelMes?"pointer":"default" }}>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:800 }}>MAYOR GASTO</div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:800,color:"#f87171",whiteSpace:"nowrap" }}>{gastoMayorDelMes?fmtARS(toARS_(gastoMayorDelMes)):fmtARS(0)}</div>
            </div>
          </div>

          {cantidadAlertasProximas > 0 && (
            <div className="card" onClick={() => setView("vencimientos")} style={{ border:"1px solid #f8717144",background:"linear-gradient(135deg,#1a1010,#241111)",cursor:"pointer",padding:12,borderRadius:16,marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                <div style={{ fontSize:18 }}>⚠️</div>
                <div style={{ fontSize:12, fontWeight:800, color:"#fca5a5", flex:1 }}>Vencimientos próximos: {cantidadAlertasProximas}</div>
                <div style={{ fontSize:20, color:"#fca5a5" }}>›</div>
              </div>
              <div style={{ fontSize:11, color:"#cbd5e1", marginBottom:4 }}>Total a cubrir: <span style={{ color:"#fca5a5", fontWeight:800 }}>{fmtARS(totalAlertasProximas)}</span></div>
              {mayorAlertaProxima && (<div style={{ fontSize:10, color:"#94a3b8" }}>Próximo foco: <span style={{ color:"#e2e8f0", fontWeight:700 }}>{mayorAlertaProxima.servicio}</span>{" · "}<span style={{ color:"#fca5a5", fontWeight:800 }}>{fmtARS(mayorAlertaProxima.montoARS)}</span>{" · "}<span>{mayorAlertaProxima.dias === 0 ? "vence hoy" : `vence en ${mayorAlertaProxima.dias} día${mayorAlertaProxima.dias > 1 ? "s" : ""}`}</span></div>)}
            </div>
          )}

          {topCategoriasHome.length>0&&<div className="card" style={{ padding:12,borderRadius:16,marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <div>
                <div style={{ fontSize:10,color:"#94a3b8",fontWeight:800,letterSpacing:1,textTransform:"uppercase" }}>Principales categorías</div>
                <div style={{ fontSize:10,color:"#64748b",marginTop:1 }}>Dónde se concentra el gasto</div>
              </div>
              <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",fontSize:11,padding:"6px 8px" }} onClick={()=>setView("analisis")}>Analizar</button>
            </div>
            {topCategoriasHome.map((cat,idx)=>{
              const pctCat=totalGastos>0?Math.round((cat.total/totalGastos)*100):0;
              return(<div key={cat.id} onClick={()=>{ setFiltroCatInicio(cat.id); setFiltroEstado("todos"); setView("resumen"); }} style={{ padding:"7px 0",borderBottom:idx<topCategoriasHome.length-1?"1px solid #1e1e2e":"none",cursor:"pointer" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:5 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:9,minWidth:0 }}>
                    <div style={{ width:19,height:19,borderRadius:7,background:`${cat.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:cat.color }}>{idx+1}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12,fontWeight:800,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{cat.label}</div>
                      <div style={{ fontSize:10,color:"#64748b" }}>{cat.items.length} ítems · {pctCat}% del gasto</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:800,color:cat.color,whiteSpace:"nowrap",textAlign:"right" }}>{fmtARS(cat.total)}</div>
                </div>
                <div style={{ height:4,borderRadius:4,background:"#1e1e2e",overflow:"hidden" }}><div style={{ height:"100%",width:`${Math.min(pctCat,100)}%`,background:cat.color,borderRadius:4 }}/></div>
              </div>);
            })}
          </div>}

          {/* Card replicar mes */}
          {mostrarReplicar()&&<div style={{ background:"linear-gradient(135deg,#15111f 0%,#0f172a 100%)",border:"1px solid #2a1a4e",borderRadius:16,padding:"10px 11px",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:10 }}>
              <div style={{ width:26,height:26,borderRadius:9,background:"#7c3aed22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>📋</div>
              <div>
                <div style={{ fontWeight:800,fontSize:12 }}>Preparar próximo mes</div>
                <div style={{ fontSize:10,color:"#94a3b8",marginTop:1 }}>Copiá los gastos recurrentes de {MESES[mes.m]}</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="pb" style={{ flex:1,background:"#7c3aed",color:"#fff",fontSize:12,padding:"8px 10px" }} onClick={()=>{ setExcluirReplicar(new Set()); setFiltCatReplicar("todos"); setReplicarStep("modal"); }}>Replicar gastos</button>
              <button className="pb" style={{ background:"#1e1e2e",color:"#64748b",fontSize:12,padding:"8px 10px" }} onClick={()=>setPrepararMesOculto(mesKey)}>Ahora no</button>
            </div>
          </div>}

          {categoriasConGasto.map(cat=>{
            const pendCat=cat.items.filter(i=>i.estado==="pendiente");
            const pctGastado=totalIngresos>0?Math.round((cat.total/totalIngresos)*100):0;
            return(<div key={cat.id} className="card" style={{ padding:"10px 12px",borderRadius:15,cursor:"pointer",transition:"all 0.15s",border:"1px solid #1e1e2e" }}
              onClick={()=>{ setFiltroCatInicio(cat.id); setFiltroEstado("todos"); setView("resumen"); }}
              onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${cat.color}44`}
              onMouseLeave={e=>e.currentTarget.style.border="1px solid #1e1e2e"}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:cat.color }}/>
                  <span style={{ fontWeight:700,fontSize:13 }}>{cat.label}</span>
                  <span style={{ fontSize:10,color:"#64748b" }}>{cat.items.length}</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:800,color:cat.color,whiteSpace:"nowrap" }}>{fmtARS(cat.total)}</div>
                  <span style={{ fontSize:11,color:"#64748b" }}>›</span>
                </div>
              </div>
              {totalIngresos>0&&<div style={{ height:3,borderRadius:2,background:"#1e1e2e",overflow:"hidden" }}><div style={{ height:"100%",borderRadius:2,background:cat.color,width:`${Math.min(pctGastado,100)}%`,opacity:0.6 }}/></div>}
              {pendCat.length>0&&<div style={{ marginTop:5,display:"flex",alignItems:"center",gap:5 }}><span style={{ fontSize:11,color:"#fb923c" }}>⏳ {pendCat.length} pendiente(s): </span><span style={{ fontSize:11,color:"#fb923c",fontWeight:700 }}>{fmtARS(pendCat.reduce((a,g)=>a+toARS_(g),0))}</span></div>}
            </div>);
          })}
          {gastosDelMes.length===0&&<div style={{ textAlign:"center",padding:"40px 0",color:"#64748b" }}><div style={{ fontSize:40,marginBottom:12 }}>💸</div><div style={{ fontWeight:600 }}>Sin gastos este mes</div><div style={{ fontSize:12,marginTop:6 }}>Cargá el primer gasto y el resumen se arma automáticamente.</div></div>}
          <button className="pb" style={{ width:"100%",background:"#1e1e2e",color:"#94a3b8",marginTop:6,padding:"8px 12px",fontSize:12 }} onClick={exportCSV}>Exportar CSV</button>
        </>)}

        {/* CARGAR */}
        {view==="cargar"&&(<>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ fontWeight:700,fontSize:18 }}>Nuevo gasto</div>
            <button className="pb" style={{ background:"#1a1230",color:"#7c3aed",fontSize:13,padding:"8px 14px",border:"1px solid #2a1a4e" }} onClick={()=>setShowCotizador(!showCotizador)}>💵 {showCotizador?"Ocultar":"Ver dólar"}</button>
          </div>
          {showCotizador&&<CotizadorWidget onSelectTC={(valor,tipo)=>{ setCfg(p=>({...p,tipoCambio:valor})); toast_(`TC ${tipo}: $${valor.toLocaleString("es-AR")}`); setShowCotizador(false); }}/>}
          <div style={{ marginBottom:14, background:"#101827", border:"1px solid #1e293b", borderRadius:16, padding:14 }}>
            <div style={{ fontSize:11, color:"#38bdf8", fontWeight:800, letterSpacing:1, marginBottom:12 }}>
              CARGA INTELIGENTE
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <span style={lbl}>CONCEPTO</span>
                <span style={{ fontSize:11,color:"#64748b" }}>
                  buscá o escribí uno
                </span>
              </div>

              <div style={{ position:"relative", marginBottom:10 }}>
                <input
                  className="inf"
                  placeholder="Buscar o escribir concepto..."
                  value={form.servicio}
                  onChange={e=>{
                    const val=e.target.value;
                    setMostrarTodosConceptos(false);
                    setForm(f=>({
                      ...f,
                      conceptoId:"",
                      servicio:val,
                      categoriaGastoId:f.categoriaGastoId||categoriaGastoDesdeServicio(val),
                      etiquetasIds:f.etiquetasIds?.length?f.etiquetasIds:etiquetasDesdeServicio(val),
                      categoria:f.categoria||categoriaLegacyDesdeMedioPagoId(f.medioPagoId),
                      formaPago:f.formaPago||formaPagoLegacyDesdeInstrumentoId(f.instrumentoId),
                      decisionManual:false
                    }));
                  }}
                  style={{ paddingRight: form.servicio ? 42 : undefined }}
                />

                {form.servicio && (
                  <button
                    type="button"
                    onClick={()=>{
                      setMostrarTodosConceptos(false);
                      setForm(f=>({
                        ...f,
                        conceptoId:"",
                        servicio:"",
                        etiquetasIds:[],
                        decisionManual:false
                      }));
                    }}
                    style={{
                      position:"absolute",
                      right:8,
                      top:"50%",
                      transform:"translateY(-50%)",
                      border:"none",
                      borderRadius:10,
                      background:"#1e1e2e",
                      color:"#94a3b8",
                      width:28,
                      height:28,
                      cursor:"pointer",
                      fontWeight:800
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {(cfg.conceptos || []).length > 0 && (
                <div style={{ background:"#0b1220",border:"1px solid #1e293b",borderRadius:14,padding:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                    <span style={{ fontSize:11,color:"#64748b",fontWeight:700 }}>
                      {textoConceptoLower ? `Coincidencias (${conceptosFiltrados.length})` : "Sugeridos"}
                    </span>

                    {conceptosFiltrados.length > conceptosVisibles.length && (
                      <button
                        className="pb"
                        onClick={()=>setMostrarTodosConceptos(true)}
                        style={{ background:"transparent",color:"#38bdf8",fontSize:11,padding:"2px 4px" }}
                      >
                        Ver todos
                      </button>
                    )}
                  </div>

                  {conceptosVisibles.length > 0 ? (
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {conceptosVisibles.map(concepto=>(
                        <button
                          key={concepto.id}
                          className="pb"
                          onClick={()=>{
                            setMostrarTodosConceptos(false);
                            setForm(f=>({
                              ...f,
                              conceptoId: concepto.id,
                              servicio: concepto.nombre,
                              medioPagoId: concepto.medioPagoId || f.medioPagoId || "mp_sin_definir",
                              instrumentoId: concepto.instrumentoId || f.instrumentoId || "ins_manual",
                              categoriaGastoId: concepto.categoriaGastoId || f.categoriaGastoId || "cg_otros",
                              etiquetasIds: concepto.etiquetasIds?.length ? concepto.etiquetasIds : (f.etiquetasIds || []),
                              moneda: concepto.monedaDefault || f.moneda || "ARS",
                              categoria: categoriaLegacyDesdeMedioPagoId(concepto.medioPagoId || f.medioPagoId),
                              formaPago: formaPagoLegacyDesdeInstrumentoId(concepto.instrumentoId || f.instrumentoId),
                              decisionManual:false,
                              crearConceptoPendiente:false
                            }));
                          }}
                          style={{
                            background:form.conceptoId===concepto.id?(concepto.monedaDefault==="USD"?"#1e3a5f":"#1e4032"):"#1e1e2e",
                            color:form.conceptoId===concepto.id?(concepto.monedaDefault==="USD"?"#38bdf8":"#4ade80"):"#94a3b8",
                            fontSize:12,
                            padding:"6px 10px",
                            border:concepto.monedaDefault==="USD"?"1px solid #38bdf833":"none"
                          }}
                        >
                          {concepto.nombre}{concepto.monedaDefault==="USD"?" 💵":""}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize:12,color:"#64748b",lineHeight:1.45 }}>
                      No hay coincidencias. Podés guardar el texto escrito como concepto manual.
                    </div>
                  )}

                  {textoConcepto && !conceptoExacto && conceptosFiltrados.length === 0 && (
  <div style={{ display:"grid",gap:8,marginTop:10 }}>
    <button
      className="pb"
      onClick={crearConceptoDesdeTexto}
      style={{
        width:"100%",
        background:"#14532d",
        color:"#86efac",
        border:"1px solid #22c55e66",
        fontSize:12
      }}
    >
      + Crear concepto “{textoConcepto}”
    </button>

    <button
      className="pb"
      onClick={()=>setForm(f=>({
        ...f,
        conceptoId:"",
        servicio:textoConcepto,
        medioPagoId:f.medioPagoId || "mp_sin_definir",
        instrumentoId:f.instrumentoId || "ins_manual",
        categoriaGastoId:f.categoriaGastoId || "cg_otros",
        categoria:f.categoria||categoriaLegacyDesdeMedioPagoId(f.medioPagoId || "mp_sin_definir"),
        formaPago:f.formaPago||formaPagoLegacyDesdeInstrumentoId(f.instrumentoId || "ins_manual"),
        decisionManual:true,
        crearConceptoPendiente:false
      }))}
      style={{
        width:"100%",
        background:"#1a1230",
        color:"#a78bfa",
        border:"1px dashed #7c3aed66",
        fontSize:12
      }}
    >
      Usar solo en este gasto
    </button>
  </div>
)}
                </div>
              )}
            </div>

            <div style={{ marginBottom:12 }}>
              <span style={lbl}>MEDIO DE PAGO</span>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {(cfg.mediosPago || []).map(mp=>(
                  <button
                    key={mp.id}
                    className="pb"
                    onClick={()=>setForm(f=>({
                      ...f,
                      medioPagoId:mp.id,
                      categoria:categoriaLegacyDesdeMedioPagoId(mp.id)
                    }))}
                    style={{ background:form.medioPagoId===mp.id?(mp.color||"#38bdf8"):"#1e1e2e",color:form.medioPagoId===mp.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}
                  >
                    {mp.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <span style={lbl}>INSTRUMENTO</span>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {(cfg.instrumentosPago || []).map(ins=>(
                  <button
                    key={ins.id}
                    className="pb"
                    onClick={()=>setForm(f=>({
                      ...f,
                      instrumentoId:ins.id,
                      formaPago:formaPagoLegacyDesdeInstrumentoId(ins.id)
                    }))}
                    style={{ background:form.instrumentoId===ins.id?"#7c3aed":"#1e1e2e",color:form.instrumentoId===ins.id?"#fff":"#94a3b8",fontSize:12,padding:"6px 10px" }}
                  >
                    {ins.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <span style={lbl}>CATEGORÍA REAL</span>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {(cfg.categoriasGasto || []).map(cg=>(
                  <button
                    key={cg.id}
                    className="pb"
                    onClick={()=>setForm(f=>({...f,categoriaGastoId:cg.id}))}
                    style={{ background:form.categoriaGastoId===cg.id?(cg.color||"#38bdf8"):"#1e1e2e",color:form.categoriaGastoId===cg.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}
                  >
                    {cg.nombre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span style={lbl}>ETIQUETAS</span>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {(cfg.etiquetas || []).map(tag=>{
                  const activo=(form.etiquetasIds||[]).includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      className="pb"
                      onClick={()=>setForm(f=>{
                        const actuales=f.etiquetasIds||[];
                        return {...f,etiquetasIds: actuales.includes(tag.id)?actuales.filter(x=>x!==tag.id):[...actuales,tag.id]};
                      })}
                      style={{ background:activo?(tag.color||"#38bdf8"):"#1e1e2e",color:activo?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}
                    >
                      {tag.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <span style={lbl}>TIPO DE GASTO</span>
            <div style={{ display:"flex", gap:8 }}>
              <button
                className="pb"
                onClick={() => setForm((f) => ({
                  ...f,
                  tipoGasto:"simple",
                  accionCompuesto:"nuevo",
                  decisionManual:true,
                  subconceptos:[]
                }))}
                style={{
                  background: form.tipoGasto==="simple" ? "#7c3aed" : "#1e1e2e",
                  color: form.tipoGasto==="simple" ? "#fff" : "#94a3b8",
                  fontSize: 13
                }}
              >
                Simple
              </button>

              <button
                className="pb"
                onClick={() => setForm((f) => ({
                  ...f,
                  tipoGasto:"detalle",
                  decisionManual:true,
                  monto:""
                }))}
                style={{
                  background: form.tipoGasto==="detalle" ? "#7c3aed" : "#1e1e2e",
                  color: form.tipoGasto==="detalle" ? "#fff" : "#94a3b8",
                  fontSize: 13
                }}
              >
                Con detalle
              </button>
            </div>
          </div>

          {form.servicio && gastoCompuestoExistente && (
            <div style={{
              marginBottom: 14,
              background: "#13131a",
              border: "1px solid #2a2a3e",
              borderRadius: 14,
              padding: "12px 14px"
            }}>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>
                {contarRepeticionesServicio(form.servicio) >= 2
                  ? "Detectamos múltiples cargas similares este mes"
                  : "Encontramos un gasto similar este mes"}
              </div>

              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Ya existe un gasto similar este mes
              </div>

              <div style={{ fontWeight: 600, marginBottom: 10 }}>
                {gastoCompuestoExistente.servicio} — {fmtMonto(
                  gastoCompuestoExistente.monto,
                  gastoCompuestoExistente.moneda || form.moneda
                )}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button
                  className="pb"
                  onClick={() => setForm((f) => ({ ...f, accionCompuesto:"existente", decisionManual:true }))}
                  style={{
                    background: form.accionCompuesto==="existente" ? "#14532d" : "#1e1e2e",
                    color: form.accionCompuesto==="existente" ? "#4ade80" : "#94a3b8",
                    border: form.accionCompuesto==="existente" ? "1px solid #4ade80" : "1px solid transparent",
                    fontSize: 12
                  }}
                >
                  Agregar a existente
                </button>

                <button
                  className="pb"
                  onClick={() => setForm((f) => ({ ...f, accionCompuesto:"nuevo", decisionManual:true }))}
                  style={{
                    background: form.accionCompuesto==="nuevo" ? "#1e3a5f" : "#1e1e2e",
                    color: form.accionCompuesto==="nuevo" ? "#38bdf8" : "#94a3b8",
                    border: form.accionCompuesto==="nuevo" ? "1px solid #38bdf8" : "1px solid transparent",
                    fontSize: 12
                  }}
                >
                  Crear nuevo
                </button>
              </div>
            </div>
          )}

	 
          {/* Si es concepto dólar, mostrar desglose; si no, monto normal */}
          {/* Si es concepto dólar, mostrar desglose; si no, monto normal */}
{form.tipoGasto === "detalle" ? (
  <>
    {/* Selector de moneda */}
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",gap:8 }}>
        <button
          className="pb"
          onClick={() => setForm(f => ({ ...f, moneda:"ARS" }))}
          style={{
            background: form.moneda==="ARS" ? "#7c3aed" : "#1e1e2e",
            color: form.moneda==="ARS" ? "#fff" : "#94a3b8"
          }}
        >
          $ARS
        </button>

        <button
          className="pb"
          onClick={() => setForm(f => ({ ...f, moneda:"USD" }))}
          style={{
            background: form.moneda==="USD" ? "#1e3a5f" : "#1e1e2e",
            color: form.moneda==="USD" ? "#38bdf8" : "#94a3b8"
          }}
        >
          💵 USD
        </button>
      </div>
    </div>

    {/* Bloque de desglose */}
    <div style={{
      marginBottom:14,
      background:"#0f1a2e",
      border:"1px solid #1e3a5f",
      borderRadius:16,
      padding:"14px 16px"
    }}>
      <div style={{
        fontSize:11,
        color:"#38bdf8",
        fontWeight:700,
        letterSpacing:1,
        marginBottom:10
      }}>
        🧾 DESGLOSE — {form.moneda}
        {form.moneda === "USD" ? ` — TC $${tc.toLocaleString("es-AR")}` : ""}
      </div>

      {form.subconceptos.length > 0 && form.subconceptos.map((s,i) => (
        <div
          key={i}
          style={{
            display:"flex",
            justifyContent:"space-between",
            padding:"4px 0",
            fontSize:13
          }}
        >
          <span>{s.nombre}</span>
          <span style={{
            color:"#38bdf8",
            fontFamily:"'Space Mono',monospace"
          }}>
            {fmtMonto(
              Number(s.monto ?? s.montoUSD ?? 0),
              s.moneda || form.moneda
            )}
          </span>
        </div>
      ))}

      {form.subconceptos.length > 0 && (
        <div style={{
          borderTop:"1px solid #1e3a5f",
          marginTop:8,
          paddingTop:8,
          display:"flex",
          justifyContent:"space-between"
        }}>
          <span style={{ color:"#64748b",fontSize:13 }}>Total</span>

          <div style={{ textAlign:"right" }}>
            <div style={{
              color:"#38bdf8",
              fontFamily:"'Space Mono',monospace",
              fontSize:14,
              fontWeight:700
            }}>
              {fmtARS(
                form.subconceptos.reduce(
                  (a, s) => a + (
                    String(s.moneda || form.moneda || "ARS").toUpperCase() === "USD"
                      ? Number(s.monto ?? s.montoUSD ?? 0) * Number(s.tipoCambio || tc || 1)
                      : Number(s.monto ?? s.montoUSD ?? 0)
                  ),
                  0
                )
              )}
            </div>

            {form.subconceptos.some((s) => String(s.moneda || form.moneda || "ARS").toUpperCase() === "USD") && (
              <div style={{ fontSize:11,color:"#a78bfa" }}>
                {fmtUSD(
                  form.subconceptos.reduce(
                    (a, s) => a + (
                      String(s.moneda || form.moneda || "ARS").toUpperCase() === "USD"
                        ? Number(s.monto ?? s.montoUSD ?? 0)
                        : 0
                    ),
                    0
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
  onClick={() =>
  abrirSubconceptosConCotizacion({
    ...form,
    id: "new_" + Date.now(),
    moneda: form.moneda || "ARS"
  })
}
  style={{ width:"100%",background:"#1e3a5f",border:"none",color:"#38bdf8",borderRadius:12,padding:"10px 0",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,marginTop:10 }}
>
  {form.subconceptos.length>0 ? "✏️ Editar desglose" : "+ Agregar ítems"}
</button>
    </div>
  </>
) : (
  <div style={{ marginBottom:14 }}>
    <span style={lbl}>MONTO Y MONEDA</span>
    <div style={{ display:"flex",gap:8 }}>
      <input
        className="inf"
        type="number"
        placeholder="0"
        value={form.monto}
        onChange={e=>setForm(f=>({...f,monto:e.target.value}))}
        inputMode="numeric"
        style={{ flex:2 }}
      />

      <button
        className="pb"
        onClick={()=>setForm(f=>({...f,moneda:"ARS"}))}
        style={{
          background:"#1e1e2e",
          border:form.moneda==="ARS"?"2px solid #7c3aed":"2px solid transparent",
          color:form.moneda==="ARS"?"#e2e8f0":"#64748b",
          padding:"10px 14px"
        }}
      >
        $ARS
      </button>

      <button
        className="pb"
        onClick={()=>setForm(f=>({...f,moneda:"USD"}))}
        style={{
          background:form.moneda==="USD"?"#1e3a5f":"#1e1e2e",
          border:form.moneda==="USD"?"2px solid #38bdf8":"2px solid transparent",
          color:form.moneda==="USD"?"#38bdf8":"#64748b",
          padding:"10px 14px"
        }}
      >
        💵
      </button>
    </div>

    {form.moneda==="USD" && form.monto && (
      <div style={{ fontSize:12,color:"#38bdf8",marginTop:6 }}>
        ≈ {fmtARS(Number(form.monto)*tc)}
      </div>
    )}
  </div>
)}

          <div style={{ marginBottom:14 }}><span style={lbl}>ESTADO</span><div style={{ display:"flex",gap:8 }}><button className="pb" onClick={()=>setForm(f=>({...f,estado:"pagado"}))} style={{ background:form.estado==="pagado"?"#14532d":"#1e1e2e",color:form.estado==="pagado"?"#4ade80":"#64748b",border:form.estado==="pagado"?"2px solid #4ade80":"2px solid transparent" }}>✅ Pagado</button><button className="pb" onClick={()=>setForm(f=>({...f,estado:"pendiente"}))} style={{ background:form.estado==="pendiente"?"#422006":"#1e1e2e",color:form.estado==="pendiente"?"#fb923c":"#64748b",border:form.estado==="pendiente"?"2px solid #fb923c":"2px solid transparent" }}>⏳ Pendiente</button></div></div>
          <div style={{ display:"flex",gap:10,marginBottom:14 }}><div style={{ flex:1 }}><span style={lbl}>DÍA</span><input className="inf" type="number" placeholder={now.getDate()} value={form.dia} onChange={e=>setForm(f=>({...f,dia:e.target.value}))} inputMode="numeric"/></div></div>
          <div style={{ marginBottom:14 }}><span style={lbl}>📅 VENCIMIENTO</span><input className="inf" type="date" style={{ colorScheme:"dark" }} value={form.vencimiento} onChange={e=>setForm(f=>({...f,vencimiento:e.target.value}))}/>{form.vencimiento&&(()=>{const dias=diasRestantes(form.vencimiento);const s=semaforo(dias);return s?<div style={{ fontSize:12,color:s.color,marginTop:6,fontWeight:600 }}>{s.icon} {dias===0?"¡Hoy!":dias<0?`Venció hace ${Math.abs(dias)}d`:`Faltan ${dias}d`}</div>:null;})()}</div>
          <div style={{ marginBottom:14 }}><span style={lbl}>OBSERVACIÓN</span><input className="inf" placeholder="Ej: Cuota 2" value={form.observacion} onChange={e=>setForm(f=>({...f,observacion:e.target.value}))}/></div>
          <div style={{ marginBottom:20,display:"flex",alignItems:"center",gap:12,background:"#13131a",borderRadius:14,padding:"12px 14px",border:"1px solid #1e1e2e",cursor:"pointer" }} onClick={()=>setForm(f=>({...f,esRecurrente:!f.esRecurrente}))}>
            <div style={{ width:20,height:20,borderRadius:6,border:"2px solid #7c3aed",background:form.esRecurrente?"#7c3aed":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{form.esRecurrente&&<span style={{ color:"#fff",fontSize:13 }}>✓</span>}</div>
            <div><div style={{ fontSize:14,fontWeight:600 }}>Guardar como recurrente</div><div style={{ fontSize:11,color:"#64748b" }}>Aparecerá cada mes para cargarlo fácil</div></div>
          </div>
          
		    {form.servicio && gastoCompuestoExistente && (
  <div style={{
    marginBottom: 12,
    fontSize: 12,
    color: form.accionCompuesto === "existente" ? "#4ade80" : "#38bdf8"
  }}>
    {form.accionCompuesto === "existente"
      ? "Se va a agregar al gasto existente."
      : "Se va a crear un gasto nuevo independiente."}
  </div>
)}
		  
		  <button
  className="pb"
  style={{ width:"100%",background:"#7c3aed",color:"#fff",fontSize:16,padding:16 }}
  onClick={() => {
    
    guardarGasto();
  }}
>
  Guardar gasto
  </button>
        </>)}

        {/* DETALLE / RESUMEN */}
        {view==="resumen"&&(()=>{
          const gruposDetalle = gastosPorCatFiltrado2.filter(c=>c.items.length>0);
          const totalDetalleFiltrado = gruposDetalle.reduce((acc,c)=>acc+Number(c.total||0),0);
          const cantidadDetalleFiltrada = gruposDetalle.reduce((acc,c)=>acc+(c.items?.length||0),0);
          const hayFiltroActivo = filtroCatInicio || filtroEstado!=="todos" || busqueda.trim();
          const tituloDetalle = filtroCatInicio
            ? cfg.categorias.find(c=>c.id===filtroCatInicio)?.label || "Detalle"
            : "Detalle";

          return(<>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11,color:"#7c3aed",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2 }}>MIS FINANZAS</div>
                <div style={{ fontWeight:800,fontSize:22,lineHeight:1 }}>{tituloDetalle}</div>
                <div style={{ fontSize:12,color:"#94a3b8",marginTop:5 }}>{MESES[mes.m]} {mes.y} · {cantidadDetalleFiltrada} movimiento{cantidadDetalleFiltrada===1?"":"s"}</div>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center",flexShrink:0 }}>
                {[["todos","Todos"],["pagado","✅"],["pendiente","⏳"]].map(([v,l])=>(
                  <button key={v} className="tb" onClick={()=>setFiltroEstado(v)} style={{ background:filtroEstado===v?"#7c3aed":"#1e1e2e",color:filtroEstado===v?"#fff":"#94a3b8",padding:"8px 10px",borderRadius:12 }}>{l}</button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding:14,marginBottom:12,background:"linear-gradient(135deg,#111827 0%,#171226 100%)",border:"1px solid #2a1a4e" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12 }}>
                <div>
                  <div style={{ fontSize:11,color:"#94a3b8",fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>
                    {hayFiltroActivo?"Total filtrado":"Total del mes"}
                  </div>
                  <div style={{ fontFamily:"'Space Mono',monospace",fontSize:22,fontWeight:900,color:filtroEstado==="pendiente"?"#fb923c":"#4ade80" }}>{fmtARS(totalDetalleFiltrado)}</div>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>
                    {filtroEstado==="todos"?"Todos los estados":filtroEstado==="pagado"?"Solo gastos pagados":"Solo gastos pendientes"}
                  </div>
                </div>
                {hayFiltroActivo&&(
                  <button
                    onClick={()=>{ setFiltroCatInicio(null); setFiltroEstado("todos"); setBusqueda(""); }}
                    style={{ background:"#1e1e2e",border:"1px solid #334155",color:"#cbd5e1",borderRadius:12,padding:"8px 10px",fontSize:12,fontWeight:700,cursor:"pointer" }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div style={{ position:"relative",marginBottom:12 }}>
              <input className="inf" placeholder="🔍 Buscar concepto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{ paddingRight:busqueda?44:14 }}/>
              {busqueda&&(
                <button onClick={()=>setBusqueda("")} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"#1e1e2e",border:"none",color:"#94a3b8",borderRadius:10,width:28,height:28,cursor:"pointer" }}>×</button>
              )}
            </div>

            <div style={{ fontSize:12,color:"#64748b",marginBottom:12,display:"flex",justifyContent:"space-between",gap:10 }}>
              <span>💡 Tocá una fila para editar</span>
              {filtroCatInicio&&<button onClick={()=>setFiltroCatInicio(null)} style={{ background:"transparent",border:"none",color:"#38bdf8",fontSize:12,fontWeight:700,cursor:"pointer" }}>Ver todo</button>}
            </div>

            {gruposDetalle.map(cat=>{
              const porcentajeGrupo = totalDetalleFiltrado>0 ? Math.round((Number(cat.total||0)/totalDetalleFiltrado)*100) : 0;
              return(
                <div key={cat.id} className="card" style={{ padding:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10 }}>
                    <div>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <span style={{ width:8,height:8,borderRadius:"50%",background:cat.color,display:"inline-block" }}/>
                        <div style={{ fontWeight:800,fontSize:15,color:cat.color }}>{cat.label}</div>
                        <span style={{ fontSize:11,color:"#64748b" }}>{cat.items.length} item{cat.items.length===1?"":"s"}</span>
                      </div>
                      <div style={{ marginTop:7,width:92,height:3,borderRadius:999,background:"#1e1e2e",overflow:"hidden" }}>
                        <div style={{ width:`${Math.min(100,porcentajeGrupo)}%`,height:"100%",background:cat.color,borderRadius:999 }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:900,color:cat.color }}>{fmtARS(cat.total)}</div>
                      <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{porcentajeGrupo}% del filtro</div>
                    </div>
                  </div>
                  {cat.items.map(item=>(<GastoRow key={item.id} item={item}/>))}
                </div>
              );
            })}

            {gruposDetalle.length===0&&(
              <div style={{ textAlign:"center",padding:"52px 0",color:"#64748b" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>📋</div>
                <div style={{ fontSize:15,fontWeight:800,color:"#cbd5e1" }}>Sin registros</div>
                <div style={{ fontSize:12,marginTop:6 }}>Probá limpiar filtros o cambiar de mes.</div>
                {hayFiltroActivo&&<button className="pb" onClick={()=>{ setFiltroCatInicio(null); setFiltroEstado("todos"); setBusqueda(""); }} style={{ marginTop:14,background:"#7c3aed",color:"#fff" }}>Limpiar filtros</button>}
              </div>
            )}
          </>);
        })()}

        {/* VENCIMIENTOS */}
{view==="vencimientos"&&(
  <VencimientosView
    data={data}
    config={cfg}
    mesActual={mes}
    tc={tc}
    onEdit={(g,key)=>openEdit(g,key)}
    onMarcarPagado={async (id, itemMesKey) => {
      try {
        const gastoActual = (data.gastos[itemMesKey] || []).find((g) => g.id === id);

        if (!gastoActual) {
          toast_("No se encontró el gasto", "err");
          return;
        }

        await actualizarGasto({
          id: gastoActual.id,
          periodo: itemMesKey,
          dia: gastoActual.dia,
          categoria: gastoActual.categoria,
          formaPago: gastoActual.formaPago,
          servicio: gastoActual.servicio,
          monto: Number(gastoActual.monto || 0),
          moneda: gastoActual.moneda || "ARS",
          estado: "pagado",
          observacion: gastoActual.observacion || "",
          vencimiento: gastoActual.vencimiento || null,
          esRecurrente: !!gastoActual.esRecurrente,
          subconceptos: gastoActual.subconceptos || [],
        });

        const movimientosApi = await getMovimientos(itemMesKey);
        const nuevoData = mapMovimientosDesdeApi(movimientosApi, itemMesKey);

        setData((prev) => ({
          ...prev,
          gastos: {
            ...prev.gastos,
            [itemMesKey]: nuevoData.gastos[itemMesKey] || [],
          },
          ingresos: {
            ...prev.ingresos,
            [itemMesKey]: nuevoData.ingresos[itemMesKey] || [],
          },
          sueldo: {
            ...prev.sueldo,
            [itemMesKey]: nuevoData.sueldo[itemMesKey] || 0,
          },
        }));

        toast_("Marcado como pagado");
      } catch (e) {
        console.error(e);
        toast_("No se pudo marcar como pagado", "err");
      }
    }}
  />
)}

        {/* ANÁLISIS */}
        {view==="analisis"&&(
          <div>
            <div className="card" style={{ background:"linear-gradient(135deg,#111827 0%,#1a1230 100%)",border:"1px solid #2a1a4e" }}>
              <div style={{ display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:11,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Lectura multidimensional</div>
                  <div style={{ fontSize:20,fontWeight:800,lineHeight:1.2 }}>Entender el gasto, no solo registrarlo</div>
                  <div style={{ fontSize:12,color:"#94a3b8",marginTop:6,lineHeight:1.5 }}>{MESES[mes.m]} {mes.y} · {gastosDelMes.length} movimientos</div>
                </div>
                <div style={{ textAlign:"right",fontFamily:"'Space Mono',monospace",fontWeight:800,color:"#f87171",fontSize:16 }}>{fmtARS(totalGastos)}</div>
              </div>
              {mayorAnalisis&&(
                <div style={{ marginTop:14,padding:"12px 14px",borderRadius:14,background:"#0f172a",border:"1px solid #1e293b" }}>
                  <div style={{ fontSize:11,color:"#64748b",fontWeight:700,marginBottom:4 }}>MAYOR CONCENTRACIÓN</div>
                  <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}>
                    <div style={{ fontSize:14,fontWeight:700 }}>{mayorAnalisis.nombre}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:800,color:"#e2e8f0" }}>{fmtARS(mayorAnalisis.total)}</div>
                  </div>
                  <div style={{ fontSize:10,color:"#94a3b8",marginTop:3 }}>
                    {totalGastos>0?`${Math.round((mayorAnalisis.total/totalGastos)*100)}% del gasto mensual`:"Sin gastos cargados"}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
              {opcionesAnalisis.map(op=>(
                <button
                  key={op.id}
                  onClick={()=>setAnalisisTab(op.id)}
                  style={{
                    background:analisisTab===op.id?"#7c3aed":"#1e1e2e",
                    border:"none",
                    color:analisisTab===op.id?"#fff":"#94a3b8",
                    borderRadius:14,
                    padding:"10px 6px",
                    cursor:"pointer",
                    fontSize:11,
                    fontWeight:700,
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    gap:4
                  }}
                >
                  <span style={{ fontSize:17 }}>{op.icon}</span>
                  <span>{op.label}</span>
                </button>
              ))}
            </div>

            <div className="card">
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:800,fontSize:17 }}>{analisisActual.icon} Por {analisisActual.label.toLowerCase()}</div>
                  <div style={{ fontSize:12,color:"#64748b",marginTop:3 }}>{analisisActual.descripcion}</div>
                </div>
                <div style={{ fontSize:11,color:"#64748b",textAlign:"right" }}>{analisisActual.items.length} grupos</div>
              </div>

              {analisisActual.items.length===0&&(
                <div style={{ padding:"20px 0",textAlign:"center",color:"#64748b",fontSize:13 }}>No hay gastos para analizar en este período.</div>
              )}

              {analisisActual.items.map((item,idx)=>{
                const pctTotal = totalGastos>0 ? Math.round((item.total/totalGastos)*100) : 0;
                const pctBar = Math.min((item.total/maxAnalisis)*100,100);
                return(
                  <div key={`${analisisTab}-${item.nombre}`} style={{ padding:"12px 0",borderBottom:idx<analisisActual.items.length-1?"1px solid #1e1e2e":"none" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:6 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:9,minWidth:0 }}>
                        <span style={{ width:10,height:10,borderRadius:"50%",background:item.color||"#64748b",flexShrink:0 }} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.nombre}</div>
                          <div style={{ fontSize:11,color:"#64748b" }}>{item.cantidad} movimiento{item.cantidad!==1?"s":""} · {pctTotal}% del mes</div>
                        </div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:800,color:"#e2e8f0" }}>{fmtARS(item.total)}</div>
                        {item.totalUSD>0&&<div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:"#38bdf8" }}>{fmtUSD(item.totalUSD)}</div>}
                      </div>
                    </div>
                    <div style={{ height:5,borderRadius:99,background:"#1e1e2e",overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pctBar}%`,background:item.color||"#7c3aed",borderRadius:99,opacity:.85 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {analisisTab==="etiqueta"&&(
              <div className="card" style={{ border:"1px solid #1e3a5f",background:"#0f172a" }}>
                <div style={{ fontSize:13,color:"#94a3b8",lineHeight:1.6 }}>
                  Nota: un mismo gasto puede tener más de una etiqueta. Por eso, en esta vista un gasto puede aportar a más de un grupo.
                </div>
              </div>
            )}
          </div>
        )}

        {/* VARIACIÓN */}
        {view==="variacion"&&(()=>{
          const toARS__ = (g,t) => montoReal(g,t);
          const pct_ = (actual, anterior) => {
            if (!anterior) return null;
            return Math.round(((actual - anterior) / anterior) * 100);
          };
          const getMeses_ = () => {
            const r = [];
            for (let i = mesesAtrasVar - 1; i >= 0; i--) {
              let m = mes.m - i;
              let y = mes.y;
              if (m < 0) { m += 12; y--; }
              r.push({ y, m, key: getMesKey(y,m), label: MESES[m].slice(0,3) });
            }
            return r;
          };
          const ml = getMeses_();
          const actualKey = ml[ml.length - 1].key;
          const anteriorKey = ml.length >= 2 ? ml[ml.length - 2].key : null;
          const totalMes = (key) => (data.gastos[key] || []).reduce((s,g)=>s + toARS__(g,tc),0);
          const totalActual = totalMes(actualKey);
          const totalAnterior = anteriorKey ? totalMes(anteriorKey) : 0;
          const diffTotal = totalActual - totalAnterior;
          const pctTotal = pct_(totalActual,totalAnterior);
          const tieneBase = totalAnterior > 0;
          const conceptoMap = ml.reduce((acc,{key})=>{
            (data.gastos[key] || []).forEach(g=>{
              const nombre = (g.servicio || g.conceptoManual || "Sin concepto").trim() || "Sin concepto";
              if (!acc[nombre]) acc[nombre] = {};
              acc[nombre][key] = (acc[nombre][key] || 0) + toARS__(g,tc);
            });
            return acc;
          },{});
          const conceptos = Object.entries(conceptoMap)
            .map(([nombre,vals])=>{
              const actual = vals[actualKey] || 0;
              const anterior = anteriorKey ? (vals[anteriorKey] || 0) : 0;
              return { nombre, vals, actual, anterior, diff: actual - anterior, pct: pct_(actual, anterior) };
            })
            .sort((a,b)=>b.actual-a.actual || Math.abs(b.diff)-Math.abs(a.diff));
          const subieron = conceptos.filter(x=>x.actual>0 && x.anterior>0 && x.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,4);
          const bajaron = conceptos.filter(x=>x.actual>0 && x.anterior>0 && x.diff<0).sort((a,b)=>a.diff-b.diff).slice(0,4);
          const nuevos = conceptos.filter(x=>x.actual>0 && x.anterior===0).sort((a,b)=>b.actual-a.actual).slice(0,6);
          const sinGasto = conceptos.filter(x=>x.actual===0 && x.anterior>0).sort((a,b)=>b.anterior-a.anterior).slice(0,4);
          const colorVar = !tieneBase ? "#c4b5fd" : diffTotal>0 ? "#f87171" : diffTotal<0 ? "#4ade80" : "#fbbf24";
          const textoVar = !tieneBase ? "Sin base" : diffTotal>0 ? `▲ ${pctTotal}%` : diffTotal<0 ? `▼ ${Math.abs(pctTotal)}%` : "= 0%";
          const resumen = !tieneBase
            ? `Cargá al menos dos meses con gastos para ver una comparación real.`
            : diffTotal>0
              ? `Este mes gastaste ${fmtARS(Math.abs(diffTotal))} más que el mes anterior.`
              : diffTotal<0
                ? `Este mes gastaste ${fmtARS(Math.abs(diffTotal))} menos que el mes anterior.`
                : "Este mes gastaste lo mismo que el mes anterior.";
          const miniCard = (titulo, valor, subtitulo, color) => (
            <div className="card" style={{ padding:12,marginBottom:0 }}>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>{titulo}</div>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:900,color }}>{valor}</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{subtitulo}</div>
            </div>
          );
          const listaVariacion = (titulo, icono, items, tipo) => (
            <div className="card" style={{ padding:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <div style={{ fontSize:14,fontWeight:900 }}>{icono} {titulo}</div>
                <div style={{ fontSize:10,color:"#64748b" }}>{items.length} item{items.length!==1?"s":""}</div>
              </div>
              {items.length===0 ? (
                <div style={{ fontSize:12,color:"#64748b",padding:"4px 0 2px" }}>{tipo==="up"?"Sin aumentos para mostrar.":tipo==="down"?"Sin bajas para mostrar.":tipo==="new"?"Sin nuevos gastos este mes.":"No hay gastos desaparecidos."}</div>
              ) : items.map((it,idx)=>(
                <div key={`${titulo}-${it.nombre}`} style={{ padding:"9px 0",borderBottom:idx<items.length-1?"1px solid #1e1e2e":"none" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{it.nombre}</div>
                      <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{tipo==="new"?`Nuevo en ${ml[ml.length-1].label}`:tipo==="gone"?`Antes ${fmtARS(it.anterior)}`:`Antes ${fmtARS(it.anterior)}`}</div>
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:900,color:tipo==="down"||tipo==="gone"?"#4ade80":tipo==="up"?"#f87171":"#e2e8f0" }}>{tipo==="new"?fmtARS(it.actual):tipo==="gone"?`-${fmtARS(it.anterior)}`:`${it.diff>0?"+":"-"} ${fmtARS(Math.abs(it.diff))}`}</div>
                      {it.pct!==null&&tipo!=="new"&&tipo!=="gone"&&<div style={{ fontSize:10,color:tipo==="down"?"#4ade80":"#f87171",fontWeight:800 }}>{Math.abs(it.pct)}%</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
          return(
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>{ml[0].label} · {ml[ml.length-1].label} {mes.y}</div>
                </div>
                <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                  {[3,4,6].map(n=>(
                    <button key={n} onClick={()=>setMesesAtrasVar(n)} style={{ background:mesesAtrasVar===n?"#7c3aed":"#1e1e2e",border:"none",color:mesesAtrasVar===n?"#fff":"#94a3b8",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:12,fontWeight:800 }}>{n}M</button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding:14,background:"radial-gradient(circle at top right,#7c3aed44 0%,transparent 38%),linear-gradient(135deg,#111827 0%,#1a1230 100%)",border:"1px solid #7c3aed66" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12 }}>
                  <div>
                    <div style={{ fontSize:10,color:"#94a3b8",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:5 }}>Gasto actual</div>
                    <div style={{ fontFamily:"'Space Mono',monospace",fontSize:25,fontWeight:900,color:"#f87171" }}>{fmtARS(totalActual)}</div>
                    <div style={{ fontSize:11,color:"#94a3b8",marginTop:3 }}>{tieneBase ? `${diffTotal>=0?"+":"-"} ${fmtARS(Math.abs(diffTotal))} vs mes anterior` : "Sin base suficiente para comparar"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:10,color:"#94a3b8",fontWeight:900,letterSpacing:1,textTransform:"uppercase" }}>Variación</div>
                    <div style={{ fontSize:23,fontWeight:900,color:colorVar,lineHeight:1.1 }}>{textoVar}</div>
                    <div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>mes anterior</div>
                  </div>
                </div>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
                {miniCard("Subieron", subieron.length, "con más gasto", "#f87171")}
                {miniCard("Bajaron", bajaron.length, "con menor gasto", "#4ade80")}
                {miniCard("Nuevos", nuevos.length, "aparecen este mes", "#38bdf8")}
                {miniCard("Sin gasto", sinGasto.length, "no aparecen este mes", "#94a3b8")}
              </div>

              <div className="card" style={{ padding:12,border:"1px solid #1e3a8a",background:"#0f172a" }}>
                <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ width:30,height:30,borderRadius:12,background:"#1e3a8a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>💡</div>
                  <div>
                    <div style={{ fontSize:11,color:"#38bdf8",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:3 }}>Resumen de evolución</div>
                    <div style={{ fontSize:13,fontWeight:800,lineHeight:1.35 }}>{resumen}</div>
                    <div style={{ fontSize:11,color:"#94a3b8",marginTop:4 }}>{conceptos.length} conceptos registrados en el período visible.</div>
                  </div>
                </div>
              </div>

              {listaVariacion("Gastos que más subieron", "📈", subieron, "up")}
              {listaVariacion("Gastos que bajaron", "📉", bajaron, "down")}
              {listaVariacion("Nuevos en el mes", "🆕", nuevos, "new")}
              {listaVariacion("Sin gasto este mes", "♻️", sinGasto, "gone")}

              <div className="card" style={{ padding:12,overflow:"hidden" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:900 }}>Detalle histórico</div>
                    <div style={{ fontSize:11,color:"#64748b" }}>Comparación por concepto.</div>
                  </div>
                  <div style={{ fontSize:10,color:"#64748b" }}>{conceptos.length} concepto{conceptos.length!==1?"s":""}</div>
                </div>
                <div style={{ overflowX:"auto",paddingBottom:4 }}>
                  <div style={{ minWidth: 120 + (ml.length*82) }}>
                    <div style={{ display:"grid",gridTemplateColumns:`minmax(120px,1fr) repeat(${ml.length},82px)`,borderBottom:"1px solid #1e1e2e" }}>
                      <div style={{ padding:"9px 6px",fontSize:10,color:"#64748b",fontWeight:900 }}>CONCEPTO</div>
                      {ml.map(({key,label})=><div key={key} style={{ padding:"9px 6px",fontSize:10,color:key===actualKey?"#a78bfa":"#64748b",fontWeight:900,textAlign:"right" }}>{label}</div>)}
                    </div>
                    {conceptos.map((item,idx)=>(
                      <div key={item.nombre} style={{ display:"grid",gridTemplateColumns:`minmax(120px,1fr) repeat(${ml.length},82px)`,borderBottom:idx<conceptos.length-1?"1px solid #1a1a24":"none" }}>
                        <div style={{ padding:"10px 6px",fontSize:11,fontWeight:800,lineHeight:1.25,wordBreak:"break-word" }}>{item.nombre}</div>
                        {ml.map(({key})=><div key={key} style={{ padding:"10px 6px",textAlign:"right",fontFamily:"'Space Mono',monospace",fontSize:10,color:key===actualKey?"#e2e8f0":"#64748b" }}>{item.vals[key]?fmtARS(item.vals[key]):<span style={{ color:"#2a2a3e" }}>—</span>}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* INGRESOS */}
        {view==="ingresos"&&(<>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11,color:"#7c3aed",fontWeight:900,letterSpacing:2,textTransform:"uppercase" }}>Mis Finanzas</div>
              <div style={{ fontWeight:900,fontSize:21,lineHeight:1.1 }}>Ingresos</div>
              <div style={{ fontSize:13,color:"#94a3b8",marginTop:4 }}>{MESES[mes.m]} {mes.y}</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button className="pb" onClick={()=>cambiarMes(-1)} style={{ background:"#1e1e2e",color:"#c4b5fd",borderRadius:14,padding:"9px 12px" }}>‹</button>
              <button className="pb" onClick={()=>cambiarMes(1)} style={{ background:"#1e1e2e",color:"#c4b5fd",borderRadius:14,padding:"9px 12px" }}>›</button>
            </div>
          </div>

          <div className="card" style={{ background:"linear-gradient(135deg,#111827 0%,#1f1235 100%)",border:"1px solid #7c3aed66",padding:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start" }}>
              <div>
                <span style={lbl}>INGRESOS DEL MES</span>
                <div style={{ fontFamily:"'Space Mono',monospace",fontSize:27,fontWeight:900,color:"#4ade80",lineHeight:1.1 }}>{fmtARS(totalIngresos)}</div>
                <div style={{ fontSize:12,color:"#94a3b8",marginTop:5 }}>{movimientosIngresosMes} movimiento{movimientosIngresosMes!==1?"s":""} este mes · {ingresosHoy>0?`${fmtARS(ingresosHoy)} hoy`:"Hoy sin ingresos"}</div>
              </div>
              <div style={{ minWidth:82,textAlign:"right" }}>
                <div style={{ fontSize:10,color:"#94a3b8",fontWeight:800,textTransform:"uppercase" }}>Avance</div>
                <div style={{ fontSize:22,fontWeight:900,color:"#c4b5fd" }}>{avanceIngresosPct}%</div>
                <div style={{ fontSize:10,color:"#64748b" }}>base actual</div>
              </div>
            </div>
            <div style={{ height:7,background:"#1e1e2e",borderRadius:999,overflow:"hidden",marginTop:12 }}>
              <div style={{ width:`${avanceIngresosPct}%`,height:"100%",background:"linear-gradient(90deg,#22c55e,#a78bfa)",borderRadius:999 }} />
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
            <div className="card" style={{ padding:11 }}><span style={lbl}>SUELDO FIJO</span><div style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:900,color:"#4ade80" }}>{fmtARS(sueldoDelMes)}</div></div>
            <div className="card" style={{ padding:11 }}><span style={lbl}>VARIABLE DEL MES</span><div style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:900,color:"#38bdf8" }}>{fmtARS(totalIngresosExtras)}</div></div>
            <div className="card" style={{ padding:11 }}><span style={lbl}>PROM. DIARIO</span><div style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:900,color:"#fbbf24" }}>{fmtARS(promedioDiarioIngresos)}</div></div>
            <div className="card" style={{ padding:11 }}><span style={lbl}>PROYECCIÓN</span><div style={{ fontFamily:"'Space Mono',monospace",fontSize:15,fontWeight:900,color:"#a78bfa" }}>{fmtARS(proyeccionIngresosMes)}</div></div>
          </div>

          <div className="card" style={{ border:"1px solid #2563eb55",background:"#0f172a",padding:11 }}>
            <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
              <div style={{ width:28,height:28,borderRadius:11,display:"grid",placeItems:"center",background:"#1e3a8a",fontSize:15 }}>💡</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:11,color:"#38bdf8",fontWeight:900,letterSpacing:.8,textTransform:"uppercase" }}>Resumen del mes</div>
                <div style={{ fontSize:13,fontWeight:800,color:"#e2e8f0",lineHeight:1.35,marginTop:3 }}>
                  {totalIngresos<=0
                    ? "Todavía no hay ingresos cargados para este mes."
                    : totalIngresosExtras>0
                      ? `Sumaste ${fmtARS(totalIngresosExtras)} en ingresos variables.`
                      : "Este mes se sostiene principalmente con ingresos fijos."}
                </div>
                <div style={{ fontSize:11,color:"#94a3b8",marginTop:4 }}>
                  {totalIngresos>0
                    ? `El ingreso fijo representa ${sueldoDelMes>0 ? Math.round((sueldoDelMes/totalIngresos)*100) : 0}% del total.`
                    : "Cargá sueldo o ingresos diarios para ver el avance."}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <div><span style={lbl}>SUELDO DEL MES</span><div style={{ fontSize:11,color:"#64748b" }}>Base fija para calcular saldo y margen.</div></div>
              {sueldoDelMes>0&&<div style={{ fontSize:12,color:"#4ade80",fontWeight:800 }}>{fmtARS(sueldoDelMes)}</div>}
            </div>
            <div style={{ display:"flex",gap:8 }}><input className="inf" type="number" placeholder={sueldoDelMes?String(sueldoDelMes):"Monto sueldo"} value={sueldoInput} onChange={e=>setSueldoInput(e.target.value)} inputMode="numeric" style={{ flex:1 }}/><button className="pb" style={{ background:"#7c3aed",color:"#fff",padding:"10px 14px" }} onClick={guardarSueldo}>Guardar</button></div>
          </div>

          <div className="card" style={{ padding:12,border:"1px solid #22c55e44" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}>
              <div><span style={lbl}>INGRESO RÁPIDO</span><div style={{ fontSize:11,color:"#64748b" }}>Cargá ingresos variables del día: ventas, extras, cobros o trabajos.</div></div><div style={{ fontSize:18 }}>⚡</div>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:7,marginBottom:10 }}>{[...new Set([...(cfg.fuentesIngreso || []), ...FUENTES_INGRESO_GENERICAS].map(normalizarFuenteIngreso))].map(f=>(<button key={f} className="pb" onClick={()=>setIngForm(i=>({...i,fuente:f}))} style={{ background:ingForm.fuente===f?"#14532d":"#1e1e2e",color:ingForm.fuente===f?"#4ade80":"#94a3b8",fontSize:12,padding:"7px 10px",border:ingForm.fuente===f?"1px solid #22c55e66":"1px solid #2a2a3e" }}>{f}</button>))}</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 86px",gap:8,marginBottom:10 }}><input className="inf" type="number" placeholder="Monto" value={ingForm.monto} onChange={e=>setIngForm(i=>({...i,monto:e.target.value}))} inputMode="numeric" /><input className="inf" type="number" placeholder="Día" value={ingForm.dia} onChange={e=>setIngForm(i=>({...i,dia:e.target.value}))} inputMode="numeric" /></div>
            <button className="pb" style={{ width:"100%",background:"linear-gradient(90deg,#15803d,#16a34a)",color:"#dcfce7",fontWeight:900,padding:"11px 12px" }} onClick={guardarIngreso}>+ Registrar ingreso variable</button>
          </div>

          {ingresosPorFuente.length>0&&(<div className="card" style={{ padding:12 }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}><div><span style={lbl}>FUENTES VARIABLES</span><div style={{ fontSize:11,color:"#64748b" }}>Acumulado mensual de ingresos diarios o variables.</div></div><div style={{ fontSize:11,color:"#94a3b8" }}>{ingresosPorFuente.filter(f=>f.total>0).length} fuente(s)</div></div>{ingresosPorFuente.filter(f=>f.total>0).map(f=>{ const w = totalIngresosExtras>0 ? Math.min(100,Math.round((f.total/totalIngresosExtras)*100)) : 0; return <div key={f.fuente} style={{ marginBottom:10 }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ width:8,height:8,borderRadius:999,background:f.color,display:"inline-block" }} /><span style={{ fontSize:13,fontWeight:800 }}>{f.fuente}</span><span style={{ fontSize:10,color:"#64748b" }}>{f.items.length}</span></div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:12,color:"#4ade80",fontWeight:900 }}>{fmtARS(f.total)}</div></div><div style={{ height:4,background:"#1e1e2e",borderRadius:999,overflow:"hidden",marginTop:6 }}><div style={{ width:`${w}%`,height:"100%",background:f.color,borderRadius:999 }} /></div></div>; })}</div>)}

          {ingresosDelMes.length>0&&(<div className="card" style={{ padding:12 }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}><div><span style={lbl}>INGRESOS REGISTRADOS</span><div style={{ fontSize:11,color:"#64748b" }}>Ingresos variables cargados este mes.</div></div><div style={{ fontSize:11,color:"#94a3b8" }}>{ingresosDelMes.length} item(s)</div></div>{[...ingresosDelMes].sort((a,b)=>Number(b.dia)-Number(a.dia)).map(item=>(<div key={item.id} style={rowS}><div><div style={{ fontSize:14,fontWeight:800 }}>{normalizarFuenteIngreso(item.fuente)}</div><div style={{ fontSize:11,color:"#64748b" }}>Día {item.dia}</div></div><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,color:"#4ade80",fontWeight:900 }}>{fmtARS(item.monto)}</div><button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:13 }} onClick={()=>setConfirmDel({...item,tipo:"ingresos",servicio:normalizarFuenteIngreso(item.fuente)})}>✕</button></div></div>))}<div style={{ borderTop:"1px solid #1e1e2e",paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:13,color:"#64748b" }}>Total ingresos</span><span style={{ fontFamily:"'Space Mono',monospace",fontSize:14,color:"#4ade80",fontWeight:900 }}>{fmtARS(totalIngresos)}</span></div></div>)}
        </>)}

        {/* CONFIGURACIÓN */}
        {view==="config"&&(<>
          <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>{[["conceptos","🧠 Conceptos"],["medios","💳 Medios"],["categorias","🏷️ Cats"],["etiquetas","🏷️ Tags"],["formas","💳 Formas"],["servicios","📝 Servs"],["fuentes","💰 Fuentes"],["tc","💵 Cambio"],["backup","💾 Datos"]].map(([id,label])=>(<button key={id} className="tb" onClick={()=>setCfgTab(id)} style={{ background:cfgTab===id?"#7c3aed":"#1e1e2e",color:cfgTab===id?"#fff":"#94a3b8" }}>{label}</button>))}</div>
          {cfgTab==="conceptos"&&(
            <>
              <div className="card">
                <span style={lbl}>BUSCAR CONCEPTO</span>
                <input className="inf" placeholder="Buscar: alquiler, netflix, super..." value={busquedaConceptoCfg} onChange={e=>setBusquedaConceptoCfg(e.target.value)} />
                <div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>{conceptosConfigFiltrados.length} concepto(s) activo(s). Para crear uno nuevo, usá la pantalla Cargar.</div>
              </div>

              {editConcepto&&(
                <div className="card" style={{ border:"1px solid #7c3aed55" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                    <div style={{ fontWeight:800,fontSize:15 }}>✏️ Editar concepto</div>
                    <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"6px 10px" }} onClick={()=>setEditConcepto(null)}>✕</button>
                  </div>
                  <span style={lbl}>NOMBRE</span>
                  <input className="inf" value={editConcepto.nombre} onChange={e=>setEditConcepto(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:12 }}/>
                  <span style={lbl}>MEDIO SUGERIDO</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
                    {(cfg.mediosPago||[]).map(mp=><button key={mp.id} className="pb" onClick={()=>setEditConcepto(p=>({...p,medioPagoId:mp.id}))} style={{ background:editConcepto.medioPagoId===mp.id?(mp.color||"#7c3aed"):"#1e1e2e",color:editConcepto.medioPagoId===mp.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{mp.nombre}</button>)}
                  </div>
                  <span style={lbl}>INSTRUMENTO SUGERIDO</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
                    {(cfg.instrumentosPago||[]).map(ins=><button key={ins.id} className="pb" onClick={()=>setEditConcepto(p=>({...p,instrumentoId:ins.id}))} style={{ background:editConcepto.instrumentoId===ins.id?"#7c3aed":"#1e1e2e",color:editConcepto.instrumentoId===ins.id?"#fff":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{ins.nombre}</button>)}
                  </div>
                  <span style={lbl}>CATEGORÍA REAL</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
                    {(cfg.categoriasGasto||[]).map(cg=><button key={cg.id} className="pb" onClick={()=>setEditConcepto(p=>({...p,categoriaGastoId:cg.id}))} style={{ background:editConcepto.categoriaGastoId===cg.id?(cg.color||"#7c3aed"):"#1e1e2e",color:editConcepto.categoriaGastoId===cg.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{cg.nombre}</button>)}
                  </div>
                  <span style={lbl}>MONEDA DEFAULT</span>
                  <div style={{ display:"flex",gap:8,marginBottom:12 }}>{["ARS","USD"].map(mon=><button key={mon} className="pb" onClick={()=>setEditConcepto(p=>({...p,monedaDefault:mon}))} style={{ background:editConcepto.monedaDefault===mon?(mon==="USD"?"#1e3a5f":"#14532d"):"#1e1e2e",color:editConcepto.monedaDefault===mon?(mon==="USD"?"#38bdf8":"#4ade80"):"#94a3b8" }}>{mon}</button>)}</div>
                  <span style={lbl}>ETIQUETAS SUGERIDAS</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:14 }}>
                    {(cfg.etiquetas||[]).map(tag=>{ const activo=(editConcepto.etiquetasIds||[]).includes(tag.id); return <button key={tag.id} className="pb" onClick={()=>toggleEtiquetaConceptoEdit(tag.id)} style={{ background:activo?(tag.color||"#7c3aed"):"#1e1e2e",color:activo?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{tag.nombre}</button>; })}
                  </div>
                  <div style={{ display:"flex",gap:8 }}><button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff" }} onClick={guardarConceptoEditado}>Guardar concepto</button><button className="pb" style={{ flex:1,background:"#2a1a1a",color:"#f87171" }} onClick={()=>desactivarConceptoCfg({id:editConcepto.id,nombre:editConcepto.nombre})}>Desactivar</button></div>
                </div>
              )}

              <div className="card"><span style={lbl}>CONCEPTOS ACTIVOS</span>
                {conceptosConfigFiltrados.slice(0,80).map(con=>{ const cg=(cfg.categoriasGasto||[]).find(x=>x.id===con.categoriaGastoId); const mp=(cfg.mediosPago||[]).find(x=>x.id===con.medioPagoId); const ins=(cfg.instrumentosPago||[]).find(x=>x.id===con.instrumentoId); const tags=(con.etiquetasIds||[]).map(id=>(cfg.etiquetas||[]).find(t=>t.id===id)?.nombre).filter(Boolean); return(
                  <div key={con.id} style={{ padding:"12px 0",borderBottom:"1px solid #1e1e2e" }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start" }}><div style={{ flex:1 }}><div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0" }}>{con.nombre}</div><div style={{ fontSize:11,color:"#64748b",marginTop:4,lineHeight:1.6 }}>{cg?.nombre||"Sin categoría"} · {mp?.nombre||"Sin medio"} · {ins?.nombre||"Sin instrumento"} · {con.monedaDefault||"ARS"}</div>{tags.length>0&&<div style={{ display:"flex",gap:5,flexWrap:"wrap",marginTop:7 }}>{tags.map(t=><span key={t} style={{ fontSize:10,background:"#1e1e2e",color:"#94a3b8",borderRadius:999,padding:"3px 7px" }}>{t}</span>)}</div>}</div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>abrirEditarConcepto(con)}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>desactivarConceptoCfg(con)}>✕</button></div></div></div>
                );})}
                {conceptosConfigFiltrados.length===0&&<div style={{ fontSize:13,color:"#64748b",padding:"12px 0" }}>No hay conceptos con ese filtro.</div>}
              </div>
            </>
          )}
          {cfgTab==="medios"&&(
            <>
              <div className="card" style={{ border:"1px solid #1e3a5f",background:"#0f172a" }}>
                <div style={{ fontWeight:800,fontSize:16,marginBottom:6 }}>💳 Medios de pago</div>
                <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.6 }}>Administrá bancos, billeteras, efectivo o cuentas propias. Los cambios impactan en carga, edición, conceptos y análisis.</div>
              </div>
              <div className="card"><span style={lbl}>CREAR MEDIO DE PAGO</span>
                <input className="inf" placeholder="Ej: Galicia, BBVA, Ualá, Cuenta negocio" value={nuevoMedio.nombre} onChange={e=>setNuevoMedio(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                  <select className="inf" value={nuevoMedio.tipo} onChange={e=>setNuevoMedio(p=>({...p,tipo:e.target.value}))}>{TIPOS_MEDIO_PAGO.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
                  <input className="inf" type="number" placeholder="Orden" value={nuevoMedio.ordenVisual} onChange={e=>setNuevoMedio(p=>({...p,ordenVisual:e.target.value}))}/>
                </div>
                <span style={lbl}>COLOR</span>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setNuevoMedio(p=>({...p,color:c}))} style={{ background:c,borderColor:nuevoMedio.color===c?"#fff":"transparent",transform:nuevoMedio.color===c?"scale(1.2)":"none" }}/>)}</div>
                <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff" }} onClick={crearMedioPagoCfg}>+ Crear medio</button>
              </div>
              <div className="card"><span style={lbl}>BUSCAR MEDIO</span><input className="inf" placeholder="Buscar por nombre..." value={busquedaMedioCfg} onChange={e=>setBusquedaMedioCfg(e.target.value)} /><div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>{mediosConfigFiltrados.length} medio(s) activo(s).</div></div>
              {editMedio&&(
                <div className="card" style={{ border:"1px solid #7c3aed55",background:"#15111f" }}><span style={lbl}>EDITAR MEDIO</span>
                  <input className="inf" value={editMedio.nombre} onChange={e=>setEditMedio(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                    <select className="inf" value={editMedio.tipo} onChange={e=>setEditMedio(p=>({...p,tipo:e.target.value}))}>{TIPOS_MEDIO_PAGO.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
                    <input className="inf" type="number" value={editMedio.ordenVisual} onChange={e=>setEditMedio(p=>({...p,ordenVisual:e.target.value}))}/>
                  </div>
                  <span style={lbl}>COLOR</span>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setEditMedio(p=>({...p,color:c}))} style={{ background:c,borderColor:editMedio.color===c?"#fff":"transparent",transform:editMedio.color===c?"scale(1.2)":"none" }}/>)}</div>
                  <div style={{ display:"flex",gap:8 }}><button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff" }} onClick={guardarMedioEditado}>Guardar medio</button><button className="pb" style={{ flex:1,background:"#2a1a1a",color:"#f87171" }} onClick={()=>desactivarMedioPagoCfg({id:editMedio.id,nombre:editMedio.nombre})}>Desactivar</button></div>
                </div>
              )}
              <div className="card"><span style={lbl}>MEDIOS ACTIVOS</span>
                {mediosConfigFiltrados.map(mp=>(
                  <div key={mp.id} style={{ padding:"12px 0",borderBottom:"1px solid #1e1e2e" }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}><span style={{ width:14,height:14,borderRadius:"50%",background:mp.color||"#64748b",flexShrink:0 }}/><div style={{ minWidth:0 }}><div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{mp.nombre}</div><div style={{ fontSize:11,color:"#64748b",marginTop:3 }}>{mp.tipo||"otro"} · orden {mp.ordenVisual??"—"}</div></div></div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>abrirEditarMedio(mp)}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>desactivarMedioPagoCfg(mp)}>✕</button></div></div></div>
                ))}
                {mediosConfigFiltrados.length===0&&<div style={{ fontSize:13,color:"#64748b",padding:"12px 0" }}>No hay medios con ese filtro.</div>}
              </div>
            </>
          )}
          {cfgTab==="tc"&&(<div className="card"><span style={lbl}>TIPO DE CAMBIO USD → ARS</span><div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>Actual: <strong style={{ color:"#38bdf8" }}>${tc.toLocaleString("es-AR")}</strong></div><div style={{ display:"flex",gap:10,marginBottom:12 }}><input className="inf" type="number" placeholder="Ej: 1415" value={tcInput} onChange={e=>setTcInput(e.target.value)} inputMode="numeric" style={{ flex:1 }}/><button className="pb" style={{ background:"#38bdf8",color:"#0a0a0f",fontWeight:700 }} onClick={guardarTC}>OK</button></div><CotizadorWidget onSelectTC={(valor,tipo)=>{ setCfg(p=>({...p,tipoCambio:valor})); toast_(`TC ${tipo}: $${valor.toLocaleString("es-AR")}`); }}/></div>)}
          {cfgTab==="categorias"&&(
            <>
              <div className="card">
                <div style={{ fontWeight:800,fontSize:16,marginBottom:6 }}>🏷️ Categorías reales</div>
                <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.6,marginBottom:14 }}>Administrá las categorías analíticas usadas para clasificar gastos: Hogar, Auto, Mascotas, Vacaciones, etc.</div>
                <span style={lbl}>CREAR CATEGORÍA</span>
                <input className="inf" placeholder="Ej: Mascotas, Auto, Vacaciones" value={nuevaCategoriaGasto.nombre} onChange={e=>setNuevaCategoriaGasto(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                <div style={{ display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:10 }}>
                  <input className="inf" type="number" placeholder="Orden" value={nuevaCategoriaGasto.ordenVisual} onChange={e=>setNuevaCategoriaGasto(p=>({...p,ordenVisual:e.target.value}))}/>
                </div>
                <span style={lbl}>COLOR</span>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setNuevaCategoriaGasto(p=>({...p,color:c}))} style={{ background:c,borderColor:nuevaCategoriaGasto.color===c?"#fff":"transparent",transform:nuevaCategoriaGasto.color===c?"scale(1.2)":"none" }}/>)}</div>
                <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff" }} onClick={crearCategoriaGastoCfg}>+ Crear categoría</button>
              </div>

              <div className="card"><span style={lbl}>BUSCAR CATEGORÍA</span><input className="inf" placeholder="Buscar por nombre..." value={busquedaCategoriaGastoCfg} onChange={e=>setBusquedaCategoriaGastoCfg(e.target.value)} /><div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>{categoriasGastoConfigFiltradas.length} categoría(s) activa(s).</div></div>

              {editCategoriaGasto&&(
                <div className="card" style={{ border:"1px solid #7c3aed55",background:"#15111f" }}><span style={lbl}>EDITAR CATEGORÍA</span>
                  <input className="inf" value={editCategoriaGasto.nombre} onChange={e=>setEditCategoriaGasto(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                  <input className="inf" type="number" placeholder="Orden" value={editCategoriaGasto.ordenVisual} onChange={e=>setEditCategoriaGasto(p=>({...p,ordenVisual:e.target.value}))} style={{ marginBottom:10 }}/>
                  <span style={lbl}>COLOR</span>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setEditCategoriaGasto(p=>({...p,color:c}))} style={{ background:c,borderColor:editCategoriaGasto.color===c?"#fff":"transparent",transform:editCategoriaGasto.color===c?"scale(1.2)":"none" }}/>)}</div>
                  <div style={{ display:"flex",gap:8 }}><button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff" }} onClick={guardarCategoriaGastoEditada}>Guardar categoría</button><button className="pb" style={{ flex:1,background:"#2a1a1a",color:"#f87171" }} onClick={()=>desactivarCategoriaGastoCfg({id:editCategoriaGasto.id,nombre:editCategoriaGasto.nombre})}>Desactivar</button></div>
                </div>
              )}

              <div className="card"><span style={lbl}>CATEGORÍAS ACTIVAS</span>
                {categoriasGastoConfigFiltradas.map(cat=>(
                  <div key={cat.id} style={{ padding:"12px 0",borderBottom:"1px solid #1e1e2e" }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}><span style={{ width:14,height:14,borderRadius:"50%",background:cat.color||"#64748b",flexShrink:0 }}/><div style={{ minWidth:0 }}><div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{cat.nombre}</div><div style={{ fontSize:11,color:"#64748b",marginTop:3 }}>orden {cat.ordenVisual??"—"}</div></div></div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>abrirEditarCategoriaGasto(cat)}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>desactivarCategoriaGastoCfg(cat)}>✕</button></div></div></div>
                ))}
                {categoriasGastoConfigFiltradas.length===0&&<div style={{ fontSize:13,color:"#64748b",padding:"12px 0" }}>No hay categorías con ese filtro.</div>}
              </div>
            </>
          )}
          {cfgTab==="etiquetas"&&(
            <>
              <div className="card">
                <div style={{ fontWeight:800,fontSize:16,marginBottom:6 }}>🏷️ Etiquetas</div>
                <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.6,marginBottom:14 }}>Administrá etiquetas transversales como Fijo, Variable, Emergencia, Pareja, Trabajo o No esencial.</div>
                <span style={lbl}>CREAR ETIQUETA</span>
                <input className="inf" placeholder="Ej: Emergencia, Pareja, No esencial" value={nuevaEtiqueta.nombre} onChange={e=>setNuevaEtiqueta(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                <input className="inf" type="number" placeholder="Orden" value={nuevaEtiqueta.ordenVisual} onChange={e=>setNuevaEtiqueta(p=>({...p,ordenVisual:e.target.value}))} style={{ marginBottom:10 }}/>
                <span style={lbl}>COLOR</span>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setNuevaEtiqueta(p=>({...p,color:c}))} style={{ background:c,borderColor:nuevaEtiqueta.color===c?"#fff":"transparent",transform:nuevaEtiqueta.color===c?"scale(1.2)":"none" }}/>)}</div>
                <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff" }} onClick={crearEtiquetaCfg}>+ Crear etiqueta</button>
              </div>

              <div className="card"><span style={lbl}>BUSCAR ETIQUETA</span><input className="inf" placeholder="Buscar por nombre..." value={busquedaEtiquetaCfg} onChange={e=>setBusquedaEtiquetaCfg(e.target.value)} /><div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>{etiquetasConfigFiltradas.length} etiqueta(s) activa(s).</div></div>

              {editEtiqueta&&(
                <div className="card" style={{ border:"1px solid #7c3aed55",background:"#15111f" }}><span style={lbl}>EDITAR ETIQUETA</span>
                  <input className="inf" value={editEtiqueta.nombre} onChange={e=>setEditEtiqueta(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:10 }}/>
                  <input className="inf" type="number" placeholder="Orden" value={editEtiqueta.ordenVisual} onChange={e=>setEditEtiqueta(p=>({...p,ordenVisual:e.target.value}))} style={{ marginBottom:10 }}/>
                  <span style={lbl}>COLOR</span>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setEditEtiqueta(p=>({...p,color:c}))} style={{ background:c,borderColor:editEtiqueta.color===c?"#fff":"transparent",transform:editEtiqueta.color===c?"scale(1.2)":"none" }}/>)}</div>
                  <div style={{ display:"flex",gap:8 }}><button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff" }} onClick={guardarEtiquetaEditada}>Guardar etiqueta</button><button className="pb" style={{ flex:1,background:"#2a1a1a",color:"#f87171" }} onClick={()=>desactivarEtiquetaCfg({id:editEtiqueta.id,nombre:editEtiqueta.nombre})}>Desactivar</button></div>
                </div>
              )}

              <div className="card"><span style={lbl}>ETIQUETAS ACTIVAS</span>
                {etiquetasConfigFiltradas.map(tag=>(
                  <div key={tag.id} style={{ padding:"12px 0",borderBottom:"1px solid #1e1e2e" }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}><span style={{ width:14,height:14,borderRadius:"50%",background:tag.color||"#64748b",flexShrink:0 }}/><div style={{ minWidth:0 }}><div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{tag.nombre}</div><div style={{ fontSize:11,color:"#64748b",marginTop:3 }}>orden {tag.ordenVisual??"—"}</div></div></div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>abrirEditarEtiqueta(tag)}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>desactivarEtiquetaCfg(tag)}>✕</button></div></div></div>
                ))}
                {etiquetasConfigFiltradas.length===0&&<div style={{ fontSize:13,color:"#64748b",padding:"12px 0" }}>No hay etiquetas con ese filtro.</div>}
              </div>
            </>
          )}
          {cfgTab==="formas"&&(<><div className="card"><span style={lbl}>NUEVA</span><div style={{ display:"flex",gap:10 }}><input className="inf" placeholder="Ej: Crédito BBVA" value={newForma} onChange={e=>setNewForma(e.target.value)} style={{ flex:1 }}/><button className="pb" style={{ background:"#7c3aed",color:"#fff" }} onClick={addForma}>+</button></div></div><div className="card"><span style={lbl}>ACTUALES</span>{cfg.formasPago.map((fp,idx)=>(<div key={idx}>{editForma?.idx===idx?(<div style={{ display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #1e1e2e",alignItems:"center" }}><input className="ei" value={editForma.val} onChange={e=>setEditForma(ef=>({...ef,val:e.target.value}))}/><button style={ib("#14532d","#4ade80")} onClick={saveForma}>✓</button><button style={ib("#1e1e2e","#94a3b8")} onClick={()=>setEditForma(null)}>✕</button></div>):(<div style={rowS}><span style={{ fontSize:14 }}>{fp}</span><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>setEditForma({idx,val:fp})}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>delForma(idx)}>✕</button></div></div>)}</div>))}</div></>)}
          {cfgTab==="servicios"&&(<><div className="card"><span style={lbl}>AGREGAR</span><select className="inf" value={selCatServ} onChange={e=>setSelCatServ(e.target.value)} style={{ marginBottom:10 }}><option value="">Seleccioná categoría...</option>{cfg.categorias.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select><div style={{ display:"flex",gap:10 }}><input className="inf" placeholder="Nombre" value={newServ} onChange={e=>setNewServ(e.target.value)} style={{ flex:1 }}/><button className="pb" style={{ background:"#7c3aed",color:"#fff" }} onClick={addServ}>+</button></div></div>{cfg.categorias.map(cat=>{ const ss=cfg.servicios[cat.id]||[]; if(!ss.length)return null; return(<div key={cat.id} className="card"><div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}><div style={{ width:10,height:10,borderRadius:"50%",background:cat.color }}/><span style={{ fontWeight:700,fontSize:14,color:cat.color }}>{cat.label}</span></div>{ss.map((s,idx)=>(<div key={idx} style={rowS}><span style={{ fontSize:13 }}>{s}{esDolarConcepto(s)?" 💵":""}</span><button style={ib("#2a1a1a","#f87171")} onClick={()=>delServ(cat.id,idx)}>✕</button></div>))}</div>); })}</>)}
          {cfgTab==="backup"&&(
            <div>
              {/* Info sync Sheets */}
              <div className="card" style={{ border: SHEETS_URL==='TU_URL_AQUI'?"1px solid #422006":"1px solid #14532d" }}>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:8 }}>
                  {SHEETS_URL==='TU_URL_AQUI'?"⚠️ Google Sheets no configurado":"✅ Google Sheets configurado"}
                </div>
                {SHEETS_URL==='TU_URL_AQUI'
                  ? <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.7 }}>Para activar la sincronización automática seguí los pasos del archivo <strong>INSTALACION.md</strong> (Pasos 3 y 4) y reemplazá la URL en App.jsx</div>
                  : <div style={{ fontSize:12,color:"#4ade80" }}>Los datos se sincronizan automáticamente cada vez que cargás un gasto.</div>
                }
                {SHEETS_URL!=='TU_URL_AQUI'&&<button className="pb" style={{ width:"100%",background:"#14532d",color:"#4ade80",marginTop:12 }} onClick={()=>{ syncFullBackup(data); toast_("📤 Backup completo enviado a Sheets"); }}>📤 Enviar backup completo a Sheets</button>}
              </div>
              {/* Backup local JSON */}
              <div className="card">
                <div style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>💾 Backup local</div>
                <div style={{ fontSize:12,color:"#94a3b8",marginBottom:12,lineHeight:1.6 }}>
                  Guardá todos tus datos en un archivo JSON en tu celu o PC. <strong style={{ color:"#e2e8f0" }}>Hacelo antes de cada actualización</strong> para no perder nada.
                </div>
                <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff",marginBottom:10 }} onClick={exportarBackup}>
                  📥 Descargar backup (.json)
                </button>
                <div style={{ fontSize:12,color:"#64748b",marginBottom:8 }}>Restaurar desde backup:</div>
                <label style={{ display:"block",background:"#1e1e2e",borderRadius:12,padding:"12px 16px",textAlign:"center",cursor:"pointer",color:"#94a3b8",fontSize:13,fontWeight:600 }}>
                  📂 Seleccionar archivo .json
                  <input type="file" accept=".json" onChange={importarBackup} style={{ display:"none" }}/>
                </label>
                <div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>⚠️ Restaurar reemplaza todos los datos actuales</div>
              </div>
              {/* Estadísticas */}
              <div className="card">
                <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>📊 Estadísticas</div>
                {[
                  ["Meses con datos", Object.keys(data.gastos).filter(k=>data.gastos[k]?.length>0).length],
                  ["Total gastos cargados", Object.values(data.gastos).flat().length],
                  ["Categorías", cfg.categorias.length],
                  ["Recurrentes", recurrentes.length],
                ].map(([label,val])=>(<div key={label} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e1e2e" }}><span style={{ fontSize:13,color:"#94a3b8" }}>{label}</span><span style={{ fontSize:13,fontWeight:700 }}>{val}</span></div>))}
              </div>
            </div>
          )}
          {cfgTab==="fuentes"&&(<><div className="card"><span style={lbl}>NUEVA</span><div style={{ display:"flex",gap:10 }}><input className="inf" placeholder="Ej: Freelance" value={newFuente} onChange={e=>setNewFuente(e.target.value)} style={{ flex:1 }}/><button className="pb" style={{ background:"#7c3aed",color:"#fff" }} onClick={addFuente}>+</button></div></div><div className="card"><span style={lbl}>ACTUALES</span>{cfg.fuentesIngreso.map((f,idx)=>(<div key={idx}>{editFuente?.idx===idx?(<div style={{ display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #1e1e2e",alignItems:"center" }}><input className="ei" value={editFuente.val} onChange={e=>setEditFuente(ef=>({...ef,val:e.target.value}))}/><button style={ib("#14532d","#4ade80")} onClick={saveFuente}>✓</button><button style={ib("#1e1e2e","#94a3b8")} onClick={()=>setEditFuente(null)}>✕</button></div>):(<div style={rowS}><span style={{ fontSize:14 }}>{f}</span><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>setEditFuente({idx,val:f})}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>delFuente(idx)}>✕</button></div></div>)}</div>))}</div></>)}
        </>)}
      </div>

      {/* ── MODAL REPLICAR MES ── */}
      {replicarStep==="modal"&&(
        <div style={{ position:"fixed",inset:0,background:"#0a0a0f",zIndex:980,overflowY:"auto",paddingBottom:100 }}>
          {/* Header fijo */}
          <div style={{ padding:"24px 16px 16px",background:"#0a0a0f",borderBottom:"1px solid #1e1e2e",position:"sticky",top:0,zIndex:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:18 }}>📋 Replicar a {mesNombreSig()}</div>
                <div style={{ fontSize:12,color:"#94a3b8",marginTop:3 }}>Todos llegan como <span style={{ color:"#fb923c",fontWeight:600 }}>⏳ Pendiente</span></div>
              </div>
              <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"8px 12px",fontSize:13 }} onClick={()=>setReplicarStep(null)}>✕</button>
            </div>
            {/* Resumen */}
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              <div style={{ flex:1,background:"#13131a",borderRadius:12,padding:"10px 12px",border:"1px solid #1e1e2e" }}><div style={{ fontSize:10,color:"#64748b" }}>INCLUIDOS</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:"#4ade80" }}>{gastosIncluidos.length}</div></div>
              <div style={{ flex:1,background:"#13131a",borderRadius:12,padding:"10px 12px",border:"1px solid #1e1e2e" }}><div style={{ fontSize:10,color:"#64748b" }}>EXCLUIDOS</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:"#f87171" }}>{excluirReplicar.size}</div></div>
              <div style={{ flex:2,background:"#13131a",borderRadius:12,padding:"10px 12px",border:"1px solid #1e1e2e" }}><div style={{ fontSize:10,color:"#64748b" }}>REF. ARS</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#e2e8f0" }}>{fmtARS(gastosIncluidos.filter(g=>g.moneda==="ARS").reduce((a,g)=>a+montoReal(g,tc),0))}</div></div>
            </div>
            {/* Filtro categorías */}
            <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:4 }}>
              <button className="pb" onClick={()=>setFiltCatReplicar("todos")} style={{ background:filtCatReplicar==="todos"?"#7c3aed":"#1e1e2e",color:filtCatReplicar==="todos"?"#fff":"#94a3b8",fontSize:12,padding:"6px 12px",flexShrink:0 }}>Todos</button>
              {cfg.categorias.map(cat=>(<button key={cat.id} className="pb" onClick={()=>setFiltCatReplicar(cat.id)} style={{ background:filtCatReplicar===cat.id?cat.color:"#1e1e2e",color:filtCatReplicar===cat.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 12px",flexShrink:0 }}>{cat.label}</button>))}
            </div>
          </div>
          {/* Lista */}
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:11,color:"#64748b",marginBottom:12 }}>Destildá los gastos únicos que no se repiten (Pascuas, Farmacia, etc.)</div>
            {gastosFuenteReplicar.filter(g=>filtCatReplicar==="todos"||g.categoria===filtCatReplicar).map(g=>{
              const cat=cfg.categorias.find(c=>c.id===g.categoria);
              const excluido=excluirReplicar.has(g.id);
              const usd=montoUSDReal(g);
              return(
                <div key={g.id} onClick={()=>toggleExcluir(g.id)} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:excluido?"#0f0f12":"#13131a",borderRadius:14,marginBottom:8,border:`1px solid ${excluido?"#2a2a3e":((cat?.color||"#fff")+"33")}`,cursor:"pointer",opacity:excluido?0.45:1,transition:"all 0.15s" }}>
                  <div style={{ width:22,height:22,borderRadius:6,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:excluido?"#1e1e2e":"#14532d",border:`2px solid ${excluido?"#2a2a3e":"#4ade80"}`,fontSize:13,color:"#4ade80" }}>{!excluido&&"✓"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      {cat&&<div style={{ width:7,height:7,borderRadius:"50%",background:cat.color }}/>}
                      <span style={{ fontSize:14,fontWeight:500 }}>{g.servicio}</span>
                      {g.moneda==="USD"&&<span style={{ fontSize:10,color:"#38bdf8",background:"#1e3a5f",padding:"1px 5px",borderRadius:8 }}>💵</span>}
                    </div>
                    <div style={{ fontSize:10,color:"#64748b",marginTop:1 }}>{cat?.label}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:montoReal(g,tc)>0?"#e2e8f0":"#64748b" }}>{usd>0?fmtUSD(usd):montoReal(g,tc)>0?fmtARS(montoReal(g,tc)):"$ —"}</div>
                    <div style={{ fontSize:10,color:"#fb923c",marginTop:1 }}>→ Pendiente</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Botón fijo abajo */}
          <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:16,background:"#0d0d14",borderTop:"1px solid #1e1e2e" }}>
            <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff",fontSize:16,padding:16 }} onClick={()=>setReplicarStep("confirmar")}>
              Copiar {gastosIncluidos.length} gastos a {mesNombreSig()} →
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMAR REPLICA ── */}
      {replicarStep==="confirmar"&&(
        <div style={{ position:"fixed",inset:0,background:"#0a0a0f",zIndex:980,padding:"28px 16px",overflowY:"auto" }}>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <div style={{ fontSize:56,marginBottom:12 }}>📋</div>
            <div style={{ fontWeight:700,fontSize:20,marginBottom:8 }}>¿Confirmar?</div>
            <div style={{ fontSize:14,color:"#94a3b8",lineHeight:1.8 }}>
              Se crean <strong style={{ color:"#e2e8f0" }}>{gastosIncluidos.length} gastos</strong> en {mesNombreSig()} {mes.m+1>10?mes.y:mes.y}<br/>
              todos en estado <strong style={{ color:"#fb923c" }}>⏳ Pendiente</strong><br/>
              Referencia: <strong style={{ color:"#e2e8f0",fontFamily:"'Space Mono',monospace" }}>{fmtARS(gastosIncluidos.filter(g=>g.moneda==="ARS").reduce((a,g)=>a+montoReal(g,tc),0))}</strong>
            </div>
          </div>
          <div style={{ background:"#13131a",border:"1px solid #1e1e2e",borderRadius:16,padding:"14px 16px",marginBottom:24 }}>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:10,fontWeight:700 }}>SE COPIA</div>
            {["Concepto y categoría","Forma de pago","Monto (como referencia)","Subconceptos USD","Observaciones"].map(i=>(<div key={i} style={{ display:"flex",gap:8,alignItems:"center",padding:"5px 0" }}><span style={{ color:"#4ade80",fontWeight:700,fontSize:13 }}>✓</span><span style={{ fontSize:13 }}>{i}</span></div>))}
            <div style={{ borderTop:"1px solid #1e1e2e",marginTop:8,paddingTop:8 }}>
              {["Estado → Pendiente (marcás cuando pagás)","Fecha vencimiento → vacía (la completás)"].map(i=>(<div key={i} style={{ display:"flex",gap:8,alignItems:"center",padding:"5px 0" }}><span style={{ color:"#fb923c",fontWeight:700,fontSize:13 }}>↺</span><span style={{ fontSize:13,color:"#94a3b8" }}>{i}</span></div>))}
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button className="pb" style={{ flex:1,background:"#1e1e2e",color:"#94a3b8" }} onClick={()=>setReplicarStep("modal")}>← Volver</button>
            <button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff",fontSize:15 }} onClick={confirmarReplica}>✅ Confirmar copia</button>
          </div>
        </div>
      )}

      {/* ── DONE REPLICA ── */}
      {replicarStep==="done"&&(
        <div style={{ position:"fixed",inset:0,background:"#0a0a0f",zIndex:980,padding:"60px 16px",textAlign:"center",overflowY:"auto" }}>
          <div style={{ fontSize:64,marginBottom:16 }}>🎉</div>
          <div style={{ fontWeight:700,fontSize:22,marginBottom:8 }}>¡{mesNombreSig()} listo!</div>
          <div style={{ fontSize:14,color:"#94a3b8",lineHeight:1.8,marginBottom:32 }}>
            {gastosIncluidos.length} gastos copiados como Pendiente<br/>
            Andá a {mesNombreSig()} y ajustá lo que cambió
          </div>
          <div style={{ background:"#13131a",border:"1px solid #1e1e2e",borderRadius:16,padding:"14px 16px",marginBottom:24,textAlign:"left" }}>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:8,fontWeight:700 }}>PRÓXIMOS PASOS</div>
            {["Andá a "+mesNombreSig()+" con las flechas ‹ ›","En Detalle ajustá los montos que cambiaron","Marcá ✅ Pagado a medida que abonás","Actualizá las fechas de vencimiento"].map((paso,i)=>(<div key={i} style={{ display:"flex",gap:10,padding:"6px 0",borderBottom:i<3?"1px solid #1e1e2e":"none" }}><div style={{ width:20,height:20,borderRadius:"50%",background:"#7c3aed22",color:"#7c3aed",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{i+1}</div><span style={{ fontSize:13,color:"#94a3b8" }}>{paso}</span></div>))}
          </div>
          <button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff",fontSize:16,padding:16 }} onClick={()=>{ setReplicarStep(null); cambiarMes(1); }}>
            Ir a {mesNombreSig()} →
          </button>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#0d0d14",borderTop:"1px solid #1e1e2e",display:"flex",padding:"7px 0 11px" }}>
        {[{id:"home",icon:"📊",label:"Inicio"},{id:"cargar",icon:"➕",label:"Cargar"},{id:"resumen",icon:"📋",label:"Detalle"},{id:"analisis",icon:"🔎",label:"Analizar"},{id:"vencimientos",icon:"📅",label:"Vence"},{id:"variacion",icon:"📈",label:"Evol."},{id:"ingresos",icon:"💰",label:"Ingresos"},{id:"config",icon:"⚙️",label:"Ajustes"}].map(nav=>(
          <div key={nav.id} className="ni" style={{ position:"relative" }} onClick={()=>setView(nav.id)}>
            <div style={{ fontSize:17,lineHeight:1 }}>{nav.icon}</div>
            <div style={{ fontSize:9,fontWeight:view===nav.id?800:500,color:view===nav.id?"#7c3aed":"#64748b",marginTop:2 }}>{nav.label}</div>
            {view===nav.id&&<div style={{ position:"absolute",bottom:-4,width:16,height:3,background:"#7c3aed",borderRadius:2 }}/>}
            {nav.id==="vencimientos"&&vencUrgentes>0&&<div style={{ position:"absolute",top:2,right:6,background:"#f87171",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff" }}>{vencUrgentes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
