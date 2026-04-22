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
  guardarSueldoNeon
} from "./services/api";

// Utils
import { fmtARS, fmtUSD, fmtFecha } from "./utils/formatters";
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
  fuentesIngreso: ["Vane","Anses","Descartables V&G"],
  tipoCambio: 1415,
};

// Subconceptos sugeridos para tarjeta dólares
const SUBCONCEPTOS_USD_SUGERIDOS = ["Google One","YouTube","ChatGPT","Netflix","Spotify","Microsoft 365","Apple","Amazon","iCloud","Disney+","HBO","Canva","Notion","Dropbox","Otro"];

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
  const [data,setData]=useState(stored.data);
  const [cfg,setCfg]=useState(stored.config);
  const [recurrentes,setRecurrentes]=useState(stored.recurrentes);
  const [mes,setMes]=useState({y:2026,m:3});
  const [form,setForm]=useState({categoria:"",formaPago:"",servicio:"",monto:"",moneda:"ARS",estado:"pagado",observacion:"",dia:String(now.getDate()),esRecurrente:false,vencimiento:"",subconceptos:[]});
  const [sueldoInput,setSueldoInput]=useState("");
  const [ingForm,setIngForm]=useState({fuente:"",monto:"",dia:String(now.getDate())});
  const [toast,setToast]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [editingGasto,setEditingGasto]=useState(null);
  const [editingMesKey,setEditingMesKey]=useState(null);
  const [subconceptosGasto,setSubconceptosGasto]=useState(null); // gasto en edición de subconceptos
  const [acumModal,setAcumModal]=useState(null); // {existente, nuevo}
  const [filtroEstado,setFiltroEstado]=useState("todos");
  const [cfgTab,setCfgTab]=useState("categorias");
  const [tcInput,setTcInput]=useState("");
  const [showCotizador,setShowCotizador]=useState(false);
  const [gestionServModal,setGestionServModal]=useState(null); // catId para gestionar servicios inline
  const [gestionCatModal,setGestionCatModal]=useState(false);
  const [nuevoServInline,setNuevoServInline]=useState("");
  const [replicarStep,setReplicarStep]=useState(null); // null | 'modal' | 'confirmar' | 'done'
  const [excluirReplicar,setExcluirReplicar]=useState(new Set());
  const [filtCatReplicar,setFiltCatReplicar]=useState("todos");
  const [mesesAtrasVar,setMesesAtrasVar]=useState(3);
  const [newCatLabel,setNewCatLabel]=useState(""); const [newCatColor,setNewCatColor]=useState("#60a5fa"); const [editCat,setEditCat]=useState(null);
  const [newForma,setNewForma]=useState(""); const [editForma,setEditForma]=useState(null);
  const [selCatServ,setSelCatServ]=useState(""); const [newServ,setNewServ]=useState("");
  const [newFuente,setNewFuente]=useState(""); const [editFuente,setEditFuente]=useState(null);

  const mesKey=getMesKey(mes.y,mes.m);
  const tc=cfg.tipoCambio||1415;

// ======================================================
// 🔄 EFECTOS (Carga inicial / sincronización)
// ======================================================

  // Guardar en localStorage cada vez que cambian los datos
  useEffect(()=>{ try{localStorage.setItem("gapp_v7",JSON.stringify(data));}catch{} },[data]);
  useEffect(()=>{ try{localStorage.setItem("gcfg_v7",JSON.stringify(cfg));}catch{} },[cfg]);
  useEffect(()=>{ try{localStorage.setItem("grec_v7",JSON.stringify(recurrentes));}catch{} },[recurrentes]);

// Fuente principal de lectura: Neon vía API
useEffect(() => {
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
}, []);

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
  const totalIngresos=ingresosDelMes.reduce((a,i)=>a+Number(i.monto),0)+Number(sueldoDelMes);
  const saldo=totalIngresos-totalGastos;
  const saldoColor=saldo>=0?"#4ade80":"#f87171";
  const gastosPorCat=cfg.categorias.map(cat=>({...cat,total:gastosDelMes.filter(g=>g.categoria===cat.id).reduce((a,g)=>a+toARS_(g),0),items:gastosDelMes.filter(g=>g.categoria===cat.id)}));
  const [filtroCatInicio,setFiltroCatInicio]=useState(null); // categoría seleccionada desde inicio
  const gastosFiltrados=filtroEstado==="todos"?gastosDelMes:gastosDelMes.filter(g=>g.estado===filtroEstado);
  const gastosPorCatF=cfg.categorias.map(cat=>({...cat,items:gastosFiltrados.filter(g=>g.categoria===cat.id),total:gastosFiltrados.filter(g=>g.categoria===cat.id).reduce((a,g)=>a+toARS_(g),0)}));
  const [busqueda,setBusqueda]=useState("");
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

  const esDolarConcepto = (nombre) => cfg.conceptosDolar?.includes(nombre);

