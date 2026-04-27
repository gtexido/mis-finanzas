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

export async function crearConcepto(payload) {
  const res = await fetch("/api/conceptos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al crear concepto");
  }

  return json.data;
}

export async function actualizarConcepto(payload) {
  const res = await fetch("/api/conceptos", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al actualizar concepto");
  }

  return json.data;
}

export async function desactivarConcepto(conceptoId) {
  const res = await fetch("/api/conceptos", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conceptoId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al desactivar concepto");
  }

  return json.data;
}

export async function crearMedioPago(payload) {
  const res = await fetch("/api/medios-pago", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al crear medio de pago");
  }

  return json.data;
}

export async function actualizarMedioPago(payload) {
  const res = await fetch("/api/medios-pago", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al actualizar medio de pago");
  }

  return json.data;
}

export async function desactivarMedioPago(medioPagoId) {
  const res = await fetch("/api/medios-pago", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ medioPagoId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al desactivar medio de pago");
  }

  return json.data;
}

export async function crearCategoriaGasto(payload) {
  const res = await fetch("/api/categorias-gasto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al crear categoría");
  }

  return json.data;
}

export async function actualizarCategoriaGasto(payload) {
  const res = await fetch("/api/categorias-gasto", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al actualizar categoría");
  }

  return json.data;
}

export async function desactivarCategoriaGasto(categoriaGastoId) {
  const res = await fetch("/api/categorias-gasto", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categoriaGastoId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al desactivar categoría");
  }

  return json.data;
}

export async function crearEtiqueta(payload) {
  const res = await fetch("/api/etiquetas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al crear etiqueta");
  }

  return json.data;
}

export async function actualizarEtiqueta(payload) {
  const res = await fetch("/api/etiquetas", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al actualizar etiqueta");
  }

  return json.data;
}

export async function desactivarEtiqueta(etiquetaId) {
  const res = await fetch("/api/etiquetas", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ etiquetaId }),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error al desactivar etiqueta");
  }

  return json.data;
}