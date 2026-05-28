import { MAPA_FUENTES_INGRESO_LEGACY, FUENTES_INGRESO_GENERICAS } from "./constants";

export const fmtARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const fmtUSD = (n) =>
  `U$D ${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)}`;

export const fmtFecha = (str) => {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};

export const fmtARSCompact = (valor) => {
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

export const normalizarEtiquetaVisual = (valor, fallback = "") => {
  const texto = String(valor || "").trim();
  const normalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!texto) return fallback;
  if (normalizado === "sin definir" || normalizado === "sin instrumento") return fallback || "Manual";
  if (normalizado === "sin medio") return fallback || "Medio no definido";

  return texto;
};

export const normalizarFuenteIngreso = (fuente = "") => {
  const nombre = String(fuente || "").trim();
  if (!nombre) return "Otros";
  return MAPA_FUENTES_INGRESO_LEGACY[nombre] || (FUENTES_INGRESO_GENERICAS.includes(nombre) ? nombre : "Otros");
};

export const slug = (s) => s.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")+"_"+Date.now();

export const slugKey = (s = "") =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

export const fmtMonto = (monto, moneda = "ARS") => {
  const n = Number(monto || 0);

  if (moneda === "USD") {
    return `USD ${n.toFixed(2)}`;
  }

  return `$ ${n.toLocaleString("es-AR")}`;
};

export const normalizarTexto = (txt = "") =>
  String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getObservacionVisual = (observacion = "") => {
  const texto = String(observacion || "").trim();
  if (!texto) return null;

  const normalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizado.includes("cierra") || normalizado.includes("cierre")) {
    return {
      icon: "💳",
      text: texto,
      background: "linear-gradient(135deg,rgba(14,116,144,.20),rgba(30,41,59,.55))",
      border: "1px solid rgba(56,189,248,.32)",
      color: "#bae6fd",
      iconColor: "#38bdf8",
    };
  }

  if (normalizado.includes("cuota")) {
    return {
      icon: "🧾",
      text: texto,
      background: "linear-gradient(135deg,rgba(124,58,237,.18),rgba(30,41,59,.55))",
      border: "1px solid rgba(167,139,250,.30)",
      color: "#ddd6fe",
      iconColor: "#a78bfa",
    };
  }

  if (normalizado.includes("revisar")) {
    return {
      icon: "🔎",
      text: texto,
      background: "linear-gradient(135deg,rgba(88,28,135,.24),rgba(30,41,59,.55))",
      border: "1px solid rgba(196,181,253,.30)",
      color: "#ede9fe",
      iconColor: "#c4b5fd",
    };
  }

  if (normalizado.includes("pagar") || normalizado.includes("manual")) {
    return {
      icon: "⚠️",
      text: texto,
      background: "linear-gradient(135deg,rgba(146,64,14,.22),rgba(30,41,59,.55))",
      border: "1px solid rgba(251,146,60,.32)",
      color: "#fed7aa",
      iconColor: "#fb923c",
    };
  }

  return {
    icon: "📝",
    text: texto,
    background: "linear-gradient(135deg,rgba(15,23,42,.92),rgba(30,41,59,.55))",
    border: "1px solid rgba(148,163,184,.18)",
    color: "#cbd5e1",
    iconColor: "#a78bfa",
  };
};