// ======================================================
// 🧩 HANDLERS (acciones del usuario / CRUD / cambios de estado)
// ======================================================
const guardarGasto = async (extra = {}) => {
  const f = { ...form, ...extra };
console.log("GUARDAR GASTO - payload final", f);

  if (!f.categoria || !f.servicio) {
    toast_("Completá categoría y servicio", "err");
    return;
  }

  if (!esDolarConcepto(f.servicio) && !f.monto) {
    toast_("Ingresá el monto", "err");
    return;
  }

  try {
    await crearGasto({
      periodo: mesKey,
      dia: f.dia,
      categoria: f.categoria,
      formaPago: f.formaPago,
      servicio: f.servicio,
      monto: Number(f.monto || 0),
      moneda: f.moneda || "ARS",
      estado: f.estado || "pagado",
      observacion: f.observacion || "",
      vencimiento: f.vencimiento || null,
      esRecurrente: !!f.esRecurrente,
      subconceptos: f.subconceptos || [],
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

    setForm((p) => ({
      ...p,
      servicio: "",
      monto: "",
      observacion: "",
      dia: String(now.getDate()),
      esRecurrente: false,
      vencimiento: "",
      subconceptos: [],
    }));

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
console.log("EDIT SAVE - gastoEditado", gastoEditado);

console.log("ANTES DE ACTUALIZAR GASTO - payload a API", {
  id: gastoEditado.id,
  periodo: key,
  dia: gastoEditado.dia,
  categoria: gastoEditado.categoria,
  formaPago: gastoEditado.formaPago,
  servicio: gastoEditado.servicio,
  monto: Number(gastoEditado.monto || 0),
  moneda: gastoEditado.moneda || "ARS",
  estado: gastoEditado.estado,
  observacion: gastoEditado.observacion || "",
  vencimiento: gastoEditado.vencimiento || null,
  esRecurrente: !!gastoEditado.esRecurrente,
  subconceptos: gastoEditado.subconceptos || [],
});

  try {
	  await actualizarGasto({
      id: gastoEditado.id,
      periodo: key,
      dia: gastoEditado.dia,
      categoria: gastoEditado.categoria,
      formaPago: gastoEditado.formaPago,
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

  const key = editingMesKey || mesKey;

  // Si es edición de un gasto existente
  if (subconceptosGasto.id) {
    setData((prev) => {
      const updated = {
        ...prev,
        gastos: {
          ...prev.gastos,
          [key]: (prev.gastos[key] || []).map((g) =>
            g.id === subconceptosGasto.id ? { ...g, subconceptos: items } : g
          ),
        },
      };
      syncSheets("gastos", key, updated.gastos[key]);
      return updated;
    });

    if (editingGasto && editingGasto.id === subconceptosGasto.id) {
      setEditingGasto((prev) => ({ ...prev, subconceptos: items }));
    }
  }

  // Si es alta nueva, también copiar al formulario actual
  setForm((prev) => ({
    ...prev,
    subconceptos: items,
  }));

  setSubconceptosGasto(null);
  toast_("💵 Desglose guardado");
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

  // ── Replicar mes ──
  const mesKeyAnterior=()=>{ let m=mes.m-1,y=mes.y; if(m<0){m=11;y--;} return getMesKey(y,m); };
  const mesKeySiguiente=()=>{ let m=mes.m+1,y=mes.y; if(m>11){m=0;y++;} return getMesKey(y,m); };
  const mesNombreSig=()=>{ let m=mes.m+1; return MESES[m>11?0:m]; };
  const yaHayMesSiguiente=()=> !!(data.gastos[mesKeySiguiente()]?.length);
  const mostrarReplicar=()=> gastosDelMes.length>0 && !yaHayMesSiguiente();
  const gastosFuenteReplicar= gastosDelMes;
  const gastosIncluidos= gastosFuenteReplicar.filter(g=>!excluirReplicar.has(g.id));
  const toggleExcluir=(id)=>setExcluirReplicar(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const confirmarReplica=()=>{
    const nextKey=mesKeySiguiente();
    const nuevos=gastosIncluidos.map(g=>({
      ...g,
      id:Date.now()+Math.random(),
      estado:"pendiente",
      vencimiento:"",
      dia:"1",
    }));
    setData(prev=>{ const updated={...prev,gastos:{...prev.gastos,[nextKey]:nuevos}}; syncSheets("gastos",nextKey,nuevos); return updated; });
    setReplicarStep("done");
    toast_(`✅ ${nuevos.length} gastos copiados a ${mesNombreSig()}`);
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
  const GastoRow=({item})=>{
    const dias=diasRestantes(item.vencimiento);
    const s=item.estado==="pendiente"?semaforo(dias):null;
    const usd=montoUSDReal(item);
    const ars=toARS_(item);
    const tieneSubconceptos=item.subconceptos&&item.subconceptos.length>0;
    return(
      <div style={{ padding:"10px 0",borderBottom:"1px solid #1e1e2e",cursor:"pointer",borderRadius:8 }} onClick={()=>openEdit(item)}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
              <div style={{ fontSize:14,fontWeight:500 }}>{item.servicio}</div>
              {tieneSubconceptos&&<span style={{ fontSize:10,color:"#38bdf8",background:"#1e3a5f",padding:"1px 6px",borderRadius:10 }}>💵 {item.subconceptos.length} ítems</span>}
              <span style={{ fontSize:10,color:"#64748b",marginLeft:"auto" }}>✎</span>
            </div>
            {/* Subconceptos mini */}
            {tieneSubconceptos&&<div style={{ marginBottom:6,padding:"6px 8px",background:"#0f1a2e",borderRadius:10,fontSize:11 }}>
              {item.subconceptos.map(s=>(<div key={s.id} style={{ display:"flex",justifyContent:"space-between",color:"#64748b",paddingBottom:2 }}><span>{s.nombre}</span><span style={{ color:"#38bdf8",fontFamily:"'Space Mono',monospace" }}>{fmtUSD(s.montoUSD)}</span></div>))}
            </div>}
            <div style={{ display:"flex",gap:4,flexWrap:"wrap",marginBottom:4,alignItems:"center" }}>
              <span onClick={e=>{e.stopPropagation();toggleEstado(item.id);}} style={{ display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:item.estado==="pagado"?"#14532d":"#422006",color:item.estado==="pagado"?"#4ade80":"#fb923c",cursor:"pointer" }}>
                {item.estado==="pagado"?"✅ Pagado":"⏳ Pendiente"}
              </span>
              {item.formaPago==="Débito automático"&&<span style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:700,background:"#1e2a3e",color:"#60a5fa",border:"1px solid #60a5fa33" }}>🏦 Débito auto.</span>}
              {s&&<VencBadge fecha={item.vencimiento} estado={item.estado}/>}
            </div>
            <div style={{ fontSize:11,color:"#64748b" }}>{item.dia}/{mes.m+1} · {item.formaPago}{item.vencimiento?` · Vence ${fmtFecha(item.vencimiento)}`:""}{item.observacion?` · ${item.observacion}`:""}</div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8 }}>
            {usd>0?(<><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,color:"#38bdf8",fontWeight:700 }}>{fmtUSD(usd)}</div><div style={{ fontSize:11,color:"#a78bfa" }}>{fmtARS(ars)}</div></>):(<div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:ars>0?"#e2e8f0":"#64748b" }}>{ars>0?fmtARS(ars):"$ —"}</div>)}
            <button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12 }} onClick={e=>{e.stopPropagation();setConfirmDel({...item,tipo:"gastos"});}}>✕</button>
          </div>
        </div>
      </div>
    );
  };

  const esDolar_form = esDolarConcepto(form.servicio);


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

      {toast&&<div className="toast" style={{ background:toast.type==="err"?"#7f1d1d":"#14532d",color:toast.type==="err"?"#fca5a5":"#86efac" }}>{toast.msg}</div>}

      {/* Modal subconceptos USD */}
      {subconceptosGasto&&<SubconceptosModal gasto={subconceptosGasto} tc={tc} onSave={handleSubconceptosSave} onClose={()=>setSubconceptosGasto(null)}/>}

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
      {editingGasto&&!subconceptosGasto&&<EditModal gasto={editingGasto} config={cfg} tc={tc} onSave={handleEditSave} onClose={()=>{setEditingGasto(null);setEditingMesKey(null);}} onAbrirSubconceptos={(g)=>setSubconceptosGasto(g)}/>}

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
      <div style={{ padding:"28px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:11,color:"#7c3aed",letterSpacing:2,textTransform:"uppercase" }}>Mis Finanzas</div>
          <div style={{ fontSize:20,fontWeight:700 }}>{view==="config"?"Configuración":view==="variacion"?"Variación":view==="vencimientos"?"📅 Vencimientos":`${MESES[mes.m]} ${mes.y}`}</div>
        </div>
        {!["config","variacion","vencimientos"].includes(view)&&(
          <div style={{ display:"flex",gap:8 }}>
            <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"8px 14px" }} onClick={()=>cambiarMes(-1)}>‹</button>
            <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"8px 14px" }} onClick={()=>cambiarMes(1)}>›</button>
          </div>
        )}
      </div>

      <div style={{ padding:"20px 16px 0" }}>

        {/* HOME */}
        {view==="home"&&(<>
          <div className="card" style={{ background:"linear-gradient(135deg,#13131a 0%,#1a1230 100%)",border:"1px solid #2a1a4e" }}>
            <div style={{ fontSize:12,color:"#94a3b8",fontWeight:500,marginBottom:4 }}>SALDO DEL MES</div>
            <div style={{ fontFamily:"'Space Mono',monospace",fontSize:32,fontWeight:700,color:saldoColor }}>{fmtARS(saldo)}</div>
            <div style={{ display:"flex",gap:8,marginTop:14 }}>
              <div className="stat-box"><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>INGRESOS</div><div style={{ fontSize:15,fontWeight:700,color:"#4ade80" }}>{fmtARS(totalIngresos)}</div></div>
              <div className="stat-box"><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>GASTOS</div><div style={{ fontSize:15,fontWeight:700,color:"#f87171" }}>{fmtARS(totalGastos)}</div></div>
            </div>
            {totalIngresos>0&&<><div className="pgb"><div className="pgf" style={{ width:`${Math.min((totalGastos/totalIngresos)*100,100)}%`,background:saldo>=0?"#7c3aed":"#f87171" }}/></div><div style={{ fontSize:11,color:"#64748b",marginTop:4 }}>{Math.round((totalGastos/totalIngresos)*100)}% del ingreso utilizado</div></>}
          </div>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            <div className="stat-box" style={{ border:"1px solid #14532d" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>✅ PAGADO</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#4ade80" }}>{fmtARS(totalPagado)}</div></div>
            <div className="stat-box" style={{ border:"1px solid #422006" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>⏳ PENDIENTE</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#fb923c" }}>{fmtARS(totalPendiente)}</div></div>
            {totalUSD_>0&&<div className="stat-box" style={{ border:"1px solid #1e3a5f" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>💵 USD</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#38bdf8" }}>{fmtUSD(totalUSD_)}</div></div>}
          </div>
		  {cantidadAlertasProximas > 0 && (
  <div
    className="card"
    onClick={() => setView("vencimientos")}
    style={{
      border:"1px solid #f8717144",
      background:"#1a1010",
      cursor:"pointer"
    }}
  >
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <div style={{ fontSize:18 }}>⚠️</div>

      <div style={{ fontSize:14, fontWeight:700, color:"#fca5a5", flex:1 }}>
        Tenés {cantidadAlertasProximas} vencimiento{cantidadAlertasProximas > 1 ? "s" : ""} en los próximos 3 días
      </div>

      <div style={{ fontSize:20, color:"#fca5a5" }}>›</div>
    </div>

    <div style={{ fontSize:13, color:"#cbd5e1", marginBottom:6 }}>
      Total comprometido: <span style={{ color:"#fca5a5", fontWeight:700 }}>{fmtARS(totalAlertasProximas)}</span>
    </div>

    {mayorAlertaProxima && (
      <div style={{ fontSize:12, color:"#94a3b8" }}>
        Mayor próximo: <span style={{ color:"#e2e8f0", fontWeight:600 }}>{mayorAlertaProxima.servicio}</span>
        {" · "}
        <span style={{ color:"#fca5a5", fontWeight:700 }}>{fmtARS(mayorAlertaProxima.montoARS)}</span>
        {" · "}
        <span>{mayorAlertaProxima.dias === 0 ? "vence hoy" : `vence en ${mayorAlertaProxima.dias} día${mayorAlertaProxima.dias > 1 ? "s" : ""}`}</span>
      </div>
    )}
  </div>
)}
          {/* Card replicar mes */}
          {mostrarReplicar()&&<div style={{ background:"linear-gradient(135deg,#1a1230 0%,#0f1a2e 100%)",border:"1px solid #7c3aed44",borderRadius:20,padding:18,marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:"#7c3aed22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>📋</div>
              <div>
                <div style={{ fontWeight:700,fontSize:15 }}>¿Pasamos a {mesNombreSig()}?</div>
                <div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>Replicá todos los gastos de {MESES[mes.m]} como base para el mes siguiente</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="pb" style={{ flex:1,background:"#7c3aed",color:"#fff",fontSize:13 }} onClick={()=>{ setExcluirReplicar(new Set()); setFiltCatReplicar("todos"); setReplicarStep("modal"); }}>📋 Replicar a {mesNombreSig()}</button>
              <button className="pb" style={{ background:"#1e1e2e",color:"#64748b",fontSize:13,padding:"10px 14px" }} onClick={()=>{ /* ocultar temporalmente */ }}>Omitir</button>
            </div>
          </div>}
          {gastosPorCat.filter(c=>c.total>0).map(cat=>{
            const pendCat=cat.items.filter(i=>i.estado==="pendiente");
            const pctGastado=totalIngresos>0?Math.round((cat.total/totalIngresos)*100):0;
            return(<div key={cat.id} className="card" style={{ padding:"13px 16px",cursor:"pointer",transition:"all 0.15s",border:"1px solid #1e1e2e" }}
              onClick={()=>{ setFiltroCatInicio(cat.id); setFiltroEstado("todos"); setView("resumen"); }}
              onMouseEnter={e=>e.currentTarget.style.border=`1px solid ${cat.color}44`}
              onMouseLeave={e=>e.currentTarget.style.border="1px solid #1e1e2e"}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:cat.color }}/>
                  <span style={{ fontWeight:600,fontSize:15 }}>{cat.label}</span>
                  <span style={{ fontSize:12,color:"#64748b" }}>{cat.items.length} ítems</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:cat.color }}>{fmtARS(cat.total)}</div>
                  <span style={{ fontSize:11,color:"#64748b" }}>›</span>
                </div>
              </div>
              {totalIngresos>0&&<div style={{ height:3,borderRadius:2,background:"#1e1e2e",overflow:"hidden" }}><div style={{ height:"100%",borderRadius:2,background:cat.color,width:`${Math.min(pctGastado,100)}%`,opacity:0.6 }}/></div>}
              {pendCat.length>0&&<div style={{ marginTop:6,display:"flex",alignItems:"center",gap:6 }}><span style={{ fontSize:11,color:"#fb923c" }}>⏳ {pendCat.length} pendiente(s): </span><span style={{ fontSize:11,color:"#fb923c",fontWeight:700 }}>{fmtARS(pendCat.reduce((a,g)=>a+toARS_(g),0))}</span></div>}
            </div>);
          })}
          {gastosDelMes.length===0&&<div style={{ textAlign:"center",padding:"40px 0",color:"#64748b" }}><div style={{ fontSize:40,marginBottom:12 }}>💸</div><div style={{ fontWeight:600 }}>Sin gastos este mes</div></div>}
          <button className="pb" style={{ width:"100%",background:"#1e1e2e",color:"#94a3b8",marginTop:8 }} onClick={exportCSV}>📥 Exportar CSV</button>
        </>)}

        {/* CARGAR */}
        {view==="cargar"&&(<>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ fontWeight:700,fontSize:18 }}>Nuevo gasto</div>
            <button className="pb" style={{ background:"#1a1230",color:"#7c3aed",fontSize:13,padding:"8px 14px",border:"1px solid #2a1a4e" }} onClick={()=>setShowCotizador(!showCotizador)}>💵 {showCotizador?"Ocultar":"Ver dólar"}</button>
          </div>
          {showCotizador&&<CotizadorWidget onSelectTC={(valor,tipo)=>{ setCfg(p=>({...p,tipoCambio:valor})); toast_(`TC ${tipo}: $${valor.toLocaleString("es-AR")}`); setShowCotizador(false); }}/>}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={lbl}>CATEGORÍA</span>
              <button onClick={()=>setGestionCatModal(true)} style={{ background:"#1e1e2e",border:"none",color:"#7c3aed",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600 }}>+ Gestionar</button>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{cfg.categorias.map(cat=>(<button key={cat.id} className="pb" onClick={()=>setForm(f=>({...f,categoria:cat.id,servicio:""}))} style={{ background:form.categoria===cat.id?cat.color:"#1e1e2e",color:form.categoria===cat.id?"#0a0a0f":"#94a3b8",fontSize:13 }}>{cat.label}</button>))}</div>
          </div>
          <div style={{ marginBottom:14 }}><span style={lbl}>FORMA DE PAGO</span><div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{cfg.formasPago.map(fp=>(<button key={fp} className="pb" onClick={()=>setForm(f=>({...f,formaPago:fp}))} style={{ background:form.formaPago===fp?"#7c3aed":"#1e1e2e",color:form.formaPago===fp?"#fff":"#94a3b8",fontSize:13 }}>{fp}</button>))}</div></div>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={lbl}>SERVICIO / CONCEPTO</span>
              {form.categoria&&<button onClick={()=>setGestionServModal(form.categoria)} style={{ background:"#1e1e2e",border:"none",color:"#7c3aed",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600 }}>+ Gestionar</button>}
            </div>
            {form.categoria&&(cfg.servicios[form.categoria]||[]).length>0&&<div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>{(cfg.servicios[form.categoria]||[]).map(s=>(<button key={s} className="pb" onClick={()=>setForm(f=>({...f,servicio:s}))} style={{ background:form.servicio===s?(esDolarConcepto(s)?"#1e3a5f":"#1e4032"):"#1e1e2e",color:form.servicio===s?(esDolarConcepto(s)?"#38bdf8":"#4ade80"):"#94a3b8",fontSize:12,padding:"6px 12px",border:esDolarConcepto(s)?"1px solid #38bdf822":"none" }}>{s}{esDolarConcepto(s)?" 💵":""}</button>))}</div>}
            <input className="inf" placeholder="O escribí el concepto..." value={form.servicio} onChange={e=>setForm(f=>({...f,servicio:e.target.value}))}/>
          </div>

          {/* Si es concepto dólar, mostrar desglose; si no, monto normal */}
          {esDolar_form ? (
            <div style={{ marginBottom:14,background:"#0f1a2e",border:"1px solid #1e3a5f",borderRadius:16,padding:"14px 16px" }}>
              <div style={{ fontSize:11,color:"#38bdf8",fontWeight:700,letterSpacing:1,marginBottom:10 }}>💵 DESGLOSE USD — TC ${tc.toLocaleString("es-AR")}</div>
              {form.subconceptos.length>0&&form.subconceptos.map((s,i)=>(<div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13 }}><span>{s.nombre}</span><span style={{ color:"#38bdf8",fontFamily:"'Space Mono',monospace" }}>{fmtUSD(s.montoUSD)}</span></div>))}
              {form.subconceptos.length>0&&<div style={{ borderTop:"1px solid #1e3a5f",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between" }}><span style={{ color:"#64748b",fontSize:13 }}>Total</span><div style={{ textAlign:"right" }}><div style={{ color:"#38bdf8",fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700 }}>{fmtUSD(form.subconceptos.reduce((a,s)=>a+s.montoUSD,0))}</div><div style={{ fontSize:11,color:"#a78bfa" }}>{fmtARS(form.subconceptos.reduce((a,s)=>a+s.montoUSD,0)*tc)}</div></div></div>}
              <button onClick={()=>setSubconceptosGasto({...form,id:"new_"+Date.now()})} style={{ width:"100%",background:"#1e3a5f",border:"none",color:"#38bdf8",borderRadius:12,padding:"10px 0",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,marginTop:10 }}>
                {form.subconceptos.length>0?"✏️ Editar desglose":"+ Agregar ítems USD"}
              </button>
            </div>
          ) : (
            <div style={{ marginBottom:14 }}>
              <span style={lbl}>MONTO Y MONEDA</span>
              <div style={{ display:"flex",gap:8 }}>
                <input className="inf" type="number" placeholder="0" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))} inputMode="numeric" style={{ flex:2 }}/>
                <button className="pb" onClick={()=>setForm(f=>({...f,moneda:"ARS"}))} style={{ background:"#1e1e2e",border:form.moneda==="ARS"?"2px solid #7c3aed":"2px solid transparent",color:form.moneda==="ARS"?"#e2e8f0":"#64748b",padding:"10px 14px" }}>$ARS</button>
                <button className="pb" onClick={()=>setForm(f=>({...f,moneda:"USD"}))} style={{ background:form.moneda==="USD"?"#1e3a5f":"#1e1e2e",border:form.moneda==="USD"?"2px solid #38bdf8":"2px solid transparent",color:form.moneda==="USD"?"#38bdf8":"#64748b",padding:"10px 14px" }}>💵</button>
              </div>
              {form.moneda==="USD"&&form.monto&&<div style={{ fontSize:12,color:"#38bdf8",marginTop:6 }}>≈ {fmtARS(Number(form.monto)*tc)}</div>}
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
          <button
  className="pb"
  style={{ width:"100%",background:"#7c3aed",color:"#fff",fontSize:16,padding:16 }}
  onClick={() => {
    console.log("CLICK BOTON GUARDAR GASTO");
    guardarGasto();
  }}
>
  Guardar gasto
</button>
        </>)}

        {/* DETALLE / RESUMEN */}
        {view==="resumen"&&(<>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              {filtroCatInicio&&<button onClick={()=>setFiltroCatInicio(null)} style={{ background:"#1e1e2e",border:"none",color:"#94a3b8",borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:12 }}>← Todas</button>}
              <div style={{ fontWeight:700,fontSize:18 }}>{filtroCatInicio?cfg.categorias.find(c=>c.id===filtroCatInicio)?.label:"Detalle"}</div>
            </div>
            <div style={{ display:"flex",gap:6 }}>{[["todos","Todos"],["pagado","✅"],["pendiente","⏳"]].map(([v,l])=>(<button key={v} className="tb" onClick={()=>setFiltroEstado(v)} style={{ background:filtroEstado===v?"#7c3aed":"#1e1e2e",color:filtroEstado===v?"#fff":"#94a3b8" }}>{l}</button>))}</div>
          </div>
          {/* Buscador */}
          <input className="inf" placeholder="🔍 Buscar concepto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{ marginBottom:12 }}/>
          <div style={{ fontSize:12,color:"#64748b",marginBottom:12 }}>💡 Tocá cualquier fila para editar</div>
          {filtroEstado!=="todos"&&<div style={{ fontSize:13,color:"#64748b",marginBottom:12 }}>{filtroEstado==="pendiente"?"⏳ ":"✅ "}<strong style={{ color:filtroEstado==="pendiente"?"#fb923c":"#4ade80" }}>{fmtARS(filtroEstado==="pendiente"?totalPendiente:totalPagado)}</strong></div>}
          {gastosPorCatFiltrado2.filter(c=>c.items.length>0).map(cat=>(<div key={cat.id} className="card"><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><div style={{ fontWeight:700,fontSize:15,color:cat.color }}>{cat.label}</div><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,color:cat.color }}>{fmtARS(cat.total)}</div></div>{cat.items.map(item=>(<GastoRow key={item.id} item={item}/>))}</div>))}
          {gastosPorCatFiltrado2.every(c=>c.items.length===0)&&<div style={{ textAlign:"center",padding:"40px 0",color:"#64748b" }}><div style={{ fontSize:32,marginBottom:10 }}>📋</div><div style={{ fontSize:14,fontWeight:600 }}>Sin registros</div></div>}
        </>)}

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

        {/* VARIACIÓN */}
        {view==="variacion"&&(()=>{
          const toARS__=(g,t)=>montoReal(g,t);
          const pct_=(a,b)=>b===0?null:Math.round(((a-b)/b)*100);
          const getMeses_=()=>{ const r=[]; for(let i=mesesAtrasVar-1;i>=0;i--){let m=mes.m-i,y=mes.y;if(m<0){m+=12;y--;}r.push({y,m,key:getMesKey(y,m),label:MESES[m].slice(0,3)});} return r; };
          const ml=getMeses_(); const mak=ml[ml.length-1].key; const mant=ml.length>=2?ml[ml.length-2].key:null;
          const vc=(v)=>v===null?"#64748b":v>10?"#f87171":v<-10?"#4ade80":"#fbbf24";
          const vi=(v)=>v===null?"—":v>0?`▲ ${v}%`:v<0?`▼ ${Math.abs(v)}%`:"=0%";
          const conceptos=Object.entries(ml.reduce((acc,{key})=>{ (data.gastos[key]||[]).forEach(g=>{const k=(g.servicio||"").trim();if(!acc[k])acc[k]={};acc[k][key]=(acc[k][key]||0)+toARS__(g,tc);}); return acc; },{})).sort((a,b)=>Object.values(b[1]).reduce((s,v)=>s+v,0)-Object.values(a[1]).reduce((s,v)=>s+v,0));
          return(
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                <div style={{ fontWeight:700,fontSize:18 }}>Variación</div>
                <div style={{ display:"flex",gap:6 }}>
                  {[3,4,6].map(n=>(<button key={n} onClick={()=>setMesesAtrasVar(n)} style={{ background:mesesAtrasVar===n?"#7c3aed":"#1e1e2e",border:"none",color:mesesAtrasVar===n?"#fff":"#94a3b8",borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600 }}>{n}M</button>))}
                </div>
              </div>
              <div style={{ background:"#13131a",borderRadius:16,overflow:"hidden",border:"1px solid #1e1e2e",marginBottom:14 }}>
                <div style={{ display:"grid",gridTemplateColumns:`1fr repeat(${ml.length},85px)`,borderBottom:"1px solid #1e1e2e" }}>
                  <div style={{ padding:"10px 12px",fontSize:11,color:"#64748b",fontWeight:700 }}>CONCEPTO</div>
                  {ml.map(({key,label})=>(<div key={key} style={{ padding:"10px 8px",fontSize:11,color:key===mak?"#7c3aed":"#64748b",fontWeight:700,textAlign:"right" }}>{label}</div>))}
                </div>
                {conceptos.map(([nombre,vals],idx)=>{ const actual=vals[mak]||0,anterior=mant?(vals[mant]||0):0,v=mant?pct_(actual,anterior):null; return(
                  <div key={nombre} style={{ display:"grid",gridTemplateColumns:`1fr repeat(${ml.length},80px)`,borderBottom:idx<conceptos.length-1?"1px solid #1a1a24":"none",background:idx%2===0?"#13131a":"#0f0f18" }}>
                    <div style={{ padding:"10px 12px",overflow:"hidden" }}>
                      <div style={{ fontSize:12,fontWeight:500,color:"#e2e8f0",wordBreak:"break-word",lineHeight:1.3 }}>{nombre}</div>
                      {v!==null&&<div style={{ fontSize:11,color:vc(v),fontWeight:700,marginTop:2 }}>{vi(v)}</div>}
                    </div>
                    {ml.map(({key})=>(<div key={key} style={{ padding:"10px 6px",textAlign:"right" }}>{vals[key]?<div style={{ fontFamily:"'Space Mono',monospace",fontSize:10,color:key===mak?"#e2e8f0":"#64748b" }}>{fmtARS(vals[key])}</div>:<div style={{ color:"#2a2a3e",fontSize:10 }}>—</div>}</div>))}
                  </div>
                );})}
              </div>
            </div>
          );
        })()}

        {/* INGRESOS */}
        {view==="ingresos"&&(<>
          <div style={{ fontWeight:700,fontSize:18,marginBottom:16 }}>Ingresos</div>
          <div className="card"><span style={lbl}>SUELDO DEL MES</span><div style={{ display:"flex",gap:10 }}><input className="inf" type="number" placeholder={sueldoDelMes?String(sueldoDelMes):"Monto"} value={sueldoInput} onChange={e=>setSueldoInput(e.target.value)} inputMode="numeric" style={{ flex:1 }}/><button className="pb" style={{ background:"#7c3aed",color:"#fff" }} onClick={guardarSueldo}>OK</button></div>{sueldoDelMes>0&&<div style={{ fontSize:13,color:"#4ade80",marginTop:8,fontWeight:600 }}>Registrado: {fmtARS(sueldoDelMes)}</div>}</div>
          <div className="card"><span style={lbl}>OTROS INGRESOS</span><div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:10 }}>{cfg.fuentesIngreso.map(f=>(<button key={f} className="pb" onClick={()=>setIngForm(i=>({...i,fuente:f}))} style={{ background:ingForm.fuente===f?"#14532d":"#1e1e2e",color:ingForm.fuente===f?"#4ade80":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{f}</button>))}</div><div style={{ display:"flex",gap:10,marginBottom:10 }}><input className="inf" type="number" placeholder="Monto" value={ingForm.monto} onChange={e=>setIngForm(i=>({...i,monto:e.target.value}))} inputMode="numeric" style={{ flex:2 }}/><input className="inf" type="number" placeholder="Día" value={ingForm.dia} onChange={e=>setIngForm(i=>({...i,dia:e.target.value}))} inputMode="numeric" style={{ flex:1 }}/></div><button className="pb" style={{ width:"100%",background:"#14532d",color:"#4ade80" }} onClick={guardarIngreso}>+ Agregar ingreso</button></div>
          {ingresosDelMes.length>0&&(<div className="card"><span style={lbl}>REGISTRADOS</span>{ingresosDelMes.map(item=>(<div key={item.id} style={rowS}><div><div style={{ fontSize:14,fontWeight:500 }}>{item.fuente}</div><div style={{ fontSize:11,color:"#64748b" }}>Día {item.dia}</div></div><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,color:"#4ade80",fontWeight:700 }}>{fmtARS(item.monto)}</div><button style={{ background:"#2a1a1a",border:"none",color:"#f87171",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:13 }} onClick={()=>setConfirmDel({...item,tipo:"ingresos",servicio:item.fuente})}>✕</button></div></div>))}<div style={{ borderTop:"1px solid #1e1e2e",paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:13,color:"#64748b" }}>Total</span><span style={{ fontFamily:"'Space Mono',monospace",fontSize:14,color:"#4ade80",fontWeight:700 }}>{fmtARS(totalIngresos)}</span></div></div>)}
        </>)}

        {/* CONFIGURACIÓN */}
        {view==="config"&&(<>
          <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>{[["categorias","🏷️ Cats"],["formas","💳 Pagos"],["servicios","📝 Servs"],["fuentes","💰 Fuentes"],["tc","💵 Cambio"],["backup","💾 Datos"]].map(([id,label])=>(<button key={id} className="tb" onClick={()=>setCfgTab(id)} style={{ background:cfgTab===id?"#7c3aed":"#1e1e2e",color:cfgTab===id?"#fff":"#94a3b8" }}>{label}</button>))}</div>
          {cfgTab==="tc"&&(<div className="card"><span style={lbl}>TIPO DE CAMBIO USD → ARS</span><div style={{ fontSize:13,color:"#64748b",marginBottom:10 }}>Actual: <strong style={{ color:"#38bdf8" }}>${tc.toLocaleString("es-AR")}</strong></div><div style={{ display:"flex",gap:10,marginBottom:12 }}><input className="inf" type="number" placeholder="Ej: 1415" value={tcInput} onChange={e=>setTcInput(e.target.value)} inputMode="numeric" style={{ flex:1 }}/><button className="pb" style={{ background:"#38bdf8",color:"#0a0a0f",fontWeight:700 }} onClick={guardarTC}>OK</button></div><CotizadorWidget onSelectTC={(valor,tipo)=>{ setCfg(p=>({...p,tipoCambio:valor})); toast_(`TC ${tipo}: $${valor.toLocaleString("es-AR")}`); }}/></div>)}
          {cfgTab==="categorias"&&(<><div className="card"><span style={lbl}>NUEVA</span><input className="inf" placeholder="Nombre" value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)} style={{ marginBottom:10 }}/><span style={{ ...lbl,marginTop:4 }}>COLOR</span><div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setNewCatColor(c)} style={{ background:c,borderColor:newCatColor===c?"#fff":"transparent",transform:newCatColor===c?"scale(1.2)":"none" }}/>)}</div><button className="pb" style={{ width:"100%",background:"#7c3aed",color:"#fff" }} onClick={addCat}>+ Agregar</button></div><div className="card"><span style={lbl}>ACTUALES</span>{cfg.categorias.map(cat=>(<div key={cat.id}>{editCat?.id===cat.id?(<div style={{ padding:"10px 0",borderBottom:"1px solid #1e1e2e" }}><input className="ei" value={editCat.label} onChange={e=>setEditCat(ec=>({...ec,label:e.target.value}))} style={{ width:"100%",marginBottom:8 }}/><div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:8 }}>{COLORES.map(c=><div key={c} className="cd" onClick={()=>setEditCat(ec=>({...ec,color:c}))} style={{ background:c,borderColor:editCat.color===c?"#fff":"transparent",transform:editCat.color===c?"scale(1.2)":"none" }}/>)}</div><div style={{ display:"flex",gap:8 }}><button style={ib("#14532d","#4ade80")} onClick={saveCat}>✓ Guardar</button><button style={ib("#1e1e2e","#94a3b8")} onClick={()=>setEditCat(null)}>Cancelar</button></div></div>):(<div style={rowS}><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:14,height:14,borderRadius:"50%",background:cat.color,flexShrink:0 }}/><span style={{ fontSize:14,fontWeight:500 }}>{cat.label}</span></div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>setEditCat({...cat})}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>delCat(cat.id)}>✕</button></div></div>)}</div>))}</div></>)}
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
                    <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{cat?.label}</div>
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
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#0d0d14",borderTop:"1px solid #1e1e2e",display:"flex",padding:"8px 0 12px" }}>
        {[{id:"home",icon:"📊",label:"Inicio"},{id:"cargar",icon:"➕",label:"Cargar"},{id:"resumen",icon:"📋",label:"Detalle"},{id:"vencimientos",icon:"📅",label:"Vence"},{id:"variacion",icon:"📈",label:"Variación"},{id:"ingresos",icon:"💰",label:"Ingresos"}].map(nav=>(
          <div key={nav.id} className="ni" style={{ position:"relative" }} onClick={()=>setView(nav.id)}>
            <div style={{ fontSize:18 }}>{nav.icon}</div>
            <div style={{ fontSize:9,fontWeight:view===nav.id?700:400,color:view===nav.id?"#7c3aed":"#64748b" }}>{nav.label}</div>
            {view===nav.id&&<div style={{ position:"absolute",bottom:-4,width:16,height:3,background:"#7c3aed",borderRadius:2 }}/>}
            {nav.id==="vencimientos"&&vencUrgentes>0&&<div style={{ position:"absolute",top:2,right:6,background:"#f87171",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff" }}>{vencUrgentes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
