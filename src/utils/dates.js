export const diasRestantes = (fechaStr) => {
  if (!fechaStr) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaStr + "T00:00:00");
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
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