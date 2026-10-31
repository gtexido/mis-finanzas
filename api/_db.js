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

  return defaults[usuarioId] || null;
}

// Traduce el nombre visible de un servicio al id guardado en la tabla `servicios`.
// Antes estaba copiada en gastos.js y gastos-update.js.
export function mapServicioId(servicio) {
  const map = {
    "Muni Auto": "ser_muni_auto",
    "Renta Auto/Casa": "ser_renta_auto_casa",
    "Tarjeta Cordobesa": "ser_tarjeta_cordobesa",
    Caruso: "ser_caruso",
    IPV: "ser_ipv",
    Prevencion: "ser_prevencion",
    "Tarjeta Santander": "ser_tarjeta_santander",
    "Tarjeta Santander Dólares": "ser_tarjeta_santander_dolares",
    "Microsoft 365": "ser_microsoft_365",
    "Agua Casa": "ser_agua_casa",
    Netflix: "ser_netflix",
    "Nivel 6 MP": "ser_nivel_6_mp",
    Monotributo: "ser_monotributo",
    Capcut: "ser_capcut",
    Expensas: "ser_expensas",
    "Seguro Auto": "ser_seguro_auto",
    "Luz Casa": "ser_luz_casa",
    Gas: "ser_gas",
    "Cable Casa y Teléfonos": "ser_cable_casa_telefonos",
    "Cable Local": "ser_cable_local",
    "Colegio CESD": "ser_colegio_cesd",
    "Colegio CESD Material Didáctico": "ser_colegio_cesd_material_didactico",
    "Colegio CESD Extendido": "ser_colegio_cesd_extendido",
    "Colegio CESD Bono Vianda": "ser_colegio_cesd_bono_vianda",
    Super: "ser_super",
    Nafta: "ser_nafta",
    "Carne/Pollo/Verdulería/kiosco": "ser_carne_pollo_verduleria_kiosco",
    "Agua Bidones": "ser_agua_bidones",
    "Lucho Gym": "ser_lucho_gym",
    Basquet: "ser_basquet",
    Quini: "ser_quini",
    "Comida Banco": "ser_comida_banco",
    Peluquería: "ser_peluqueria",
    Cumple: "ser_cumple",
    Helado: "ser_helado",
    Regalos: "ser_regalos",
    Otros: "ser_otros",
    Farmacia: "ser_farmacia",
    Cotillón: "ser_cotillon",
    "Jean Vane": "ser_jean_vane",
    Lomito: "ser_lomito",
    "Boda de Oro": "ser_boda_de_oro",
    Prueba: "ser_prueba",
    "Cotillón Jere": "ser_cotillon_jere",
    "Vaper Liquido": "ser_vaper_liquido",
    "Lava auto y panadería": "ser_lava_auto_y_panaderia",
  };

  return map[servicio] || null;
}
