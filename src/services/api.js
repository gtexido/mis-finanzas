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

async function catalogosAdminRequest(method, payload) {
  const res = await fetch("/api/catalogos-admin", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "Error administrando catálogo");
  }

  return json.data;
}

export async function crearConcepto(payload) {
  return catalogosAdminRequest("POST", {
    ...payload,
    recurso: "concepto",
  });
}

export async function actualizarConcepto(payload) {
  return catalogosAdminRequest("PUT", {
    ...payload,
    recurso: "concepto",
  });
}

export async function desactivarConcepto(conceptoId) {
  return catalogosAdminRequest("DELETE", {
    recurso: "concepto",
    conceptoId,
  });
}

export async function crearMedioPago(payload) {
  return catalogosAdminRequest("POST", {
    ...payload,
    recurso: "medio_pago",
  });
}

export async function actualizarMedioPago(payload) {
  return catalogosAdminRequest("PUT", {
    ...payload,
    recurso: "medio_pago",
  });
}

export async function desactivarMedioPago(medioPagoId) {
  return catalogosAdminRequest("DELETE", {
    recurso: "medio_pago",
    medioPagoId,
  });
}

export async function crearCategoriaGasto(payload) {
  return catalogosAdminRequest("POST", {
    ...payload,
    recurso: "categoria_gasto",
  });
}

export async function actualizarCategoriaGasto(payload) {
  return catalogosAdminRequest("PUT", {
    ...payload,
    recurso: "categoria_gasto",
  });
}

export async function desactivarCategoriaGasto(categoriaGastoId) {
  return catalogosAdminRequest("DELETE", {
    recurso: "categoria_gasto",
    categoriaGastoId,
  });
}

export async function crearEtiqueta(payload) {
  return catalogosAdminRequest("POST", {
    ...payload,
    recurso: "etiqueta",
  });
}

export async function actualizarEtiqueta(payload) {
  return catalogosAdminRequest("PUT", {
    ...payload,
    recurso: "etiqueta",
  });
}

export async function desactivarEtiqueta(etiquetaId) {
  return catalogosAdminRequest("DELETE", {
    recurso: "etiqueta",
    etiquetaId,
  });
}