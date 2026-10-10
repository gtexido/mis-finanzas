// ======================================================
// 📦 IMPORTS
// ======================================================
// React
import { useState, useEffect, useRef } from "react";

// Services (API)
import {
  getCatalogos,
  getMovimientos,
  getSavings,
  saveSavings,
  crearGasto,
  eliminarGasto,
  actualizarGasto,
  actualizarEstadoGasto,
  crearIngreso,
  actualizarIngreso,
  eliminarSueldo,
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
import {
  fmtARS, fmtUSD, fmtFecha,
  fmtARSCompact, normalizarEtiquetaVisual, normalizarFuenteIngreso,
  slugKey, fmtMonto, normalizarTexto
} from './utils/formatters';

import { diasRestantes, semaforo, MESES, getMesKey, getMesActual } from './utils/dates';
import { montoReal, montoUSDReal } from './utils/money';
import {
  COLORES, TIPOS_MEDIO_PAGO, DEFAULT_CONFIG,
  FUENTES_INGRESO_GENERICAS
} from './utils/constants';
import {
  SHEETS_URL, syncSheets, syncFullBackup,
  medioPagoDesdeCategoriaLegacy, instrumentoDesdeFormaPagoLegacy,
  categoriaLegacyDesdeMedioPagoId, formaPagoLegacyDesdeInstrumentoId,
  categoriaGastoDesdeServicio, etiquetasDesdeServicio
} from './utils/legacy';
import { gastoTieneDesglose, tieneSubconceptosValidos, obtenerMedioPagoComparable, categoriaRealDesdeGasto as categoriaRealDesdeGastoPure, metaGrupoDetalle as metaGrupoDetallePure } from './utils/gastos';

// Mappers
import { mapCatalogosDesdeApi } from "./mappers/catalogosMapper";
import { mapMovimientosDesdeApi, mapHistorialDesdeApi } from "./mappers/movimientosMapper";

// Components
import VencBadge from "./components/VencBadge";
import CotizadorWidget from "./components/CotizadorWidget";
import SubconceptosModal from "./components/SubconceptosModal";
import EditModal from "./components/EditModal";
import VencimientosView from "./components/VencimientosView";
import VariacionView from "./views/VariacionView";
import AnalisisView from "./views/AnalisisView";
import IncomeView from "./views/IncomeView";
import ConfirmDelete from "./components/ConfirmDelete";
import { isAutomaticDebit, missingReplicas } from "./utils/paymentStatus";
import { allExpenses, buildOverview } from "./utils/overview";
import { findPossibleDuplicate, recurringIncreases, nativeAmounts } from "./utils/smartHints";
import { savingsSummary, localDate } from "./utils/savings";
import SavingsView from "./views/SavingsView";
import DuplicateReview from "./components/DuplicateReview";
import DetalleViewShell from "./views/DetalleView";
import UiIcon from "./components/UiIcon";
import MovementRow from "./components/MovementRow";
import ReplicateAction from "./components/ReplicateAction";
import ReplicateModal from "./components/ReplicateModal";
import PremiumHome from "./components/PremiumHome";
import ExpenseFields from "./components/ExpenseFields";
import "./premium.css";

// Financial records are fetched for the signed-in user and kept in memory only.
const load = () => ({data: {gastos:{}, ingresos:{}, sueldo:{}}, config: DEFAULT_CONFIG, recurrentes: []});

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
  const [dueSelection,setDueSelection]=useState({filter:"all",scope:"all"});
  const [today,setToday]=useState(() => new Date());
  useEffect(() => {
    const refreshDay = () => setToday(previous => {
      const current = new Date();
      return previous.toDateString() === current.toDateString() ? previous : current;
    });
    const timer = window.setInterval(refreshDay, 60000);
    window.addEventListener("focus", refreshDay);
    document.addEventListener("visibilitychange", refreshDay);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshDay); document.removeEventListener("visibilitychange", refreshDay); };
  }, []);
  const openAttention = (filter="all",scope="all") => {
    setDueSelection({filter,scope}); setView("vencimientos"); window.scrollTo({top:0,behavior:"instant"});
  };
  const [analisisTab,setAnalisisTab]=useState("concepto");
  const [data,setData]=useState(stored.data);
  const [savingsRecords,setSavingsRecords]=useState([]);
  const [savingsStatus,setSavingsStatus]=useState("loading");
  const [savingsError,setSavingsError]=useState("");
  const [savingsSeed,setSavingsSeed]=useState(null);
  const savingsFetchRef=useRef(0);
  const [cfg,setCfg]=useState(stored.config);
  const [recurrentes,setRecurrentes]=useState(stored.recurrentes);
  const [mes,setMes]=useState(getMesActual);
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
  requiereRevision:false,
  motivoRevision:null,
});
  const [sueldoInput,setSueldoInput]=useState("");
  const [ingForm,setIngForm]=useState({fuente:"",monto:"",dia:String(now.getDate())});
  const [guardarIngresoLoading, setGuardarIngresoLoading] = useState(false);
  const guardarIngresoRef = useRef(false);
  const sueldoRef = useRef(false);
  const [sueldoBusy, setSueldoBusy] = useState(false);
  const eliminarRef = useRef(false);
  const [eliminando, setEliminando] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const estadoRef = useRef(false);
  const [estadoBusy, setEstadoBusy] = useState(false);
  const guardarGastoRef = useRef(false);
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const replicandoRef = useRef(false);
  const [replicando, setReplicando] = useState(false);
  const [replicaCopiados,setReplicaCopiados]=useState(0);
  const [toast,setToast]=useState(null);
  const toastTimerRef = useRef(null);
  const [authUser,setAuthUser]=useState(getSessionUser());
  const sessionRef = useRef(authUser?.usuarioId);
  sessionRef.current = authUser?.usuarioId;
  const [cargaEstado,setCargaEstado]=useState("cargando");
  const [cargaError,setCargaError]=useState("");
  const [recarga,setRecarga]=useState(0);
  const [exportandoBackup,setExportandoBackup]=useState(false);
  const exportandoBackupRef=useRef(false);

  useEffect(() => {
    const sesionVencida = () => {
      resetPrivateState();
      setAuthUser(null);
      setLoginError("La sesión terminó o el acceso cambió. Ingresá nuevamente.");
    };
    window.addEventListener("mf:session-expired", sesionVencida);
    return () => window.removeEventListener("mf:session-expired", sesionVencida);
  }, []);

  const [loginForm,setLoginForm]=useState({ usuarioId:"", pin:"" });
  const [loginLoading,setLoginLoading]=useState(false);
  const [loginError,setLoginError]=useState("");
  const [confirmDel,setConfirmDel]=useState(null);
  const [confirmAction,setConfirmAction]=useState(null);
  const [duplicateReview,setDuplicateReview]=useState(null);
  const duplicateResolverRef=useRef(null);
  const confirmActionResolverRef = useRef(null);
  const [editingGasto,setEditingGasto]=useState(null);
  const [editingMesKey,setEditingMesKey]=useState(null);
  const [subconceptosGasto,setSubconceptosGasto]=useState(null); // gasto en edición de subconceptos
  const [acumModal,setAcumModal]=useState(null); // {existente, nuevo}
  const [filtroEstado,setFiltroEstado]=useState("todos");
  const [desglosesAbiertos,setDesglosesAbiertos]=useState({});
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
  const [mostrarOpcionesCarga,setMostrarOpcionesCarga]=useState(false);
  const [gestionServModal,setGestionServModal]=useState(null); // catId para gestionar servicios inline
  const [gestionCatModal,setGestionCatModal]=useState(false);
  const [nuevoServInline,setNuevoServInline]=useState("");
  const [replicarStep,setReplicarStep]=useState(null); // null | 'modal' | 'confirmar' | 'done'
  const [excluirReplicar,setExcluirReplicar]=useState(new Set());
  const [filtCatReplicar,setFiltCatReplicar]=useState("todos");
  const [mesesAtrasVar,setMesesAtrasVar]=useState(3);
  const [newForma,setNewForma]=useState(""); const [editForma,setEditForma]=useState(null);
  const [selCatServ,setSelCatServ]=useState(""); const [newServ,setNewServ]=useState("");
  const [newFuente,setNewFuente]=useState(""); const [editFuente,setEditFuente]=useState(null);

  const mesKey=getMesKey(mes.y,mes.m);
  const saveScopeRef=useRef(null);
  saveScopeRef.current={owner:authUser?.usuarioId,period:mesKey,view};
  const mesAnteriorInfo = (() => {
    let m = mes.m - 1;
    let y = mes.y;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    return { key: getMesKey(y, m), label: `${MESES[m]} ${y}` };
  })();
  const mesAnteriorKey = mesAnteriorInfo.key;
  const tc=cfg.tipoCambio||1415;
  
    useEffect(() => {
    if (!authUser || !mesKey || cargaEstado !== "listo") return;
    let cancelado = false;

    const cargarMesSeleccionado = async () => {
      try {
        const [movimientosApi, movimientosAnteriorApi] = await Promise.all([
          getMovimientos(mesKey),
          getMovimientos(mesAnteriorKey),
        ]);
        if (cancelado) return;
        const nuevoData = mapMovimientosDesdeApi(movimientosApi, mesKey);
        const dataAnterior = mapMovimientosDesdeApi(movimientosAnteriorApi, mesAnteriorKey);

        setData((prev) => ({
          ...prev,
          gastos: {
            ...prev.gastos,
            [mesKey]: nuevoData.gastos[mesKey] || [],
            [mesAnteriorKey]: dataAnterior.gastos[mesAnteriorKey] || [],
          },
          ingresos: {
            ...prev.ingresos,
            [mesKey]: nuevoData.ingresos[mesKey] || [],
            [mesAnteriorKey]: dataAnterior.ingresos[mesAnteriorKey] || [],
          },
          sueldo: {
            ...prev.sueldo,
            [mesKey]: nuevoData.sueldo[mesKey] || 0,
            [mesAnteriorKey]: dataAnterior.sueldo[mesAnteriorKey] || 0,
          },
        }));
      } catch (e) {
        if (cancelado) return;
        setCargaError(e.message || "No se pudo cargar el mes.");
        setCargaEstado("error");
      }
    };

    cargarMesSeleccionado();
    return () => { cancelado = true; };
  }, [authUser, mesKey, mesAnteriorKey, cargaEstado]);
  
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

  useEffect(() => {
    if(!authUser || cargaEstado!=="listo")return;
    try{localStorage.setItem(`mf_preferences_${authUser.usuarioId}`,JSON.stringify({tipoCambio:cfg.tipoCambio,fuentesIngreso:cfg.fuentesIngreso}));}catch{}
  }, [authUser,cargaEstado,cfg.tipoCambio,cfg.fuentesIngreso]);
  useEffect(() => {
    ["gapp_v7", "gcfg_v7", "grec_v7"].forEach(key => {try {localStorage.removeItem(key);} catch {}});
  }, []);
  useEffect(() => {
    setIngForm({fuente:"",monto:"",dia:String(Math.min(new Date().getDate(),new Date(mes.y,mes.m+1,0).getDate()))});
    setSavingsSeed(null);
    setSueldoInput("");
    setForm(p => ({...p,dia:String(Math.min(Number(p.dia)||1,new Date(mes.y,mes.m+1,0).getDate()))}));
  }, [mesKey]);

// Carga completa: evolución, vencimientos y exportación comparten el mismo historial.
useEffect(() => {
  if (!authUser) return;
  let cancelado = false;
  setCargaEstado("cargando");
  setCargaError("");
  const cargar = async () => {
    try {
      const [catalogosApi, movimientosApi] = await Promise.all([getCatalogos(), getMovimientos(null)]);
      if (cancelado) return;
      const nextConfig=mapCatalogosDesdeApi(catalogosApi);
      try{
        const prefs=JSON.parse(localStorage.getItem(`mf_preferences_${authUser.usuarioId}`)||'{}');
        if(Number.isFinite(Number(prefs.tipoCambio))&&Number(prefs.tipoCambio)>0)nextConfig.tipoCambio=Number(prefs.tipoCambio);
        if(Array.isArray(prefs.fuentesIngreso))nextConfig.fuentesIngreso=prefs.fuentesIngreso.filter(x=>typeof x==='string'&&x.trim()).slice(0,200);
      }catch{}
      setCfg(nextConfig);
      setData(mapHistorialDesdeApi(movimientosApi));
      setCargaEstado("listo");
    } catch (error) {
      if (cancelado) return;
      setCargaError(error.message || "No se pudieron cargar tus datos.");
      setCargaEstado("error");
    }
  };
  cargar();
  return () => { cancelado = true; };
}, [authUser?.usuarioId, recarga]);

