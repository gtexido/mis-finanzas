export function generarId(prefijo = "mov") {
  return `${prefijo}_${Math.random().toString(36).slice(2, 14)}`;
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizarMoneda(moneda) {
  return String(moneda || "ARS").trim().toUpperCase();
}

export function normalizarFecha(fecha) {
  if (!fecha) return null;
  return String(fecha).slice(0, 10);
}

export function normalizarListaIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

export function normalizarTexto(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function fuenteDefaultPorUsuario(usuarioId) {
  const defaults = {
    usr_gustavo: "fi_gustavo",
    usr_vane: "fi_vane",
  };

  return defaults[usuarioId] || "fi_vane";
}
