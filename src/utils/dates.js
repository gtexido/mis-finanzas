export const fechaValida = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const diasRestantes = (fechaStr, today = new Date()) => {
  if (!fechaValida(fechaStr)) return null;
  // Calendar days remain stable across daylight-saving transitions.
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(`${fechaStr}T00:00:00Z`) - current) / 86400000);
};

export const getGrupoVencimiento = (fechaStr) => {
  if (!fechaStr) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fecha = new Date(fechaStr + "T00:00:00");
  fecha.setHours(0, 0, 0, 0);

  const diaSemana = hoy.getDay();
  const finSemana = new Date(hoy);
  finSemana.setDate(hoy.getDate() + (7 - diaSemana));
  finSemana.setHours(0, 0, 0, 0);

  if (fecha < hoy) return "vencidos";
  if (fecha.getTime() === hoy.getTime()) return "hoy";
  if (fecha > hoy && fecha <= finSemana) return "esta_semana";
  return "proximos";
};

export const semaforo = (dias) => {
  if (dias === null) return null;
  if (dias < 0) return { color:"#f87171", bg:"#2a1a1a", label:`Venció hace ${Math.abs(dias)}d`, icon:"🔴" };
  if (dias === 0) return { color:"#f87171", bg:"#2a1a1a", label:"¡Hoy!", icon:"🔴" };
  if (dias <= 3) return { color:"#f87171", bg:"#2a1a1a", label:`${dias}d`, icon:"🔴" };
  if (dias <= 7) return { color:"#fb923c", bg:"#2a0e00", label:`${dias}d`, icon:"🟠" };
  return { color:"#4ade80", bg:"#0a2010", label:`${dias}d`, icon:"🟢" };
};

export const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const getMesKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;

export const getMesActual = () => {
  const hoy = new Date();
  return {
    y: hoy.getFullYear(),
    m: hoy.getMonth(),
  };
};

/**
 * Retorna el nombre del mes a partir de una mesKey de formato 'YYYY-MM'.
 * @param {string} key
 * @returns {string}
 */
export const getNombreMesKey = (key) => {
  if (!key) return "";
  const parts = String(key).split("-");
  if (parts.length < 2) return key;
  const idx = parseInt(parts[1], 10) - 1;
  return MESES[idx] || key;
};