const refreshSavings = async () => {
  const owner=authUser?.usuarioId, ticket=++savingsFetchRef.current;
  if(!owner)return;
  setSavingsStatus("loading");setSavingsError("");
  try {
    const records=await getSavings();
    if(sessionRef.current!==owner || ticket!==savingsFetchRef.current)return;
    setSavingsRecords(records);setSavingsStatus("ready");
  } catch(error) {
    if(sessionRef.current!==owner || ticket!==savingsFetchRef.current)return;
    setSavingsStatus("error");setSavingsError(error.message || "No se pudieron cargar los ahorros.");
  }
};
useEffect(()=>{refreshSavings();},[authUser?.usuarioId,recarga]);
const openSavings = (seed=null) => {setSavingsSeed(seed);setView("ahorros");window.scrollTo({top:0,behavior:"instant"});};
const convertToSavings = item => {
  const amounts=nativeAmounts(item), currencies=amounts ? Object.keys(amounts) : [];
  if(item.estado!=="pagado" || item.requiereRevision)return toast_("Confirmá el pago y los datos antes de convertir el gasto.","warn");
  if(currencies.length!==1)return toast_("El gasto combina monedas. Separá sus importes antes de convertirlo.","warn");
  openSavings({kind:"aporte",sourceId:item.id,sourceTitle:item.servicio,amount:String(amounts[currencies[0]]),currency:currencies[0],date:`${mesKey}-${String(item.dia).padStart(2,'0')}`,destination:item.medioPagoNombre || item.medioPago || "",goal:""});
};
const persistSavings = async (method,payload) => {
  const owner=authUser?.usuarioId;
  if(!owner)throw new Error("La sesión terminó. Ingresá nuevamente.");
  const result=await saveSavings(method,payload);
  if(sessionRef.current!==owner)throw new Error("La sesión terminó.");
  ++savingsFetchRef.current;
  setSavingsRecords(result.records);setSavingsStatus("ready");setSavingsError("");
  if(result.converted && payload.sourceId)setData(previous=>({...previous,gastos:Object.fromEntries(Object.entries(previous.gastos).map(([key,rows])=>[key,rows.filter(row=>row.id!==payload.sourceId)]))}));
  setSavingsSeed(null);
  toast_(method==="DELETE"?"Movimiento de ahorro eliminado":result.converted?"El gasto pasó a Ahorros":"Ahorro actualizado");
};

  const toast_=(msg,type="ok")=>{
    const normalizedType = type === "error" ? "err" : (type || "ok");
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type: normalizedType, id: Date.now() });
    toastTimerRef.current = setTimeout(()=>setToast(null),2800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const toastVisual = toast ? ({
    ok: { icon:"✅", title:"Listo" },
    err: { icon:"❌", title:"No se pudo completar" },
    warn: { icon:"⚠️", title:"Atención" },
    info: { icon:"ℹ️", title:"Información" },
  }[toast.type] || { icon:"ℹ️", title:"Aviso" }) : null;

  const pedirConfirmacion = ({
    title = "Confirmar acción",
    message = "¿Querés continuar?",
    detail = "",
    note = "",
    icon = "⚠️",
    variant = "warn",
    confirmLabel = "Aceptar",
    cancelLabel = "Cancelar",
  } = {}) => new Promise((resolve) => {
    confirmActionResolverRef.current = resolve;
    setConfirmAction({ title, message, detail, note, icon, variant, confirmLabel, cancelLabel });
  });

  const resolverConfirmacion = (ok) => {
    if (confirmActionResolverRef.current) {
      confirmActionResolverRef.current(ok);
      confirmActionResolverRef.current = null;
    }
    setConfirmAction(null);
  };

  const confirmarDuplicadoVisual = (item, period) => new Promise(resolve => {
    duplicateResolverRef.current = resolve;
    setDuplicateReview({item,period});
  });
  const resolverDuplicado = action => {
    const resolve = duplicateResolverRef.current;
    duplicateResolverRef.current = null;
    setDuplicateReview(null);
    resolve?.(action);
  };

  const gastosDelMes=data.gastos[mesKey]||[];
const ingresosDelMes=data.ingresos[mesKey]||[];
const sueldoDelMes=data.sueldo[mesKey]||0;
const ingresosMesAnterior=data.ingresos[mesAnteriorKey]||[];
const sueldoMesAnterior=data.sueldo[mesAnteriorKey]||0;

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
  const totalIngresosExtrasAnterior=ingresosMesAnterior.reduce((a,i)=>a+Number(i.monto||0),0);
  const totalIngresosAnterior=totalIngresosExtrasAnterior+Number(sueldoMesAnterior||0);
  const tieneIngresosMesAnterior=ingresosMesAnterior.length>0 || Number(sueldoMesAnterior||0)>0;
  const variacionIngresos=totalIngresos-totalIngresosAnterior;
  const variacionIngresosPct=tieneIngresosMesAnterior && totalIngresosAnterior>0 ? Math.round((variacionIngresos/totalIngresosAnterior)*100) : null;
  const diaActualMes = mes.y === now.getFullYear() && mes.m === now.getMonth() ? now.getDate() : new Date(mes.y, mes.m + 1, 0).getDate();
  const diasDelMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const ingresosHoy = ingresosDelMes.filter(i=>Number(i.dia)===diaActualMes).reduce((a,i)=>a+Number(i.monto||0),0);
  const movimientosIngresosMes = ingresosDelMes.length + (Number(sueldoDelMes)>0 ? 1 : 0);
  const ingresosVariablesOrdenados = [...ingresosDelMes].sort((a,b)=>{
    const diaDiff = Number(b.dia || 0) - Number(a.dia || 0);
    if (diaDiff !== 0) return diaDiff;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
  const ultimoIngresoVariable = ingresosVariablesOrdenados[0] || null;
  const promedioPorCargaIngreso = ingresosDelMes.length > 0 ? totalIngresosExtras / ingresosDelMes.length : 0;
  const metaIngresosMes = Math.max(Number(sueldoDelMes || 0), totalIngresos, 1);
  const avanceIngresosPct = Math.min(100, Math.round((totalIngresos / metaIngresosMes) * 100));
  const fuentesIngresoNormalizadas = [
  ...new Set([
    ...(cfg.fuentesIngreso || []),
    ...FUENTES_INGRESO_GENERICAS
  ].map(normalizarFuenteIngreso))
];

const ingresosPorFuente = fuentesIngresoNormalizadas.map((fuente, idx)=>{
  const fuenteNormalizada = normalizarFuenteIngreso(fuente);
  const items = ingresosDelMes.filter(i=>normalizarFuenteIngreso(i.fuente)===fuenteNormalizada);
  const total = items.reduce((a,i)=>a+Number(i.monto||0),0);
  return { fuente: fuenteNormalizada, total, items, color: COLORES[idx % COLORES.length] };
}).filter(f=>f.total>0 || f.fuente===normalizarFuenteIngreso(ingForm.fuente));
  const fuenteMayorIngreso = ingresosPorFuente.filter(f=>f.total>0).sort((a,b)=>b.total-a.total)[0] || null;
  const saldo=totalIngresos-totalGastos;
  const saldoColor=saldo>=0?"#4ade80":"#f87171";
  const categoriaRealDesdeGasto = (g = {}) =>
    categoriaRealDesdeGastoPure(g, cfg.conceptos, cfg.categoriasGasto, cfg.categorias);

  const agruparPorCategoriaReal = (items = []) =>
    Array.from(items.reduce((mapa, g) => {
      const meta = categoriaRealDesdeGasto(g);
      const grupo = mapa.get(meta.id) || {
        id: meta.id,
        label: meta.label,
        color: meta.color,
        total: 0,
        items: [],
      };

      grupo.total += toARS_(g);
      grupo.items.push(g);
      mapa.set(meta.id, grupo);
      return mapa;
    }, new Map()).values());

  const gastosPorCat=agruparPorCategoriaReal(gastosDelMes);
  const [filtroCatInicio,setFiltroCatInicio]=useState(null); // categoría seleccionada desde inicio
  const gastosFiltrados = filtroEstado === "todos"
    ? gastosDelMes
    : filtroEstado === "automatico" ? gastosDelMes.filter(g=>isAutomaticDebit(g,cfg)) : filtroEstado === "revisar"
      ? gastosDelMes.filter(g => !!g.requiereRevision)
      : gastosDelMes.filter(g => g.estado === filtroEstado);
  const gastosPorCatF=agruparPorCategoriaReal(gastosFiltrados);
  const [busqueda,setBusqueda]=useState("");
  const [mostrarTodosConceptos,setMostrarTodosConceptos]=useState(false);
  const textoBusquedaDetalle = busqueda.trim().toLowerCase();

  const metaGrupoDetalle = (g) =>
    metaGrupoDetallePure(g, cfg.categorias);

  const gastosDetalleFiltrados = gastosFiltrados.filter((g) => {
    const coincideBusqueda =
      !textoBusquedaDetalle ||
      String(g.servicio || "").toLowerCase().includes(textoBusquedaDetalle) ||
      String(g.medioPagoNombre || g.medioPago || "").toLowerCase().includes(textoBusquedaDetalle) ||
      String(g.categoriaGastoNombre || g.categoriaGasto || "").toLowerCase().includes(textoBusquedaDetalle);

    const categoriaFiltro = categoriaRealDesdeGasto(g);
    const coincideFiltroInicio =
      !filtroCatInicio ||
      categoriaFiltro.id === filtroCatInicio ||
      g.categoria === filtroCatInicio ||
      g.categoriaId === `cat_${filtroCatInicio}` ||
      g.medioPagoId === filtroCatInicio ||
      g.categoriaGastoId === filtroCatInicio;

    return coincideBusqueda && coincideFiltroInicio;
  });

  const gastosPorCatFiltrado2 = Array.from(
    gastosDetalleFiltrados.reduce((mapa, g) => {
      const meta = metaGrupoDetalle(g);
      const grupo = mapa.get(meta.id) || {
        ...meta,
        total: 0,
        items: [],
      };

      grupo.total += toARS_(g);
      grupo.items.push(g);
      mapa.set(meta.id, grupo);
      return mapa;
    }, new Map()).values()
  ).sort((a, b) => b.total - a.total);

  // ── DetalleView derived vars (hoisted from IIFE) ────────────────────────────
  const gruposDetalle = gastosPorCatFiltrado2.filter(c => c.items.length > 0);
  const totalDetalleFiltrado = gruposDetalle.reduce((acc, c) => acc + Number(c.total || 0), 0);
  const cantidadDetalleFiltrada = gruposDetalle.reduce((acc, c) => acc + (c.items?.length || 0), 0);
  const cantidadPendienteDetalle = gastosDetalleFiltrados.filter(g => g.estado === "pendiente").length;
  const totalPendienteDetalle = gastosDetalleFiltrados.filter(g => g.estado === "pendiente").reduce((acc, g) => acc + toARS_(g), 0);
  const cantidadRevisarDetalle = gastosDetalleFiltrados.filter(g => !!g.requiereRevision).length;
  const totalRevisarDetalle = gastosDetalleFiltrados.filter(g => !!g.requiereRevision).reduce((acc, g) => acc + toARS_(g), 0);
  const hayFiltroActivo = filtroCatInicio || filtroEstado !== "todos" || busqueda.trim();
  const tituloDetalle = filtroCatInicio
    ? cfg.categorias.find(c => c.id === filtroCatInicio)?.label || "Detalle"
    : filtroEstado === "automatico" ? "Débitos automáticos" : filtroEstado === "revisar" ? "Para revisar" : "Detalle";

  const todosVenc=Object.values(data.gastos).flat().filter(g=>g.estado==="pendiente"&&g.vencimiento);
  const overview = buildOverview(allExpenses(data),tc,today);
  const vencUrgentes = overview.attentionCount;

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

const esDolarConcepto = (nombre) => cfg.conceptosDolar?.includes(nombre);


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
  accionSugerida: "nuevo",
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


const guardarGastoInterno = async (extra = {}) => {
  let f = { ...form, ...extra };
  const owner=authUser.usuarioId;
  const isCurrentDraft = () => sessionRef.current===owner && saveScopeRef.current.period===mesKey && saveScopeRef.current.view==="cargar";

  const conceptoLimpio = String(f.servicio || "").trim();
  const montoNumero = Number(f.monto || 0);
  const diaNumero = Number(f.dia || 0);
  const ultimoDiaMes = new Date(mes.y, mes.m + 1, 0).getDate();
  const esDetalle = f.tipoGasto === "detalle";
  const medioPagoValido =
    !!f.medioPagoId &&
    f.medioPagoId !== "mp_sin_definir";

  const instrumentoSeleccionado = (cfg.instrumentosPago || []).find((ins) => ins.id === f.instrumentoId);
  const instrumentoNombreNormalizado = String(instrumentoSeleccionado?.nombre || "")
    .trim()
    .toLowerCase();
  const instrumentoIdNormalizado = String(f.instrumentoId || "")
    .trim()
    .toLowerCase();

  const instrumentoValido =
    !!f.instrumentoId &&
    !instrumentoIdNormalizado.includes("sin_definir") &&
    instrumentoNombreNormalizado !== "sin definir";


  if (!conceptoLimpio) {
    toast_("Escribí el concepto del gasto antes de guardar.", "err");
    return;
  }

  f = {
    ...f,
    servicio: conceptoLimpio,
  };

  if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > ultimoDiaMes) {
    toast_(`Ingresá un día válido entre 1 y ${ultimoDiaMes}.`, "err");
    return;
  }

  if (!medioPagoValido) {
    toast_("Seleccioná un medio de pago para evitar que quede sin clasificar.", "err");
    return;
  }

  if (!instrumentoValido) {
    toast_("Seleccioná cómo pagaste antes de guardar.", "err");
    return;
  }


  if (!esDetalle && (!Number.isFinite(montoNumero) || montoNumero <= 0)) {
    toast_("Ingresá un monto mayor a cero.", "err");
    return;
  }

  if (esDetalle && (!f.subconceptos || f.subconceptos.length === 0)) {
    toast_("Primero agregá ítems al desglose y tocá ‘Guardar desglose y volver’.", "err");
    abrirSubconceptosConCotizacion({
      ...f,
      id: "new_" + Date.now(),
      moneda: f.moneda || "ARS",
      subconceptos: f.subconceptos || [],
    });
    return;
  }

  // Refresh this month before writing: a second device may have registered the charge.
  let latest;
  try {
    latest = mapMovimientosDesdeApi(await getMovimientos(mesKey), mesKey).gastos[mesKey] || [];
  } catch (error) {
    if(sessionRef.current===owner)toast_("No pudimos comprobar si el gasto ya existe. Tu borrador sigue acá; intentá otra vez.","err");
    return;
  }
  if(!isCurrentDraft())return;
  const duplicate = findPossibleDuplicate(f, latest);
  if (duplicate) {
    const action = await confirmarDuplicadoVisual(duplicate, mesKey);
    if(!isCurrentDraft())return;
    if (action === 'view') { openEdit(duplicate, mesKey); return; }
    if (action !== 'save') return;
    f = { ...f, accionCompuesto:"nuevo", decisionManual:true };
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

      if(sessionRef.current!==owner)return;
  const synced = await refrescarMes(mesKey,owner);

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

      if(synced)toast_("Gasto actualizado");
      return;
    } catch (e) {
      console.error(e);
      toast_("No se pudo actualizar el gasto existente", "err");
      return;
    }
  }

if (!f.conceptoId && f.crearConceptoPendiente) {
  try {
    const nombreConcepto = String(f.servicio || "").trim();

    if (!nombreConcepto) {
      toast_("Escribí el nombre del concepto", "err");
      return;
    }

    const conceptoCreado = await crearConcepto({
      nombre: nombreConcepto,
      tipoMovimiento: "GASTO",
      categoriaGastoId: f.categoriaGastoId || "cg_otros",
      medioPagoId: f.medioPagoId || "mp_sin_definir",
      instrumentoId: f.instrumentoId,
      monedaDefault: f.moneda || "ARS",
      etiquetasIds: f.etiquetasIds || [],
    });

    const catalogosApi = await getCatalogos();
    const cfgActualizada = mapCatalogosDesdeApi(catalogosApi, tc);
    setCfg(cfgActualizada);

    const conceptoCreadoId =
      conceptoCreado?.concepto_id || conceptoCreado?.conceptoId || conceptoCreado?.id;

    const conceptoActualizado =
      (cfgActualizada.conceptos || []).find((c) => c.id === conceptoCreadoId) ||
      (cfgActualizada.conceptos || []).find(
        (c) => String(c.nombre || "").trim().toLowerCase() === nombreConcepto.toLowerCase()
      ) ||
      (conceptoCreadoId
        ? {
            id: conceptoCreadoId,
            conceptoId: conceptoCreadoId,
            nombre: conceptoCreado?.nombre || nombreConcepto,
            medioPagoId: conceptoCreado?.medio_pago_id || f.medioPagoId || "mp_sin_definir",
            instrumentoId: conceptoCreado?.instrumento_id || f.instrumentoId,
            categoriaGastoId: conceptoCreado?.categoria_gasto_id || f.categoriaGastoId || "cg_otros",
            etiquetasIds: f.etiquetasIds || [],
            monedaDefault: conceptoCreado?.moneda_default || f.moneda || "ARS",
          }
        : null);

    if (conceptoActualizado) {
      f = {
        ...f,
        conceptoId: conceptoActualizado.id,
        servicio: conceptoActualizado.nombre,
        medioPagoId: conceptoActualizado.medioPagoId || f.medioPagoId || "mp_sin_definir",
        instrumentoId: conceptoActualizado.instrumentoId || f.instrumentoId,
        categoriaGastoId: conceptoActualizado.categoriaGastoId || f.categoriaGastoId || "cg_otros",
        etiquetasIds: conceptoActualizado.etiquetasIds?.length
          ? conceptoActualizado.etiquetasIds
          : f.etiquetasIds || [],
        moneda: conceptoActualizado.monedaDefault || f.moneda || "ARS",
        categoria: categoriaLegacyDesdeMedioPagoId(
          conceptoActualizado.medioPagoId || f.medioPagoId || "mp_sin_definir"
        ),
        formaPago: formaPagoLegacyDesdeInstrumentoId(
          conceptoActualizado.instrumentoId || f.instrumentoId
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
    instrumentoId: f.instrumentoId,
    categoriaGastoId: f.categoriaGastoId || categoriaGastoDesdeServicio(f.servicio),
    etiquetasIds: f.etiquetasIds || [],
    servicio: f.servicio,
    monto: montoCabecera,
    moneda: f.moneda || "ARS",
    estado: f.estado || "pagado",
    observacion: f.observacion || "",
    vencimiento: f.vencimiento || null,
    esRecurrente: !!f.esRecurrente,
    requiereRevision: !!f.requiereRevision,
    motivoRevision: f.requiereRevision ? (f.motivoRevision || "REVISAR_MANUAL") : null,
    origenMovimiento: f.requiereRevision ? (f.origenMovimiento || "CARGA_MANUAL") : null,
    subconceptos: subconceptosPayload,
  });

  if(sessionRef.current!==owner)return;
  const synced = await refrescarMes(mesKey,owner);

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

    if(synced)toast_("Gasto guardado correctamente");
  } catch (e) {
    console.error(e);
    toast_(e.message || "No se pudo guardar", "err");
  }
};

  const guardarGasto = async (extra = {}) => {
    if (guardarGastoRef.current) return;
    guardarGastoRef.current = true;
    setGuardandoGasto(true);
    try {
      await guardarGastoInterno(extra);
    } finally {
      guardarGastoRef.current = false;
      setGuardandoGasto(false);
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
    setForm(p=>({...p,servicio:"",monto:"",observacion:"",dia:String(now.getDate()),esRecurrente:false,vencimiento:"",subconceptos:[],requiereRevision:false,motivoRevision:null,origenMovimiento:null}));
    toast_("Gasto guardado correctamente");
  };

  const handleAcumular=()=>{
    const {existente,nuevo}=acumModal;
    setData(prev=>{
      const updated={...prev,gastos:{...prev.gastos,[mesKey]:prev.gastos[mesKey].map(g=>g.id===existente.id?{...g,monto:g.monto+nuevo.monto}:g)}};
      syncSheets("gastos", mesKey, updated.gastos[mesKey]);
      return updated;
    });
    setAcumModal(null);
    setForm(p=>({...p,servicio:"",monto:"",observacion:"",dia:String(now.getDate()),esRecurrente:false,vencimiento:"",subconceptos:[],requiereRevision:false,motivoRevision:null,origenMovimiento:null}));
    toast_(`+${fmtARS(nuevo.monto)} sumado a ${existente.servicio}`);
  };
  const handleNuevaNota=()=>{ _guardarNuevo(acumModal.nuevo); setAcumModal(null); };

  const handleEditSave = async (gastoEditado) => {
  const key = editingMesKey || mesKey,owner=authUser.usuarioId;
  const maxDay=new Date(Number(key.slice(0,4)),Number(key.slice(5,7)),0).getDate();
  if(!String(gastoEditado.servicio||'').trim())throw new Error("Escribí el concepto del gasto");
  if(!Number.isInteger(Number(gastoEditado.dia))||Number(gastoEditado.dia)<1||Number(gastoEditado.dia)>maxDay)throw new Error(`Ingresá un día entre 1 y ${maxDay}`);
  if(!gastoEditado.medioPagoId || gastoEditado.medioPagoId==='mp_sin_definir')throw new Error("Elegí una cuenta o medio de pago");
  if(!gastoEditado.instrumentoId || gastoEditado.instrumentoId.includes('sin_definir'))throw new Error("Elegí una forma de pago");

  const estadoNuevo = String(gastoEditado?.estado || "").toLowerCase();
  const sinVencimiento = !String(gastoEditado?.vencimiento || "").trim();
  const marcadoParaRevisar = !!gastoEditado?.requiereRevision;

  // QA-14.1: un pendiente marcado para revisar puede no tener vencimiento confirmado.
  // La fecha sigue siendo obligatoria para pendientes confirmados.
  if (estadoNuevo === "pendiente" && sinVencimiento && !marcadoParaRevisar) {
    toast_("Agregá una fecha de vencimiento para guardar este gasto como pendiente, o marcá Revisar después.", "err");
    return;
  }

  try {
    let gastoParaGuardar = { ...gastoEditado };

    if (
      gastoParaGuardar.guardarComoConceptoFrecuente &&
      !gastoParaGuardar.conceptoId &&
      String(gastoParaGuardar.servicio || "").trim()
    ) {
      const nombreConcepto = String(gastoParaGuardar.servicio || "").trim();

      const conceptoCreado = await crearConcepto({
        nombre: nombreConcepto,
        tipoMovimiento: "GASTO",
        categoriaGastoId: gastoParaGuardar.categoriaGastoId || "cg_otros",
        medioPagoId: gastoParaGuardar.medioPagoId || "mp_sin_definir",
        instrumentoId: gastoParaGuardar.instrumentoId || "ins_manual",
        monedaDefault: gastoParaGuardar.moneda || "ARS",
        etiquetasIds: gastoParaGuardar.etiquetasIds || [],
      });

      const catalogosApi = await getCatalogos();
      const cfgActualizada = mapCatalogosDesdeApi(catalogosApi, tc);
      setCfg(cfgActualizada);

      const conceptoCreadoId =
        conceptoCreado?.concepto_id || conceptoCreado?.conceptoId || conceptoCreado?.id;

      const conceptoActualizado =
        (cfgActualizada.conceptos || []).find((c) => c.id === conceptoCreadoId) ||
        (cfgActualizada.conceptos || []).find(
          (c) => String(c.nombre || "").trim().toLowerCase() === nombreConcepto.toLowerCase()
        ) ||
        (conceptoCreadoId
          ? {
              id: conceptoCreadoId,
              conceptoId: conceptoCreadoId,
              nombre: conceptoCreado?.nombre || nombreConcepto,
              medioPagoId: conceptoCreado?.medio_pago_id || gastoParaGuardar.medioPagoId || "mp_sin_definir",
              instrumentoId: conceptoCreado?.instrumento_id || gastoParaGuardar.instrumentoId || "ins_manual",
              categoriaGastoId: conceptoCreado?.categoria_gasto_id || gastoParaGuardar.categoriaGastoId || "cg_otros",
              etiquetasIds: gastoParaGuardar.etiquetasIds || [],
              monedaDefault: conceptoCreado?.moneda_default || gastoParaGuardar.moneda || "ARS",
            }
          : null);

      if (conceptoActualizado) {
        gastoParaGuardar = {
          ...gastoParaGuardar,
          conceptoId: conceptoActualizado.id || conceptoActualizado.conceptoId,
          servicio: conceptoActualizado.nombre || nombreConcepto,
          medioPagoId: conceptoActualizado.medioPagoId || gastoParaGuardar.medioPagoId || "mp_sin_definir",
          instrumentoId: conceptoActualizado.instrumentoId || gastoParaGuardar.instrumentoId || "ins_manual",
          categoriaGastoId: conceptoActualizado.categoriaGastoId || gastoParaGuardar.categoriaGastoId || "cg_otros",
          etiquetasIds: conceptoActualizado.etiquetasIds?.length
            ? conceptoActualizado.etiquetasIds
            : gastoParaGuardar.etiquetasIds || [],
          moneda: conceptoActualizado.monedaDefault || gastoParaGuardar.moneda || "ARS",
        };
      }
    }

    await actualizarGasto({
      id: gastoParaGuardar.id,
      periodo: key,
      dia: gastoParaGuardar.dia,
      categoria: gastoParaGuardar.categoria,
      formaPago: gastoParaGuardar.formaPago,
      conceptoId: Object.prototype.hasOwnProperty.call(gastoParaGuardar, "conceptoId")
        ? gastoParaGuardar.conceptoId
        : (gastoParaGuardar.concepto_id || ""),
      medioPagoId: gastoParaGuardar.medioPagoId || medioPagoDesdeCategoriaLegacy(gastoParaGuardar.categoria),
      instrumentoId: gastoParaGuardar.instrumentoId || instrumentoDesdeFormaPagoLegacy(gastoParaGuardar.formaPago),
      categoriaGastoId: gastoParaGuardar.categoriaGastoId || categoriaGastoDesdeServicio(gastoParaGuardar.servicio),
      etiquetasIds: gastoParaGuardar.etiquetasIds || gastoParaGuardar.etiquetas?.map(e => e.id || e.etiquetaId) || etiquetasDesdeServicio(gastoParaGuardar.servicio),
      servicio: gastoParaGuardar.servicio,
      monto: Number(gastoParaGuardar.monto || 0),
      moneda: gastoParaGuardar.moneda || "ARS",
      estado: gastoParaGuardar.estado || "pendiente",
      observacion: gastoParaGuardar.observacion || "",
      vencimiento: gastoParaGuardar.vencimiento || null,
      esRecurrente: !!gastoParaGuardar.esRecurrente,
      requiereRevision: !!gastoParaGuardar.requiereRevision,
      motivoRevision: gastoParaGuardar.requiereRevision ? (gastoParaGuardar.motivoRevision || null) : null,
      origenMovimiento: gastoParaGuardar.origenMovimiento || null,
      subconceptos: gastoParaGuardar.subconceptos || [],
    });

    if(sessionRef.current!==owner)return;
    const synced=await refrescarMes(key,owner);

    setEditingGasto(null);
    setEditingMesKey(null);
    if(synced)toast_(gastoEditado.guardarComoConceptoFrecuente ? "Concepto guardado y gasto actualizado" : "Cambios guardados");
  } catch (e) {
    console.error("ERROR EN handleEditSave", e);
    throw e;
  }
};

const handleSubconceptosSave = (items) => {
  if (!subconceptosGasto) return;

  const monedaBase = subconceptosGasto.moneda || editingGasto?.moneda || form.moneda || "ARS";
  const tcAplicable = Number(subconceptosGasto.tcConversion || tc || 1);

  const itemsNormalizados = (items || [])
    .map((it, idx) => {
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
        nombre: String(it.nombre || it.nombreItem || "Item").trim() || "Item",
        monto,
        moneda: monedaItem,
        tipoCambio,
        montoARSCalculado,
        orden: it.orden || idx + 1,
        observacion: it.observacion || "",
      };
    })
    .filter((it) => it.nombre && Number(it.monto) > 0);

  if (itemsNormalizados.length === 0) {
    toast_("Agregá al menos un ítem válido al desglose", "err");
    return;
  }

  const montoTotalARS = itemsNormalizados.reduce(
    (acc, item) => acc + Number(item.montoARSCalculado || 0),
    0
  );

  if (editingGasto && editingGasto.id === subconceptosGasto.id) {
    setEditingGasto((prev) => ({
      ...prev,
      ...subconceptosGasto,
      moneda: prev.moneda || monedaBase,
      monto: montoTotalARS,
      tipoGasto: "detalle",
      subconceptos: itemsNormalizados,
    }));
  } else {
    setForm((prev) => ({
      ...prev,
      moneda: prev.moneda || monedaBase,
      monto: String(montoTotalARS),
      tipoGasto: "detalle",
      subconceptos: itemsNormalizados,
      accionCompuesto: prev.accionCompuesto || "nuevo",
      decisionManual: true,
    }));
  }

  setSubconceptosGasto(null);
  toast_("Desglose guardado. Ahora podés guardar el gasto.");
};

  const openEdit=(g,key=null)=>{ setEditingGasto({...g}); setEditingMesKey(key); };
 const toggleEstado = async (id) => {
  if(estadoRef.current)return;
  estadoRef.current=true;setEstadoBusy(true);
  const periodo=mesKey,owner=authUser.usuarioId;
  try{
    const gasto=(data.gastos[periodo]||[]).find(g=>g.id===id);
    if(!gasto)throw new Error("No se encontró el gasto");
    const estado=gasto.estado==="pagado"?"pendiente":"pagado";
    await actualizarEstadoGasto({movimientoId:id,estado});
    if(sessionRef.current!==owner)return;
    setData(prev=>({...prev,gastos:{...prev.gastos,[periodo]:(prev.gastos[periodo]||[]).map(g=>g.id===id?{...g,estado,...(estado==='pagado'?{requiereRevision:false,motivoRevision:null}:{})}:g)}}));
    if(await refrescarMes(periodo,owner))toast_(estado==="pagado"?"Marcado como pagado":"Marcado como pendiente");
  }catch(e){if(sessionRef.current===owner)toast_(e.message||"No se pudo actualizar el estado","err");}
  finally{estadoRef.current=false;setEstadoBusy(false);}
};
 const resetPrivateState = () => {
  sessionRef.current = null;
  resolverDuplicado("cancel");
  ++savingsFetchRef.current;setSavingsRecords([]);setSavingsSeed(null);setSavingsError("");setSavingsStatus("loading");
  setDueSelection({filter:"all",scope:"all"});
  setData({gastos:{},ingresos:{},sueldo:{}}); setCfg(DEFAULT_CONFIG); setRecurrentes([]);
  setForm({servicio:"",monto:"",moneda:"ARS",estado:"pagado",dia:String(new Date().getDate()),subconceptos:[],etiquetasIds:[]});
  setIngForm({fuente:"",monto:"",dia:String(new Date().getDate())}); setSueldoInput("");
  setEditingGasto(null); setEditingMesKey(null); setConfirmDel(null); setSubconceptosGasto(null); setAcumModal(null); setReplicarStep(null);
  setEditConcepto(null); setEditMedio(null); setNuevoMedio({nombre:"",tipo:"banco",color:"#60a5fa",ordenVisual:""});
  setBusquedaConceptoCfg(""); setBusquedaMedioCfg(""); setFiltroEstado("todos"); setBusqueda(""); setFiltroCatInicio(null); setDesglosesAbiertos({});
  setCfgTab("conceptos"); setTcInput(""); setNewFuente(""); setEditFuente(null); setView("home"); setMes(getMesActual()); setCargaEstado("cargando");
};
const refrescarMes = async (periodo, owner = authUser?.usuarioId) => {
  try {
    const nuevo = mapMovimientosDesdeApi(await getMovimientos(periodo), periodo);
    if (sessionRef.current !== owner) return false;
    setData(prev => ({...prev, gastos:{...prev.gastos,[periodo]:nuevo.gastos[periodo]||[]}, ingresos:{...prev.ingresos,[periodo]:nuevo.ingresos[periodo]||[]}, sueldo:{...prev.sueldo,[periodo]:nuevo.sueldo[periodo]||0}}));
    return true;
  } catch (error) {
    if (sessionRef.current === owner) toast_("El cambio se guardó. No pudimos actualizar la lista; volvé a cargarla.","warn");
    return false;
  }
};
const solicitarBorrado = item => {setDeleteError(""); setConfirmDel({...item,periodo:item.periodo || mesKey});};
const guardarIngreso = async () => {
  if (guardarIngresoRef.current) return;
  const maxDay = new Date(mes.y,mes.m+1,0).getDate();
  if (!ingForm.fuente.trim()) return toast_("Escribí la fuente del ingreso", "err");
  if (!Number.isFinite(Number(ingForm.monto)) || Number(ingForm.monto)<=0) return toast_("Ingresá un importe válido", "err");
  if (!Number.isInteger(Number(ingForm.dia)) || Number(ingForm.dia)<1 || Number(ingForm.dia)>maxDay) return toast_("Ingresá un día válido para este mes", "err");
  guardarIngresoRef.current=true; setGuardarIngresoLoading(true);
  const periodo=mesKey, owner=authUser.usuarioId, draft={...ingForm};
  try {
    const saved = await (draft.id ? actualizarIngreso : crearIngreso)({movimientoId:draft.id,periodo,dia:Number(draft.dia),fuente:draft.fuente.trim(),monto:Number(draft.monto)});
    if (sessionRef.current !== owner) return;
    setData(prev => ({...prev,ingresos:{...prev.ingresos,[periodo]:draft.id?(prev.ingresos[periodo]||[]).map(i=>i.id===draft.id?{...i,...draft,monto:Number(draft.monto)}:i):[...(prev.ingresos[periodo]||[]),{...draft,id:saved.movimiento_id,monto:Number(draft.monto)}]}}));
    setIngForm({fuente:"",monto:"",dia:String(Math.min(new Date().getDate(),maxDay))});
    if (await refrescarMes(periodo,owner)) toast_(draft.id?"Ingreso actualizado":"Ingreso guardado");
  } catch (e) {if(sessionRef.current===owner) toast_(e.message || "No se pudo guardar el ingreso", "err");}
  finally {guardarIngresoRef.current=false;setGuardarIngresoLoading(false);}
};
const guardarSueldo = async () => {
  if (sueldoRef.current) return;
  const monto=Number(sueldoInput),periodo=mesKey,owner=authUser.usuarioId;
  if (!Number.isFinite(monto)||monto<=0) return toast_("Ingresá un sueldo válido", "err");
  sueldoRef.current=true;setSueldoBusy(true);
  try {
    await guardarSueldoNeon({periodo,monto});
    if(sessionRef.current!==owner)return;
    setData(prev=>({...prev,sueldo:{...prev.sueldo,[periodo]:monto}}));setSueldoInput("");
    if(await refrescarMes(periodo,owner))toast_("Sueldo guardado");
  } catch(e){if(sessionRef.current===owner)toast_(e.message || "No se pudo guardar el sueldo","err");}
  finally{sueldoRef.current=false;setSueldoBusy(false);}
};
const eliminar = async () => {
  if(eliminarRef.current || !confirmDel)return;
  eliminarRef.current=true;setEliminando(true);setDeleteError("");
  const {tipo,id,periodo}=confirmDel,owner=authUser.usuarioId;
  try{
    if(tipo==="gastos")await eliminarGasto(id);
    else if(tipo==="ingresos")await eliminarIngreso(id);
    else if(tipo==="sueldo")await eliminarSueldo(periodo);
    else throw new Error("No se reconoce este movimiento");
    if(sessionRef.current!==owner)return;
    setData(prev=>({...prev,[tipo]:{...prev[tipo],[periodo]:tipo==="sueldo"?0:(prev[tipo][periodo]||[]).filter(item=>item.id!==id)}}));
    setConfirmDel(null); if(editingGasto?.id===id){setEditingGasto(null);setEditingMesKey(null);}
    if(ingForm.id===id)setIngForm({fuente:"",monto:"",dia:"1"});
    if(await refrescarMes(periodo,owner))toast_(tipo==="gastos"?"Gasto eliminado":tipo==="sueldo"?"Sueldo eliminado":"Ingreso eliminado");
  }catch(e){if(sessionRef.current===owner)setDeleteError(e.message || "No se pudo eliminar. Intentá nuevamente.");}
  finally{eliminarRef.current=false;setEliminando(false);}
};
  //const eliminar=(tipo,id)=>{ setData(prev=>({...prev,[tipo]:{...prev[tipo],[mesKey]:(prev[tipo][mesKey]||[]).filter(g=>g.id!==id)}})); setConfirmDel(null); toast_("Eliminado","err"); };
  const cambiarMes=(dir)=>setMes(prev=>{ let m=prev.m+dir,y=prev.y; if(m>11){m=0;y++;} if(m<0){m=11;y--;} return{y,m}; });
  const exportCSV=()=>{
    const rows=[["Dia","Medio de pago","Concepto","Importe registrado","Moneda","Total ARS","Débito automático","Estado","Vencimiento","Por revisar","Nota"]];
    gastosDelMes.forEach(g=>rows.push([g.dia,g.medioPagoNombre||g.medioPago||"",g.servicio,Number(g.monto),g.moneda,montoReal(g,tc),isAutomaticDebit(g)?"Sí":"No",g.estado,g.vencimiento||"",g.requiereRevision?"Sí":"No",g.observacion||""]));
    const cell=value=>{const text=String(value??"");const safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(text)?"'"+text:text;return '"'+safe.replace(/"/g,'""')+'"';};
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`gastos_${mesKey}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast_("CSV exportado");
  };

  const addForma=()=>{if(!newForma.trim()||cfg.formasPago.includes(newForma.trim())){toast_("Verificá","err");return;}setCfg(p=>({...p,formasPago:[...p.formasPago,newForma.trim()]}));setNewForma("");toast_("Agregado");};
  const saveForma=()=>{if(!editForma?.val.trim())return;setCfg(p=>{const fp=[...p.formasPago];fp[editForma.idx]=editForma.val.trim();return{...p,formasPago:fp};});setEditForma(null);toast_("Actualizado");};
  const delForma=(idx)=>{setCfg(p=>({...p,formasPago:p.formasPago.filter((_,i)=>i!==idx)}));toast_("Eliminado","err");};
  const addServ=()=>{if(!selCatServ||!newServ.trim()){toast_("Completá campos","err");return;}setCfg(p=>{const s={...p.servicios};s[selCatServ]=[...(s[selCatServ]||[]),newServ.trim()];return{...p,servicios:s};});setNewServ("");toast_("Agregado");};
  const delServ=(catId,idx)=>{setCfg(p=>{const s={...p.servicios};s[catId]=(s[catId]||[]).filter((_,i)=>i!==idx);return{...p,servicios:s};});toast_("Eliminado","err");};
  const addFuente=()=>{if(!newFuente.trim()||cfg.fuentesIngreso.includes(newFuente.trim())){toast_("Verificá","err");return;}setCfg(p=>({...p,fuentesIngreso:[...p.fuentesIngreso,newFuente.trim()]}));setNewFuente("");toast_("Agregado");};
  const saveFuente=()=>{if(!editFuente?.val.trim())return;setCfg(p=>{const f=[...p.fuentesIngreso];f[editFuente.idx]=editFuente.val.trim();return{...p,fuentesIngreso:f};});setEditFuente(null);toast_("Actualizado");};
  const delFuente=(idx)=>{setCfg(p=>({...p,fuentesIngreso:p.fuentesIngreso.filter((_,i)=>i!==idx)}));toast_("Eliminado","err");};
  const guardarTC=()=>{if(!Number.isFinite(Number(tcInput))||Number(tcInput)<=0){toast_("Ingresá una cotización mayor a cero","err");return;}setCfg(p=>({...p,tipoCambio:Number(tcInput)}));setTcInput("");toast_("TC actualizado");};

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
      toast_("Concepto actualizado");
    } catch (e) {
      console.error(e);
      toast_(e.message || "No se pudo actualizar el concepto", "err");
    }
  };

  const desactivarConceptoCfg = async (concepto) => {
    if (!concepto?.id) return;
    const ok = await pedirConfirmacion({
      title: "Desactivar concepto",
      message: `¿Querés desactivar "${concepto.nombre}"?`,
      note: "No se borran gastos históricos. Solo dejará de aparecer como opción activa.",
      icon: "⚠️",
      variant: "warn",
      confirmLabel: "Desactivar",
      cancelLabel: "Cancelar",
    });
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
      toast_("Medio de pago creado");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear el medio de pago", "err"); }
  };

  const guardarMedioEditado = async () => {
    if (!editMedio?.id) return;
    if (!String(editMedio.nombre || "").trim()) { toast_("Ingresá un nombre para el medio de pago", "err"); return; }
    try {
      await actualizarMedioPago({ medioPagoId: editMedio.id, nombre: editMedio.nombre.trim(), tipo: editMedio.tipo || "otro", color: editMedio.color || "#64748b", ordenVisual: Number(editMedio.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditMedio(null);
      toast_("Medio de pago actualizado");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar el medio de pago", "err"); }
  };

  const desactivarMedioPagoCfg = async (medio) => {
    if (!medio?.id) return;
    const ok = await pedirConfirmacion({
      title: "Desactivar medio de pago",
      message: `¿Querés desactivar "${medio.nombre}"?`,
      note: "No se borran gastos históricos. Solo dejará de aparecer como opción activa.",
      icon: "⚠️",
      variant: "warn",
      confirmLabel: "Desactivar",
      cancelLabel: "Cancelar",
    });
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
      toast_("Categoría creada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear la categoría", "err"); }
  };

  const guardarCategoriaGastoEditada = async () => {
    if (!editCategoriaGasto?.id) return;
    if (!String(editCategoriaGasto.nombre || "").trim()) { toast_("Ingresá un nombre para la categoría", "err"); return; }
    try {
      await actualizarCategoriaGasto({ categoriaGastoId: editCategoriaGasto.id, nombre: editCategoriaGasto.nombre.trim(), color: editCategoriaGasto.color || "#64748b", ordenVisual: Number(editCategoriaGasto.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditCategoriaGasto(null);
      toast_("Categoría actualizada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar la categoría", "err"); }
  };

  const desactivarCategoriaGastoCfg = async (categoria) => {
    if (!categoria?.id) return;
    const ok = await pedirConfirmacion({
      title: "Desactivar categoría",
      message: `¿Querés desactivar "${categoria.nombre}"?`,
      note: "No se borran gastos históricos. Solo dejará de aparecer como opción activa.",
      icon: "⚠️",
      variant: "warn",
      confirmLabel: "Desactivar",
      cancelLabel: "Cancelar",
    });
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
      toast_("Etiqueta creada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo crear la etiqueta", "err"); }
  };

  const guardarEtiquetaEditada = async () => {
    if (!editEtiqueta?.id) return;
    if (!String(editEtiqueta.nombre || "").trim()) { toast_("Ingresá un nombre para la etiqueta", "err"); return; }
    try {
      await actualizarEtiqueta({ etiquetaId: editEtiqueta.id, nombre: editEtiqueta.nombre.trim(), color: editEtiqueta.color || "#64748b", ordenVisual: Number(editEtiqueta.ordenVisual || 99), activo: true });
      await refrescarCatalogos();
      setEditEtiqueta(null);
      toast_("Etiqueta actualizada");
    } catch (e) { console.error(e); toast_(e.message || "No se pudo actualizar la etiqueta", "err"); }
  };

  const desactivarEtiquetaCfg = async (etiqueta) => {
    if (!etiqueta?.id) return;
    const ok = await pedirConfirmacion({
      title: "Desactivar etiqueta",
      message: `¿Querés desactivar "${etiqueta.nombre}"?`,
      note: "No se borran gastos históricos. Solo dejará de aparecer como opción activa.",
      icon: "⚠️",
      variant: "warn",
      confirmLabel: "Desactivar",
      cancelLabel: "Cancelar",
    });
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
  const gastosFuenteReplicar=missingReplicas(gastosDelMes,data.gastos[mesKeySiguiente()]||[]);
  const abrirReplica = () => {
    const recurrent = gastosFuenteReplicar.filter(g=>g.esRecurrente || isAutomaticDebit(g,cfg));
    setExcluirReplicar(new Set(recurrent.length?gastosFuenteReplicar.filter(g=>!recurrent.includes(g)).map(g=>g.id):[]));
    setReplicaCopiados(0);
    setReplicarStep(!gastosFuenteReplicar.length?"informacion":"modal");
  };
  const gastosIncluidos= gastosFuenteReplicar.filter(g=>!excluirReplicar.has(g.id));
  const toggleExcluir=(id)=>setExcluirReplicar(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const confirmarReplica = async () => {
  if (replicandoRef.current) return;
  const nextKey = mesKeySiguiente();

  if (!gastosIncluidos.length) {
    toast_("No hay gastos seleccionados para replicar", "err");
    return;
  }

  replicandoRef.current = true;
  setReplicando(true);
  let copiados = 0;
  try {
    const destino = mapMovimientosDesdeApi(await getMovimientos(nextKey), nextKey);
    const availableIds=new Set(missingReplicas(gastosDelMes,destino.gastos[nextKey]||[]).map(g=>g.id));
    const toCopy=gastosIncluidos.filter(g=>availableIds.has(g.id));
    if(!toCopy.length){await refrescarMes(nextKey);setReplicarStep("informacion");return;}
    for (const g of toCopy) {
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
        conceptoId: g.conceptoId || null,
        monto: tieneDetalle ? 0 : Number(g.monto || 0),
        moneda: g.moneda || "ARS",
        estado: "pendiente",
        observacion: g.observacion || "",
        vencimiento: vencimientoReplica || null,
        esRecurrente: !!g.esRecurrente,
        requiereRevision: true,
        motivoRevision: "REVISAR_MONTO_VENCIMIENTO",
        origenMovimiento: "REPLICA_MES",
        subconceptos: subconceptosReplica,
      });
      copiados += 1;
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

    setReplicaCopiados(copiados);
    setReplicarStep("done");
    toast_(`${copiados} gastos copiados a ${mesNombreSig()}`);
  } catch (e) {
    console.error("Error replicando mes:", e);
    if(copiados)await refrescarMes(nextKey);
    setReplicarStep(null);
    toast_(`${copiados ? `Se copiaron ${copiados} gastos. ` : ""}No se completó la copia. Revisá el mes destino antes de reintentar.`, "err");
  } finally {
    replicandoRef.current = false;
    setReplicando(false);
  }
};

// ======================================================
// 💾 BACKUP / RESTORE LOCAL (LEGACY / opcional)
// ======================================================

  // ── Backup / Restore de datos ──────────────────────────────────────────────
  const exportarBackup = async () => {
    if (exportandoBackupRef.current) return;
    exportandoBackupRef.current = true;
    setExportandoBackup(true);
    try {
      const owner=authUser.usuarioId;
      const [movimientos, catalogos, ahorros] = await Promise.all([getMovimientos(null), getCatalogos(), getSavings()]);
      if(sessionRef.current!==owner)return;
      const historial = mapHistorialDesdeApi(movimientos);
      const backup = { data: {...historial, ahorros}, config: mapCatalogosDesdeApi(catalogos), version: "v3",
        alcance: "Movimientos del usuario actual; no incluye toda la base de datos",
        usuarioId: authUser.usuarioId, workspaceId: authUser.workspaceId,
        fecha: new Date().toISOString() };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:"application/json"}));
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-finanzas-movimientos-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      toast_("Se descargaron todos tus movimientos.");
    } catch (error) {
      toast_(error.message || "No se pudo completar la exportación.", "err");
    } finally {
      exportandoBackupRef.current = false;
      setExportandoBackup(false);
    }
  };

// ======================================================
// 🧱 HELPERS DE UI (estilos inline y render interno)
// ======================================================

  const lbl={fontSize:11,color:"#64748b",fontWeight:700,letterSpacing:1,marginBottom:8,display:"block"};
  const rowS={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #1e1e2e"};
  const ib=(bg,color)=>({background:bg,border:"none",color,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13,fontWeight:600});

  // Render gasto en detalle
  // Render gasto en detalle
  const esDolar_form = esDolarConcepto(form.servicio);

  const esConceptoSoloHistorico = (concepto = {}) => {
    const id = String(concepto.id || concepto.conceptoId || "").trim().toLowerCase();
    const nombre = normalizarTexto(concepto.nombre || "");

    return (
      id === "con_gastos_sin_clasificar_gustavo" ||
      nombre === "gastos sin clasificar"
    );
  };

  const textoConcepto = String(form.servicio || "").trim();
  const textoConceptoNormalizado = normalizarTexto(textoConcepto);
  const conceptosDisponibles = cfg.conceptos || [];
  const conceptosDisponiblesCarga = conceptosDisponibles.filter(
    (concepto) => !esConceptoSoloHistorico(concepto)
  );
  const conceptosFiltrados = conceptosDisponiblesCarga.filter((concepto) => {
    if (!textoConceptoNormalizado) return true;
    return normalizarTexto(concepto.nombre).includes(textoConceptoNormalizado);
  });
  const conceptoExactoOcultoCarga = conceptosDisponibles.find(
    (concepto) =>
      esConceptoSoloHistorico(concepto) &&
      normalizarTexto(concepto.nombre) === textoConceptoNormalizado
  );
  const conceptoExacto = conceptosDisponiblesCarga.find(
    (concepto) => normalizarTexto(concepto.nombre) === textoConceptoNormalizado
  );
  const conceptosVisibles = mostrarTodosConceptos
    ? conceptosFiltrados
    : conceptosFiltrados.slice(0, textoConceptoNormalizado ? 8 : 10);

  const ultimoDiaCarga = new Date(mes.y, mes.m + 1, 0).getDate();
 const aplicarConceptoExistente = (concepto) => {
  if (!concepto) return;

  setMostrarTodosConceptos(false);
  setForm((f) => ({
    ...f,
    conceptoId: concepto.id,
    servicio: concepto.nombre,
    ...(isAutomaticDebit({instrumentoId:concepto.instrumentoId},cfg)?{estado:"pendiente"}:{}),
    medioPagoId: concepto.medioPagoId || f.medioPagoId || "mp_sin_definir",
    instrumentoId: concepto.instrumentoId || f.instrumentoId || "",
    categoriaGastoId: concepto.categoriaGastoId || f.categoriaGastoId || "",
    etiquetasIds: concepto.etiquetasIds?.length ? concepto.etiquetasIds : (f.etiquetasIds || []),
    moneda: concepto.monedaDefault || f.moneda || "ARS",
    categoria: categoriaLegacyDesdeMedioPagoId(concepto.medioPagoId || f.medioPagoId),
    formaPago: formaPagoLegacyDesdeInstrumentoId(concepto.instrumentoId || f.instrumentoId),
    decisionManual:false,
    crearConceptoPendiente:false
  }));
};

 const crearConceptoDesdeTexto = () => {
  const nombre = String(form.servicio || "").trim();

  if (!nombre) {
    toast_("Escribí el nombre del concepto", "err");
    return;
  }

  if (conceptoExacto) {
    aplicarConceptoExistente(conceptoExacto);
    toast_(`Ya existe “${conceptoExacto.nombre}”. Usé ese concepto para evitar duplicados.`);
    return;
  }

  if (conceptoExactoOcultoCarga) {
    toast_("Gastos sin clasificar se usa solo para gastos históricos. Escribí un concepto más específico.", "warn");
    return;
  }

  setForm((f) => ({
    ...f,
    servicio: nombre,
    conceptoId: "",
    crearConceptoPendiente: true,
    decisionManual: false,
  }));

  toast_("Vamos a recordar este concepto cuando guardes el gasto.");
};


const handleLogin = async (e) => {
  e.preventDefault();
  if(loginLoading)return;
  setLoginError("");
  setLoginLoading(true);

  try {
    const user = await login(loginForm.usuarioId, loginForm.pin);
    resetPrivateState();
    setAuthUser(user);
    setLoginForm((prev) => ({ ...prev, pin: "" }));
    toast_(`Bienvenido, ${user.nombre}`);
  } catch (error) {
    setLoginError(error.message || "No se pudo iniciar sesión");
  } finally {
    setLoginLoading(false);
  }
};

const handleLogout = async () => {
  const confirmar = await pedirConfirmacion({
    title: "Cerrar sesión",
    message: "¿Querés cerrar sesión?",
    note: "Vas a volver a la pantalla de ingreso. Tus datos quedan guardados.",
    icon: "ℹ️",
    variant: "info",
    confirmLabel: "Cerrar sesión",
    cancelLabel: "Cancelar",
  });
  if (!confirmar) return;

  logout();
  resetPrivateState();
  setAuthUser(null);
};

if (authUser && cargaEstado !== "listo") {
  return <main style={{fontFamily:"sans-serif",background:"#0a0a0f",color:"#e2e8f0",minHeight:"100vh",padding:"48px 24px",textAlign:"center"}}>
    <h1 style={{fontSize:22,marginBottom:16}}>Mis Finanzas</h1>
    <p role={cargaEstado === "error" ? "alert" : "status"}>{cargaEstado === "error" ? cargaError : "Cargando tus movimientos…"}</p>
    {cargaEstado === "error" && <button style={{margin:16,padding:12}} onClick={()=>setRecarga(n=>n+1)}>Reintentar</button>}
    <button style={{margin:16,padding:12}} onClick={()=>{logout();resetPrivateState();setAuthUser(null);}}>Salir</button>
  </main>;
}

if (!authUser) {
  return <main className="premium-login">
    <div className="brand"><span className="brand-mark"><UiIcon name="chart" size={21}/></span>Mis Finanzas</div>
    <div className="login-main">
      <span className="eyebrow muted">TU ESPACIO PERSONAL</span>
      <h1>Tu plata.<br/>Todo más claro.</h1>
      <p>Gastos, ingresos y próximos pagos.<br/>Una mirada simple a tus finanzas.</p>
      <form onSubmit={handleLogin}>
        <label htmlFor="login-user">Usuario</label>
        <input id="login-user" autoComplete="username" autoCapitalize="none" spellCheck="false" required placeholder="Tu usuario" value={loginForm.usuarioId} disabled={loginLoading} onChange={e=>setLoginForm(p=>({...p,usuarioId:e.target.value}))}/>
        <label htmlFor="login-pin">Clave personal</label>
        <input id="login-pin" type="password" required disabled={loginLoading} autoComplete="current-password" placeholder="Ingresá tu clave" value={loginForm.pin} onChange={e=>setLoginForm(p=>({...p,pin:e.target.value}))}/>
        {loginError&&<div role="alert" className="error-note">{loginError}</div>}
        <button className="primary" disabled={loginLoading}>{loginLoading?"Validando…":"Ingresar"}<UiIcon name="arrow" size={19}/></button>
      </form>
      <p className="login-help">¿Necesitás acceso o cambiar tu clave? Contactá a quien administra la app.</p>
    </div>
    <div className="login-footer"><UiIcon name="lock" size={15}/>Un espacio privado para tus movimientos</div>
  </main>;
}


// ======================================================
// 🎨 RENDER PRINCIPAL
// ======================================================
  return (
    <div className="app-shell" data-view={view} style={{ fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",color:"#e2e8f0",margin:"0 auto" }}>
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
        .toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:999;display:flex;align-items:flex-start;gap:10px;width:calc(100% - 28px);max-width:440px;padding:12px 14px;border-radius:18px;font-size:14px;animation:fio 2.8s ease;box-shadow:0 18px 45px rgba(0,0,0,.38);backdrop-filter:blur(14px);border:1px solid;}
        .toast-icon{width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);font-size:15px;flex-shrink:0;}
        .toast-title{font-weight:800;font-size:13px;margin-bottom:2px;letter-spacing:.01em;}
        .toast-msg{font-weight:600;font-size:13px;line-height:1.35;overflow-wrap:anywhere;}
        .toast-ok{background:rgba(20,83,45,.94);border-color:#22c55e;color:#dcfce7;}
        .toast-err{background:rgba(127,29,29,.94);border-color:#ef4444;color:#fee2e2;}
        .toast-warn{background:rgba(113,63,18,.94);border-color:#f59e0b;color:#fef3c7;}
        .toast-info{background:rgba(30,58,95,.94);border-color:#38bdf8;color:#e0f2fe;}
        @keyframes fio{0%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(.98)}12%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}86%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-8px) scale(.98)}}
        .pgb{height:6px;border-radius:3px;background:#1e1e2e;overflow:hidden;margin-top:8px;}
        .pgf{height:100%;border-radius:3px;transition:width 0.5s;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;z-index:900;}
        .ob{background:#13131a;border-radius:20px 20px 0 0;padding:28px 24px;width:100%;max-width:480px;border:1px solid #2a2a3e;}
        .tb{border:none;border-radius:10px;padding:7px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:12px;transition:all 0.15s;}
        .cd{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.15s;flex-shrink:0;}
        .ei{background:#1a1a24;border:1.5px solid #7c3aed;border-radius:10px;padding:7px 10px;color:#e2e8f0;font-size:14px;outline:none;flex:1;font-family:'DM Sans',sans-serif;}
        .stat-box{flex:1;background:#13131a;border-radius:16px;padding:12px 14px;border:1px solid #1e1e2e;}
      `}</style>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><UiIcon name="chart" size={21}/></span>Mis Finanzas</div>
        <div className="topbar-actions"><span className="avatar" title={authUser.nombre}>{authUser.nombre.slice(0,1)}</span><button className="icon-button" aria-label="Ajustes" onClick={()=>setView("config")}><UiIcon name="settings" size={22}/></button></div>
      </header>

      {toast&&toastVisual&&(
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          <span className="toast-icon">{toastVisual.icon}</span>
          <div style={{ minWidth:0 }}>
            <div className="toast-title">{toastVisual.title}</div>
            <div className="toast-msg">{toast.msg}</div>
          </div>
        </div>
      )}

      {confirmAction&&(() => {
        const variantStyles = {
          warn: { border:"#f59e0b", bg:"rgba(113,63,18,.16)", iconBg:"rgba(245,158,11,.16)", iconColor:"#fbbf24", button:"#f59e0b", buttonText:"#111827" },
          err: { border:"#ef4444", bg:"rgba(127,29,29,.16)", iconBg:"rgba(239,68,68,.16)", iconColor:"#fca5a5", button:"#dc2626", buttonText:"#fff" },
          info: { border:"#38bdf8", bg:"rgba(30,58,95,.16)", iconBg:"rgba(56,189,248,.16)", iconColor:"#7dd3fc", button:"#2563eb", buttonText:"#fff" },
          ok: { border:"#22c55e", bg:"rgba(20,83,45,.16)", iconBg:"rgba(34,197,94,.16)", iconColor:"#86efac", button:"#16a34a", buttonText:"#fff" },
        };
        const s = variantStyles[confirmAction.variant] || variantStyles.warn;
        return (
          <div className="ov" style={{ zIndex:970 }} onClick={()=>resolverConfirmacion(false)}>
            <div className="ob" style={{ padding:22,border:`1px solid ${s.border}` }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex",gap:12,alignItems:"flex-start",marginBottom:14 }}>
                <div style={{ width:38,height:38,borderRadius:14,background:s.iconBg,color:s.iconColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>
                  {confirmAction.icon}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:17,marginBottom:4 }}>{confirmAction.title}</div>
                  <div style={{ color:"#cbd5e1",fontSize:14,lineHeight:1.45 }}>{confirmAction.message}</div>
                </div>
              </div>

              {confirmAction.detail&&
                <div style={{ background:"#0f0f17",border:"1px solid #25253a",borderRadius:14,padding:"12px 13px",color:"#f8fafc",fontSize:14,fontWeight:700,marginBottom:12,lineHeight:1.45 }}>
                  {confirmAction.detail}
                </div>
              }

              {confirmAction.note&&
                <div style={{ background:s.bg,border:`1px solid ${s.border}`,borderRadius:14,padding:"10px 12px",color:"#cbd5e1",fontSize:13,lineHeight:1.45,marginBottom:18 }}>
                  {confirmAction.note}
                </div>
              }

              <div style={{ display:"flex",gap:10 }}>
                <button className="pb" style={{ flex:1,background:"#1e1e2e",color:"#94a3b8" }} onClick={()=>resolverConfirmacion(false)}>
                  {confirmAction.cancelLabel || "Cancelar"}
                </button>
                <button className="pb" style={{ flex:1,background:s.button,color:s.buttonText }} onClick={()=>resolverConfirmacion(true)}>
                  {confirmAction.confirmLabel || "Aceptar"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {duplicateReview && <DuplicateReview item={duplicateReview.item} period={duplicateReview.period} onResolve={resolverDuplicado}/>}

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
          periodo={editingMesKey || mesKey}
          onDelete={() => solicitarBorrado({...editingGasto,tipo:"gastos",periodo:editingMesKey || mesKey})}
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

      {confirmDel && <ConfirmDelete item={confirmDel} amount={confirmDel.tipo==="gastos"?montoReal(confirmDel,tc):Number(confirmDel.monto)} busy={eliminando} error={deleteError} onClose={()=>setConfirmDel(null)} onConfirm={eliminar}/>}

      <div className={`page-header ${view==="home"?"home-header":""}`}>
        <h1>{({home:"Tu mes, en claro.",cargar:"Cargar gasto",resumen:"Movimientos",ingresos:"Ingresos",ahorros:"Ahorros",vencimientos:"Vencimientos",analisis:"Informes",variacion:"Informes",config:"Ajustes"})[view]}</h1>
        <p>{({home:`Hola, ${authUser.nombre}. Este es tu resumen.`,cargar:"Lo esencial, sin vueltas.",resumen:"Cada gasto, a mano.",ingresos:"Todo lo que entra en el mes.",ahorros:"Lo que reservás para vos.",vencimientos:"Tus pagos, a tiempo.",analisis:"Entendé en qué se va tu plata.",variacion:"Una mirada a lo que cambia.",config:"Tu app, a tu manera."})[view]}</p>
        {view!=="config"&&<div className="period-picker"><span>{MESES[mes.m]} {mes.y}</span><div className="period-controls"><button className="icon-button" aria-label="Mes anterior" onClick={()=>cambiarMes(-1)}><UiIcon name="chevron" size={17} style={{transform:"rotate(180deg)"}}/></button><button className="icon-button" aria-label="Mes siguiente" onClick={()=>cambiarMes(1)}><UiIcon name="chevron" size={17}/></button></div></div>}
      </div>
      <div className="app-content">
        {["resumen","ingresos","ahorros"].includes(view)&&<div className="segmented view-tabs"><button aria-pressed={view==="resumen"} onClick={()=>setView("resumen")}>Gastos</button><button aria-pressed={view==="ingresos"} onClick={()=>setView("ingresos")}>Ingresos</button><button aria-pressed={view==="ahorros"} onClick={()=>openSavings()}>Ahorros</button></div>}
        {["analisis","variacion"].includes(view)&&<div className="segmented view-tabs"><button aria-pressed={view==="analisis"} onClick={()=>setView("analisis")}>Distribución</button><button aria-pressed={view==="variacion"} onClick={()=>setView("variacion")}>Evolución</button></div>}

        {/* HOME */}
        {view==="home"&&<PremiumHome key={authUser.usuarioId} userId={authUser.usuarioId} savingsStatus={savingsStatus} savings={savingsSummary(savingsRecords,mesKey,[localDate(today),localDate(new Date(mes.y,mes.m+1,0))].sort()[0])} onSavings={()=>openSavings()} increases={recurringIncreases(gastosDelMes,data.gastos[mesAnteriorKey]||[])} previousLabel={MESES[(mes.m+11)%12].toLowerCase()} gastos={gastosDelMes} ingresos={totalIngresos} totalGastos={totalGastos} saldo={saldo} pendiente={totalPendiente} tc={tc} overview={overview} monthLabel={MESES[mes.m].toLowerCase()} onOpenAttention={openAttention} onNavigate={target=>{setView(target);window.scrollTo({top:0,behavior:"instant"});}} onEdit={openEdit} nextMonth={mesNombreSig()} onReplicate={abrirReplica}/>}

        {/* CARGAR */}
        {view==="cargar"&&<>
          <div className="segmented view-tabs"><button aria-pressed="true">Gasto</button><button aria-pressed="false" onClick={()=>setView("ingresos")}>Ingreso</button><button aria-pressed="false" onClick={()=>openSavings({kind:"aporte"})}>Ahorro</button></div>
          <fieldset className="expense-form-fields" disabled={guardandoGasto}><ExpenseFields value={form} setValue={setForm} config={cfg} tc={tc} maxDay={ultimoDiaCarga} suggestions={conceptosDisponiblesCarga} onSelectConcept={aplicarConceptoExistente} advanced={mostrarOpcionesCarga} setAdvanced={setMostrarOpcionesCarga} onRemember={()=>form.crearConceptoPendiente?setForm(f=>({...f,crearConceptoPendiente:false})):crearConceptoDesdeTexto()} onBreakdown={()=>{abrirSubconceptosConCotizacion({...form,tipoGasto:"detalle",id:"new_"+Date.now(),moneda:form.moneda||"ARS",subconceptos:form.subconceptos||[]});}}/>
          {form.servicio&&gastoCompuestoExistente&&<div className="compound-choice"><p>Ya existe <strong>{gastoCompuestoExistente.servicio}</strong> este mes. ¿Cómo querés guardarlo?</p><div className="segmented"><button aria-pressed={form.accionCompuesto==="nuevo"} onClick={()=>setForm(f=>({...f,accionCompuesto:"nuevo",decisionManual:true}))}>Como nuevo movimiento</button><button aria-pressed={form.accionCompuesto==="existente"} onClick={()=>setForm(f=>({...f,accionCompuesto:"existente",decisionManual:true}))}>Sumar al gasto existente</button></div></div>}
          <button className="primary form-submit" disabled={guardandoGasto} onClick={async()=>{
            if(form.estado==="pendiente"&&!form.vencimiento&&!form.requiereRevision){toast_("Agregá una fecha de vencimiento o marcá Revisar después.","err");return;}
            if(form.tipoGasto==="detalle"&&!form.subconceptos.length){toast_("Agregá los ítems y guardá el desglose.","err");abrirSubconceptosConCotizacion({...form,id:"new_"+Date.now(),moneda:form.moneda||"ARS",subconceptos:[]});return;}
            await guardarGasto();
          }}>{guardandoGasto?"Guardando…":"Guardar gasto"}<UiIcon name="check" size={18}/></button></fieldset>
          <p className="form-note">Se guardará en {MESES[mes.m].toLowerCase()} de {mes.y}.</p>
          <button className="text-button" onClick={()=>setShowCotizador(!showCotizador)}>{showCotizador?"Ocultar cotización":"Consultar cotización del dólar"}</button>
          {showCotizador&&<CotizadorWidget onSelectTC={(valor,tipo)=>{setCfg(p=>({...p,tipoCambio:valor}));toast_(`Cotización ${tipo}: ${fmtARS(valor)}`);setShowCotizador(false);}}/>}
        </>}

        {/* DETALLE / RESUMEN */}
        {view==="resumen"&&<ReplicateAction nextMonth={mesNombreSig()} onClick={abrirReplica}/>}
        {view==="resumen"&&(
          <DetalleViewShell
            mes={mes}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            filtroCatInicio={filtroCatInicio}
            setFiltroCatInicio={setFiltroCatInicio}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            tituloDetalle={tituloDetalle}
            cantidadDetalleFiltrada={cantidadDetalleFiltrada}
            totalDetalleFiltrado={totalDetalleFiltrado}
            totalPendienteDetalle={totalPendienteDetalle}
            cantidadPendienteDetalle={cantidadPendienteDetalle}
            totalRevisarDetalle={totalRevisarDetalle}
            cantidadRevisarDetalle={cantidadRevisarDetalle}
            hayFiltroActivo={hayFiltroActivo}
            sinRegistros={gruposDetalle.length === 0}
            fmtARS={fmtARS}
          >
            {gruposDetalle.map(cat => {
              const porcentajeGrupo = totalDetalleFiltrado > 0
                ? Math.round((Number(cat.total || 0) / totalDetalleFiltrado) * 100)
                : 0;
              return (
                <div key={cat.id} className="card" style={{ padding: 14 }}>
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
                  {cat.items.map(item => (<MovementRow key={item.id} item={item} tc={tc} month={mes.m} onEdit={openEdit} onToggle={toggleEstado} busy={estadoBusy} onConvert={convertToSavings} onDelete={g=>solicitarBorrado({...g,tipo:"gastos"})}/>))}
                </div>
              );
            })}
          </DetalleViewShell>
        )}

        {/* VENCIMIENTOS */}
{view==="vencimientos"&&(
  <VencimientosView
    data={data}
    config={cfg}
    today={today}
    selection={dueSelection}
    onSelectionChange={setDueSelection}
    mesActual={mes}
    tc={tc}
    onPrevMonth={() => cambiarMes(-1)}
    onNextMonth={() => cambiarMes(1)}
    onEdit={(g,key)=>openEdit(g,key)}
    onMarcarPagado={async (id, itemMesKey) => {
      const owner=authUser.usuarioId;
      try {
        const gastoActual = (data.gastos[itemMesKey] || []).find((g) => g.id === id);

        if (!gastoActual) {
          toast_("No se encontró el gasto", "err");
          return;
        }

        await actualizarEstadoGasto({
          movimientoId: gastoActual.id,
          estado: "pagado",
        });

        if(sessionRef.current!==owner)return;
        setData(prev=>({...prev,gastos:{...prev.gastos,[itemMesKey]:(prev.gastos[itemMesKey]||[]).map(g=>g.id===id?{...g,estado:'pagado',requiereRevision:false,motivoRevision:null}:g)}}));
        if(await refrescarMes(itemMesKey,owner))toast_("Marcado como pagado");

      } catch (e) {
        console.error(e);
        toast_("No se pudo marcar como pagado", "err");
      }
    }}
  />
)}

        {/* ANÁLISIS */}
        {view==="analisis"&&(
          <AnalisisView
            mes={mes}
            gastosDelMes={gastosDelMes}
            previousGastos={data.gastos[mesAnteriorKey] || []}
            hasPrevious={!!((data.gastos[mesAnteriorKey]||[]).length || (data.ingresos[mesAnteriorKey]||[]).length || data.sueldo[mesAnteriorKey])}
            hasCurrent={!!(gastosDelMes.length || ingresosDelMes.length || sueldoDelMes)}
            previousLabel={mesAnteriorInfo.label}
            totalGastos={totalGastos}
            tc={tc}
            analisisTab={analisisTab}
            setAnalisisTab={setAnalisisTab}
            cambiarMes={cambiarMes}
            categoriaRealDesdeGasto={categoriaRealDesdeGasto}
          />
        )}

        {/* VARIACIÓN */}
        {view==="variacion"&&(
          <VariacionView
            mesesAtrasVar={mesesAtrasVar}
            setMesesAtrasVar={setMesesAtrasVar}
            mes={mes}
            data={data}
            tc={tc}
            categoriaRealDesdeGasto={categoriaRealDesdeGasto}
          />
        )}

        {view==="ahorros" && <SavingsView key={`${authUser.usuarioId}_${mesKey}`} records={savingsRecords} status={savingsStatus} error={savingsError} onRetry={refreshSavings} period={mesKey} seed={savingsSeed} accounts={(cfg.mediosPago||[]).map(item=>item.nombre).filter(Boolean)} onSave={persistSavings}/> }
        {view==="ingresos" && <IncomeView total={totalIngresos} previous={totalIngresosAnterior} hasPrevious={!!((data.gastos[mesAnteriorKey]||[]).length || (data.ingresos[mesAnteriorKey]||[]).length || data.sueldo[mesAnteriorKey])} hasCurrent={!!(gastosDelMes.length || ingresosDelMes.length || sueldoDelMes)} previousLabel={mesAnteriorInfo.label} partial={mes.y===now.getFullYear()&&mes.m===now.getMonth()} salary={sueldoDelMes} salaryInput={sueldoInput} setSalaryInput={setSueldoInput} saveSalary={guardarSueldo} salaryBusy={sueldoBusy} form={ingForm} setForm={setIngForm} saveIncome={guardarIngreso} incomeBusy={guardarIngresoLoading} sources={[...new Set([...(cfg.fuentesIngreso||[]),...Object.values(data.ingresos).flat().map(i=>i.fuente),...FUENTES_INGRESO_GENERICAS].map(normalizarFuenteIngreso))]} items={ingresosDelMes} maxDay={new Date(mes.y,mes.m+1,0).getDate()} onEdit={item=>{setIngForm({...item,fuente:normalizarFuenteIngreso(item.fuente),monto:String(item.monto),dia:String(item.dia)});setTimeout(()=>{document.getElementById('income-form')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('income-amount')?.focus({preventScroll:true});},0);}} onDelete={solicitarBorrado}/>}

        {/* CONFIGURACIÓN */}
        {view==="config"&&(<>
          <section className="surface account-card"><span className="avatar">{authUser.nombre?.slice(0,1)}</span><div><strong>{authUser.nombre}</strong><p className="small muted">{authUser.workspaceNombre || "Tu espacio"} · Tus movimientos personales</p></div><UiIcon name="lock" size={19}/></section>
          <p className="settings-intro">Administrá tus conceptos frecuentes, medios de pago y copias de tus datos.</p>
          <div className="settings-tabs">{[["conceptos","Conceptos"],["medios","Medios de pago"],["debitos","Débitos automáticos"],["fuentes","Ingresos"],["tc","Dólar"],["backup","Copias y datos"]].map(([id,label])=><button key={id} aria-pressed={cfgTab===id} onClick={()=>setCfgTab(id)}>{label}</button>)}</div>
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
                    <div style={{ fontWeight:800,fontSize:15 }}>Editar concepto</div>
                    <button className="pb" style={{ background:"#1e1e2e",color:"#94a3b8",padding:"6px 10px" }} onClick={()=>setEditConcepto(null)}>✕</button>
                  </div>
                  <span style={lbl}>NOMBRE</span>
                  <input className="inf" value={editConcepto.nombre} onChange={e=>setEditConcepto(p=>({...p,nombre:e.target.value}))} style={{ marginBottom:12 }}/>
                  <span style={lbl}>MEDIO SUGERIDO</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
                    {(cfg.mediosPago||[]).map(mp=><button key={mp.id} className="pb" onClick={()=>setEditConcepto(p=>({...p,medioPagoId:mp.id}))} style={{ background:editConcepto.medioPagoId===mp.id?(mp.color||"#7c3aed"):"#1e1e2e",color:editConcepto.medioPagoId===mp.id?"#0a0a0f":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{mp.nombre}</button>)}
                  </div>
                  <span style={lbl}>Cómo pagás habitualmente</span>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
                    {(cfg.instrumentosPago||[]).map(ins=><button key={ins.id} className="pb" onClick={()=>setEditConcepto(p=>({...p,instrumentoId:ins.id}))} style={{ background:editConcepto.instrumentoId===ins.id?"#7c3aed":"#1e1e2e",color:editConcepto.instrumentoId===ins.id?"#fff":"#94a3b8",fontSize:12,padding:"6px 10px" }}>{ins.nombre}</button>)}
                  </div>
                  <span style={lbl}>Moneda habitual</span>
                  <div style={{ display:"flex",gap:8,marginBottom:12 }}>{["ARS","USD"].map(mon=><button key={mon} className="pb" onClick={()=>setEditConcepto(p=>({...p,monedaDefault:mon}))} style={{ background:editConcepto.monedaDefault===mon?(mon==="USD"?"#1e3a5f":"#14532d"):"#1e1e2e",color:editConcepto.monedaDefault===mon?(mon==="USD"?"#38bdf8":"#4ade80"):"#94a3b8" }}>{mon}</button>)}</div>
                  <div style={{ display:"flex",gap:8 }}><button className="pb" style={{ flex:2,background:"#7c3aed",color:"#fff" }} onClick={guardarConceptoEditado}>Guardar concepto</button><button className="pb" style={{ flex:1,background:"#2a1a1a",color:"#f87171" }} onClick={()=>desactivarConceptoCfg({id:editConcepto.id,nombre:editConcepto.nombre})}>Desactivar</button></div>
                </div>
              )}

              <div className="card"><span style={lbl}>CONCEPTOS ACTIVOS</span>
                {conceptosConfigFiltrados.slice(0,80).map(con=>{ const cg=(cfg.categoriasGasto||[]).find(x=>x.id===con.categoriaGastoId); const mp=(cfg.mediosPago||[]).find(x=>x.id===con.medioPagoId); const ins=(cfg.instrumentosPago||[]).find(x=>x.id===con.instrumentoId); const tags=(con.etiquetasIds||[]).map(id=>(cfg.etiquetas||[]).find(t=>t.id===id)?.nombre).filter(Boolean); return(
                  <div key={con.id} style={{ padding:"12px 0",borderBottom:"1px solid #1e1e2e" }}><div style={{ display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start" }}><div style={{ flex:1 }}><div style={{ fontSize:15,fontWeight:800,color:"#e2e8f0" }}>{con.nombre}</div><div style={{ fontSize:11,color:"#64748b",marginTop:4,lineHeight:1.6 }}>{normalizarEtiquetaVisual(mp?.nombre, "Medio no definido")} · {normalizarEtiquetaVisual(ins?.nombre, "Manual")} · {con.monedaDefault||"ARS"}</div></div><div style={{ display:"flex",gap:6 }}><button className="icon-button" aria-label={`Editar concepto ${con.nombre}`} onClick={()=>abrirEditarConcepto(con)}><UiIcon name="settings" size={18}/></button><button className="icon-button" aria-label={`Desactivar concepto ${con.nombre}`} onClick={()=>desactivarConceptoCfg(con)}><UiIcon name="trash" size={18}/></button></div></div></div>
                );})}
                {conceptosConfigFiltrados.length===0&&<div style={{ fontSize:13,color:"#64748b",padding:"12px 0" }}>No hay conceptos con ese filtro.</div>}
              </div>
            </>
          )}
          {cfgTab==="medios"&&(
            <>
              <div className="card" style={{ border:"1px solid #1e3a5f",background:"#0f172a" }}>
                <div style={{ fontWeight:800,fontSize:16,marginBottom:6 }}>Medios de pago</div>
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
          {cfgTab==="backup"&&(
            <div>
              <div className="card">
                <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Exportar mis movimientos</div>
                <p style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,marginBottom:12}}>
                  Descargá los gastos, ingresos y sueldos de todos tus meses en un archivo JSON.
                  Corresponde al usuario actual. No incluye las cuentas de otros usuarios ni reemplaza un respaldo completo.
                </p>
                <button className="pb" disabled={exportandoBackup} style={{width:"100%",background:"#7c3aed",color:"#fff"}} onClick={exportarBackup}>
                  {exportandoBackup ? "Preparando archivo…" : "Descargar movimientos (.json)"}
                </button>
                <p style={{fontSize:12,color:"#94a3b8",lineHeight:1.5,marginTop:12}}>
                  La restauración desde archivo no está disponible. Conservá la copia para consulta y recuperación asistida.
                </p>
              </div>
              {/* Estadísticas */}
              <div className="card">
                <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>Tus registros</div>
                {[
                  ["Meses con datos", new Set([...Object.keys(data.gastos).filter(k=>data.gastos[k]?.length),...Object.keys(data.ingresos).filter(k=>data.ingresos[k]?.length),...Object.keys(data.sueldo).filter(k=>data.sueldo[k]>0)]).size],
                  ["Total gastos cargados", Object.values(data.gastos).flat().length],
                  ["Medios de pago", (cfg.mediosPago||[]).length],
                  ["Recurrentes este mes", gastosDelMes.filter(g=>g.esRecurrente).length],
                ].map(([label,val])=>(<div key={label} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e1e2e" }}><span style={{ fontSize:13,color:"#94a3b8" }}>{label}</span><span style={{ fontSize:13,fontWeight:700 }}>{val}</span></div>))}
              </div>
            </div>
          )}
          {cfgTab==="debitos"&&<section className="surface income-card"><div className="section-line"><h2>Servicios con débito automático</h2><UiIcon name="repeat" size={21}/></div><p className="muted small">Registrados en {MESES[mes.m].toLowerCase()} de {mes.y}. Podés cambiar la marca al editar cada gasto.</p>{gastosDelMes.filter(g=>isAutomaticDebit(g,cfg)).map(g=><button className="summary-row" key={g.id} onClick={()=>openEdit(g)}><span className="row-copy"><strong>{g.servicio}</strong><small>{g.medioPagoNombre||g.medioPago} · {g.estado==='pagado'?'Pagado':'Pendiente de confirmar'}</small></span><UiIcon name="chevron" size={18}/></button>)}{!gastosDelMes.some(g=>isAutomaticDebit(g,cfg))&&<p className="quiet-state">Todavía no marcaste gastos con débito automático este mes.</p>}</section>}
          {cfgTab==="fuentes"&&(<>
            <div className="card" style={{ border:"1px solid #14532d55",background:"#0f1f17" }}>
              <div style={{ fontWeight:900,marginBottom:6 }}>Orígenes de ingreso</div>
              <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.5 }}>
                Definí las fuentes que aparecen en la pantalla Ingresos. Usalas para ordenar cargas variables como Hogar, Ventas, Trabajo Diario u Otros.
              </div>
            </div>
            <div className="card"><span style={lbl}>NUEVO ORIGEN</span><div style={{ display:"flex",gap:10 }}><input className="inf" placeholder="Ej: Ventas, Extras, Trabajo diario" value={newFuente} onChange={e=>setNewFuente(e.target.value)} style={{ flex:1 }}/><button className="pb" style={{ background:"#16a34a",color:"#dcfce7" }} onClick={addFuente}>+</button></div><div style={{ fontSize:11,color:"#64748b",marginTop:8 }}>Estas sugerencias se guardan para tu usuario en este dispositivo. Los ingresos registrados conservan su nombre.</div></div>
            <div className="card"><span style={lbl}>ORÍGENES ACTIVOS</span>{cfg.fuentesIngreso.map((f,idx)=>(<div key={idx}>{editFuente?.idx===idx?(<div style={{ display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid #1e1e2e",alignItems:"center" }}><input className="ei" value={editFuente.val} onChange={e=>setEditFuente(ef=>({...ef,val:e.target.value}))}/><button style={ib("#14532d","#4ade80")} onClick={saveFuente}>✓</button><button style={ib("#1e1e2e","#94a3b8")} onClick={()=>setEditFuente(null)}>✕</button></div>):(<div style={rowS}><div><div style={{ fontSize:14,fontWeight:800 }}>{normalizarFuenteIngreso(f)}</div><div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{f!==normalizarFuenteIngreso(f)?`Alias anterior: ${f}`:"Disponible en Ingresos"}</div></div><div style={{ display:"flex",gap:6 }}><button style={ib("#1a1a24","#94a3b8")} onClick={()=>setEditFuente({idx,val:f})}>✎</button><button style={ib("#2a1a1a","#f87171")} onClick={()=>delFuente(idx)}>✕</button></div></div>)}</div>))}</div>
          </>)}
        </>)}
      {view==="config"&&<button className="logout-button" onClick={handleLogout}>Cerrar sesión</button>}
      </div>

      {replicarStep && <ReplicateModal step={replicarStep} items={gastosFuenteReplicar} included={gastosIncluidos} excluded={excluirReplicar} copied={replicaCopiados} nextMonth={mesNombreSig()} tc={tc} busy={replicando} hasSource={!!gastosDelMes.length} onClose={()=>setReplicarStep(null)} onToggle={toggleExcluir} onSelectAll={all=>setExcluirReplicar(new Set(all?[]:gastosFuenteReplicar.map(g=>g.id)))} onNext={()=>setReplicarStep("confirmar")} onBack={()=>setReplicarStep("modal")} onConfirm={confirmarReplica} onView={()=>{setReplicarStep(null);cambiarMes(1);setView("resumen");window.scrollTo({top:0});}}/>}

      <nav className="bottom-nav" aria-label="Navegación principal">
        {[{id:"home",icon:"home",label:"Inicio"},{id:"resumen",icon:"movements",label:"Movimientos"},{id:"cargar",icon:"plus",label:"Cargar"},{id:"vencimientos",icon:"calendar",label:"Vencimientos"},{id:"analisis",icon:"chart",label:"Informes"}].map(nav=>{
          const active=view===nav.id||(nav.id==="resumen"&&["ingresos","ahorros"].includes(view))||(nav.id==="analisis"&&view==="variacion");
          return <button key={nav.id} className={`ni ${nav.id==="cargar"?"nav-add":""}`} aria-current={active?"page":undefined} onClick={()=>{if(nav.id==="vencimientos")setDueSelection({filter:"all",scope:"all"});setView(nav.id);window.scrollTo({top:0,behavior:"instant"});}}><UiIcon name={nav.icon}/><span>{nav.label}</span>{nav.id==="vencimientos"&&vencUrgentes>0&&<span className="nav-dot" aria-label={`${vencUrgentes} registros requieren atención`}/>}</button>;
        })}
      </nav>
    </div>
  );
}
