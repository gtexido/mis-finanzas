// =============================================================================
// src/utils/validarGasto.js
// Validación de un gasto antes de guardarlo desde la pantalla Cargar.
//
// Origen: estaba al inicio de guardarGastoInterno (src/App.jsx). Las reglas y su
// orden son los mismos; ahora la función devuelve el mensaje en lugar de
// mostrarlo, y App.jsx se encarga de avisar y de abrir el desglose.
//
// Uso:
//   const r = validarGastoParaGuardar(form, { mes, cfg });
//   r.ok === true  -> r.f es el gasto con el concepto sin espacios sobrantes
//   r.ok === false -> r.mensaje es el aviso; r.abrirDesglose indica que además
//                     hay que abrir la ventana de desglose
//
// Propósito:
//   Poder probar las reglas de validación sin la pantalla y dejar
//   guardarGastoInterno más corto antes del rediseño de Cargar.
// =============================================================================

export const validarGastoParaGuardar = (f, { mes, cfg }) => {
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
    return { ok: false, mensaje: "Escribí el concepto del gasto antes de guardar." };
  }

  if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > ultimoDiaMes) {
    return { ok: false, mensaje: `Ingresá un día válido entre 1 y ${ultimoDiaMes}.` };
  }

  if (!medioPagoValido) {
    return { ok: false, mensaje: "Seleccioná un medio de pago para evitar que quede sin clasificar." };
  }

  if (!instrumentoValido) {
    return { ok: false, mensaje: "Seleccioná cómo pagaste antes de guardar." };
  }

  if (!esDetalle && (!Number.isFinite(montoNumero) || montoNumero <= 0)) {
    return { ok: false, mensaje: "Ingresá un monto mayor a cero." };
  }

  if (esDetalle && (!f.subconceptos || f.subconceptos.length === 0)) {
    return {
      ok: false,
      mensaje: "Primero agregá ítems al desglose y tocá ‘Guardar desglose y volver’.",
      abrirDesglose: true,
    };
  }

  return { ok: true, f: { ...f, servicio: conceptoLimpio } };
};
