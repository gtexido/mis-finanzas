export async function getCatalogos() {
  const res = await fetch("/api/catalogos");
  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al traer catálogos");
  }

  return json.data;
}

export async function getMovimientos(periodo = "2026-04") {
  const res = await fetch(`/api/movimientos?periodo=${periodo}`);
  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al traer movimientos");
  }

  return json.data;
}

export async function crearGasto(payload) {
  const res = await fetch("/api/gastos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al guardar gasto");
  }

  return json.data;
}

export async function eliminarGasto(movimientoId) {
  const res = await fetch("/api/gastos-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ movimientoId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al eliminar gasto");
  }

  return json.data;
}

export async function actualizarGasto(payload) {
  const res = await fetch("/api/gastos-update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al actualizar gasto");
  }

  return json.data;
}

export async function crearIngreso(payload) {
  const res = await fetch("/api/ingresos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al guardar ingreso");
  }

  return json.data;
}

export async function eliminarIngreso(movimientoId) {
  const res = await fetch("/api/ingresos-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ movimientoId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al eliminar ingreso");
  }

  return json.data;
}

export async function guardarSueldoNeon(payload) {
  const res = await fetch("/api/sueldo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al guardar sueldo");
  }

  return json.data;
}

export async function getCotizacionPorFecha(fecha, tipo = "tarjeta") {
  const params = new URLSearchParams({
    fecha,
    tipo,
    monedaOrigen: "USD",
    monedaDestino: "ARS",
  });

  const res = await fetch(`/api/cotizaciones?${params.toString()}`);
  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al traer cotización");
  }

  return json.data;
}

export async function guardarCotizacion(payload) {
  const res = await fetch("/api/cotizaciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al guardar cotización");
  }

  return json.data;
}