# Correcciones preparadas para Mis Finanzas

Fecha: 2026-10-02. Base: `385b0c478676774331bec5dbcf74d683bd67b7c5` (ZIP recibido). Copia separada del original; pendiente de subir a GitHub, probar en Neon de pruebas y desplegar en Vercel.

La solicitud actual autoriza corregir los importes y los problemas encontrados. Los documentos de sprints anteriores quedan como contexto histórico. La guía vigente para esta entrega es `GUIA_RESPALDO_Y_PUBLICACION.md`.

## Cambios

| Problema | Corrección |
| --- | --- |
| Al borrar el importe de un ítem reaparecía 0 | El texto del campo se conserva durante la edición y se convierte a número al guardar |
| La edición simple convertía cada pulsación a número | Se conservan vacío y decimales mientras se escribe; se exige un importe final positivo |
| Doble toque al guardar un gasto, editarlo o replicarlo | Bloqueo de reentrada y botón de progreso mientras la operación está pendiente |
| Ocultar opciones eliminaba el desglose, incluyendo su moneda | La visibilidad no cambia el contenido enviado; el desglose sigue visible y se conserva al guardar |
| Volver explícitamente de desglose a importe simple reutilizaba un total convertido | Se limpia el importe para que se ingrese el valor en la moneda seleccionada |
| La réplica confiaba solo en los datos cargados | Consulta de nuevo el mes destino, rechaza copiar si ya hay gastos y conserva el concepto formal |
| Un fallo podía dejar cabecera, etiquetas o detalle a medias | Alta, edición y borrado de cada gasto usan una transacción de Neon para sus escrituras |
| Fechas/importes inválidos llegaban a SQL | Validaciones de período, día real del mes, importes positivos, monedas y vencimiento; respuesta 400 |
| Historial, evolución y vencimientos dependían de visitar meses | Carga inicial de todos los movimientos del usuario; se mantiene la actualización del mes seleccionado |
| Una sesión vencida podía parecer una cuenta vacía | Se limpia la sesión y se muestra el ingreso; fallos de carga muestran error y reintento |
| “Backup” exportaba solo meses en memoria | Exportación consultada al servidor de todos los meses del usuario, con versión y alcance explícitos |
| Restaurar JSON cambiaba solo la pantalla y Sheets anunciaba un envío inexistente | Se retiraron esas acciones engañosas; la pantalla informa que no hay restauración JSON y remite a conservar la copia |
| Algunos nombres de archivos de entorno no estaban ignorados | `.gitignore` cubre `.env*`, con excepción del ejemplo sin valores |

## Archivos funcionales

- `.gitignore`, `.env.example`.
- `src/App.jsx`.
- `src/components/EditModal.jsx`, `src/components/SubconceptosModal.jsx`.
- `src/mappers/movimientosMapper.js`, `src/services/api.js`.
- `api/_validation.js` (nuevo).
- `api/gastos.js`, `api/gastos-update.js`, `api/gastos-delete.js`.
- `api/ingresos.js`, `api/sueldo.js`.

Se agregan esta documentación, la guía y `verificacion/`. No se cambiaron `package.json`, el lockfile, la configuración de Vercel ni el esquema de base de datos. Las herramientas de prueba no son dependencias de producción.

## Validación realizada

- Build de producción con Vite y generación de la PWA: correcto.
- 10 escenarios en Chromium móvil con API simulada: correctos.
- 10 escenarios de API sobre PostgreSQL embebido/PGlite y 1 de cálculos: correctos.
- La prueba de ingreso inválido contiene siete combinaciones de importes/fechas rechazadas antes de SQL.
- Se provocaron fallos en alta, edición y borrado; se comprobó que las filas originales se conserven. Una clave foránea inexistente provocó un error SQL real y rollback.
- Se comprobaron permisos para evitar editar/borrar el movimiento de otro usuario y rechazo de peticiones sin sesión.
- Evidencias, datos ficticios y scripts: `verificacion/`. Las capturas no contienen datos del usuario.

No se accedió a la base real. Falta comprobar restricciones adicionales, permisos, configuración y funcionamiento de punta a punta en una Preview conectada a una rama Neon de pruebas. Se mantuvo intacto el proyecto original extraído del ZIP.

## Límites que siguen existiendo

- El bloqueo de doble toque actúa en la pantalla actual. No incorpora idempotencia de servidor para solicitudes simultáneas desde varios dispositivos ni para una respuesta perdida por la red.
- Cada gasto es atómico; la copia de un mes con varios gastos no es una única transacción. Si falla a mitad, se informa cuántos se confirmaron y hay que revisar el destino. La verificación previa no es un bloqueo entre dispositivos.
- Un fallo de red al refrescar después de un guardado puede dejar incierto lo mostrado. Recargar y verificar el movimiento antes de volver a cargarlo evita reintentos manuales que lo dupliquen.
- USD sin desglose conserva la regla previa: su equivalente ARS se calcula con el tipo de cambio global. Cambiar a un costo histórico requiere acordar otra regla y posiblemente migrar datos.
- La exportación JSON cubre movimientos del usuario actual y catálogos, no todos los usuarios ni todas las tablas; no es una copia integral ni ofrece restauración desde la app. El respaldo recuperable completo se hace en Neon y con `pg_dump`.
- La carga del historial no usa paginación. Para un volumen muy grande conviene medirlo en Preview; no se conoce el tamaño de la base real.

Primero completar el respaldo del código, datos y configuración según la guía. Luego probar la rama corregida y publicar mediante el proyecto Vercel existente.
