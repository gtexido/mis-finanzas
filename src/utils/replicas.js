// =============================================================================
// src/utils/replicas.js
// Funciones puras para replicar gastos al mes siguiente.
//
// Origen: estaban dentro del componente App (src/App.jsx). Se movieron sin
// cambiar su código. No usan estado ni datos de pantalla.
//
// Uso:
//   import { moverFechaAlMesSiguiente, moverDiaAlMesSiguiente,
//            prepararSubconceptosParaReplica } from "./utils/replicas";
//
// Propósito:
//   Que la lógica de fechas y desglose de la réplica se pueda probar sola
//   y que App.jsx quede más corto.
// =============================================================================

export const ultimoDiaDelMes = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

export const moverFechaAlMesSiguiente = (fecha) => {
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

export const moverDiaAlMesSiguiente = (dia, nextKey) => {
  const [anio, mesNumero] = String(nextKey).split("-").map(Number);
  const monthIndex = mesNumero - 1;
  const diaNum = Number(dia || 1);
  const diaFinal = Math.min(
    Number.isFinite(diaNum) && diaNum > 0 ? diaNum : 1,
    ultimoDiaDelMes(anio, monthIndex)
  );

  return String(diaFinal);
};

export const prepararSubconceptosParaReplica = (subconceptos = []) => {
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
