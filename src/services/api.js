export async function getCatalogos() {
  const res = await fetch("/api/catalogos");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error al traer catálogos");
  return json.data;
}

export async function getMovimientos(periodo = "2026-04") {
  const res = await fetch(`/api/movimientos?periodo=${periodo}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error al traer movimientos");
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
  if (!json.ok) throw new Error(json.error || "Error al guardar gasto");
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
  if (!json.ok) throw new Error(json.error || "Error al eliminar gasto");
  return json.data;
}

export async function actualizarGasto(payload) {
  console.log("API actualizarGasto - payload recibido", payload);

  const res = await fetch("/api/gastos-update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("API actualizarGasto - status fetch", res.status);

  const json = await res.json();
  console.log("API actualizarGasto - respuesta json", json);

  if (!json.ok) throw new Error(json.error || "Error al actualizar gasto");
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
  if (!json.ok) throw new Error(json.error || "Error al guardar ingreso");
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
  if (!json.ok) throw new Error(json.error || "Error al eliminar ingreso");
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
  if (!json.ok) throw new Error(json.error || "Error al guardar sueldo");
  return json.data;
}