# Estado actual de Mis Finanzas

Actualizado el 1 de noviembre de 2026.

## Entornos

- Producción: proyecto de Vercel `mis-finanzas`, dominio `mis-finanzas-tan.vercel.app`, base de Neon rama `production`.
- Pruebas: versiones por pull request, con la copia `pruebas-vista-previa`. Se actualiza desde producción con un reinicio de la rama.
- `mis-finanzas-cbvk` es una copia duplicada de Vercel. Está pausada porque ninguno de los dos usuarios la usa.
- Neon conserva `restore-antes-migracion-20261029` (base previa a la migración V1) y `respaldo-20261101` (base al 1 de noviembre de 2026, tras las mejoras de pantallas), para volver atrás si hiciera falta.
- GitHub conserva la rama `respaldo-2026-11-01`: el código exacto de producción al 1 de noviembre de 2026 (commit `89af1df`).
- GitHub conserva la rama `respaldo-2026-11-12`: el código de producción previo a la base de diseño compacta (commit `1824b01`).
- GitHub conserva la rama `respaldo-2026-11-13`: el código de producción previo a borrar las pantallas anteriores (commit `280357b`).
- Neon conserva `respaldo-20261113-antes-cuotas` (base previa a las columnas de cuotas) y `prueba-cuotas-20261113` (copia donde se probó el script; se puede borrar).

## Qué se hizo

- Base ordenada con integridad y reglas (`sql/SQL_MIGRACION_BASE_V1.sql`), aplicada en producción con respaldo previo.
- Controles automáticos en GitHub y `main` protegida.
- Login con bloqueo temporal tras 5 intentos fallidos (15 minutos), sin escribir en la base por usuarios inexistentes.
- Errores del servidor unificados en `api/_http.js`: 400 para datos inválidos, 409 para conflictos y 500 genérico, sin textos técnicos de la base.
- Dependabot activo para avisos de seguridad y actualizaciones.
- Limpieza de código sin uso y de documentos viejos.
- Primera pieza separada de `App.jsx`: `src/utils/replicas.js`.

## Mejoras de pantallas (octubre y noviembre de 2026)

Ninguna cambió la base de datos ni el servidor, salvo que se indique. Cada fila es un pull request ya en producción; el commit es el de la mezcla en `main`.

| PR | Cambio | Commit |
|----|--------|--------|
| 21 a 24 | Cargar nuevo: atajos, borrador, atajos por nombre, Deshacer al guardar y total del mes | `c7d4102`, `7a8c1d5`, `6ded931`, `033f81d` |
| 25 | Pruebas de pantallas: UI-10 y UI-12 | `392c9f1` |
| 26 | Ajustes nuevo: lista de secciones | `4e4b2c6` |
| 27 | Textos comunes: plurales, moneda única y períodos con nombre | `2f9a39f` |
| 28 | Avisos: tipo correcto y duración según el caso | `9a2fb76` |
| 29 | Movimientos: fila compacta | `25676fb` |
| 30 | Movimientos: filtros a la vista, Replicar según el mes y botón de cargar | `4a81fcb` |
| 31 | Inicio: cargar arriba, Por pagar y solo avisos con datos | `29d02cc` |
| 32 | Vencimientos: tarjeta compacta | `f24408a` |
| 33 | Informes: mes anterior con nombre y sin cuadros en cero | `887e967` |
| 34 | Ventanas: textos de Eliminar y Replicar sin jerga | `96bdb22` |
| 35 | Limpieza de código sin uso | `66729df` |
| 36 | Deshacer al eliminar un gasto (lo vuelve a crear con identificador nuevo) | `64c625d` |
| 37 | Ingresos: se oculta la comparación vacía | `6910f99` |
| 38 | Las cinco pantallas nuevas pasan a ser las de todos | `5d654d6` |
| 39 | Importes en pesos sin decimales | `89af1df` |
| 40 | Historial de cambios y guía para volver atrás (solo documentación) | `11dbc29` |
| 41 | Desglose: título sin emoji, como el resto de la app | `1824b01` |
| 44 | Base de diseño normalizada y pantallas compactas (`src/styles/base-compacta.css`); títulos iguales a la barra de abajo; Cargar mantiene sus pestañas Gasto, Ingreso y Ahorro | `b64bc6a` |
| 45 | Vencimientos: filas en un renglón en pantallas angostas, cartel de pagado por revisar debajo del nombre, botón "Debitado" para débitos | `faeb156` |
| 46 | Informes: nueva pestaña "Tu inflación" (compara los mismos gastos entre dos meses; cálculo en `src/utils/inflacion.js`). No toca base ni servidor | `3de17d8` |
| 47 | Inicio: bloque "¿Llegás a fin de mes?" en el mes en curso (reemplaza a "Por pagar"; cálculo en `src/utils/proyeccion.js`). No toca base ni servidor | `280357b` |
| 49 | Limpieza: se borra el código de las pantallas anteriores y sus interruptores (`?...=actual` deja de existir). Ajustes suma la fila "Conceptos recordados" | `1f12952` |
| 50 | Limpieza: se quitan 68 reglas de estilo que ya no usa ninguna pantalla. Comprobado con 28 capturas idénticas antes y después | `e985aac` |
| 51 | Cuotas, paso 1: el servidor crea todas las cuotas de una compra en una operación y permite borrar "esta y las que faltan". Todavía sin pantalla | `3cc1bf5` |
| 52 | Cuotas, paso 2: opción "Es una compra en cuotas" en Cargar (dentro de Más opciones), marca "Cuota 3/12" en Movimientos y Vencimientos, y al eliminar una cuota se elige "solo esta" o "esta y las que faltan". Las cuotas no entran en Replicar ni en Tu inflación | `53a81fa` |
| 53 | Cuotas: las cuotas de los meses siguientes nacen con la fecha de vencimiento "para confirmar" (la primera queda como se cargó). No suman avisos en Inicio hasta que llega su mes | `c5e4ff3` |
| 54 | Cuotas, paso 3: bloque "Tus cuotas" en Inicio, con lo que se va este mes, qué cuota es, cuándo termina cada compra y cuánto queda por pagar | `1e1ba4e` |
| 55 | Pendiente por medio de pago: bloque "Cuánto necesitás en cada cuenta" en Inicio y línea "Falta pagar" en cada medio de pago de Movimientos | pendiente |

Desde el PR 49 las pantallas anteriores ya no están en el código. Para volver a verlas hay que usar la rama `respaldo-2026-11-13` o revertir ese PR.

## Cambios de datos en la base

| Fecha | Cambio | Respaldo previo en Neon |
|-------|--------|-------------------------|
| 12/11/2026 | Forma de pago "QR" agregada para las dos cuentas (`ins_qr_gustavo`, `ins_qr_vane`) en `instrumentos_pago` | `respaldo-20261112-antes-qr` |
| 13/11/2026 | Script `sql/SQL_CUOTAS_V1.sql`: tres columnas nuevas en `movimientos` (`cuota_plan_id`, `cuota_numero`, `cuota_total`), una restricción y un índice. 302 filas antes y después, sin cambios en los datos | `respaldo-20261113-antes-cuotas` |
| 13/11/2026 | Cuotas 2 a 12 de Aire acondicionado (`plan_q2opfzmiei`): se marcaron con la fecha de vencimiento para confirmar (`requiere_revision`, motivo `REVISAR_VENCIMIENTO`, origen `CUOTA`). 11 filas; sin cambios en importes, fechas ni estados. Para revertir: poner `requiere_revision=false` y `motivo_revision`, `origen_movimiento` en NULL en esas 11 filas | no hizo falta (cambio chico y reversible) |

## Cómo volver atrás

1. Si algo falla en la pantalla: en Vercel, proyecto `mis-finanzas`, Deployments, elegir un deploy anterior en estado Ready y usar Promote to Production (o Instant Rollback). Es inmediato y no toca la base.
2. Para deshacer un cambio concreto: pedir un `revert` del pull request correspondiente (se abre como un PR nuevo, con sus controles, y se mezcla como siempre). Revertir de a un cambio, empezando por el más nuevo.
3. Para volver al código exacto de una fecha: la rama `respaldo-2026-11-01`.
4. Los datos: ningún cambio de pantallas modificó la estructura de la base. Si hiciera falta recuperar datos, usar la rama `respaldo-20261101` de Neon (copia al 1 de noviembre). Lo cargado después de esa fecha no está en la copia.

## Reglas de trabajo

- Cambios chicos, en rama aparte, con controles en verde y prueba en la versión de prueba antes de mezclar.
- Los cambios en Cargar, `guardarGasto`, validaciones o cálculo de montos se hacen con el mismo cuidado y siempre quedan cubiertos por pruebas.
- Cualquier cambio en GitHub, Vercel o Neon se verifica después de aplicarlo.
- Las actualizaciones grandes de librerías (vite 8, react-dom 19, plugin-react 6, vite-plugin-pwa 2) se hacen juntas, en una rama propia.

## Próximos pasos

1. Seguir dividiendo `App.jsx` de a una pieza, sin cambiar cómo se ve.
2. Rediseñar Cargar (en dos pasos) y Ajustes, detrás de un interruptor para poder volver a la pantalla anterior.
3. Reemplazar las pruebas de pantallas pendientes (UI-10 y UI-12) por pruebas de humo y hacer obligatorio ese control.
4. Cuotas y cierre de tarjeta (requiere una tabla nueva).
5. Preparar la app para ofrecerla a más personas: usuarios y PIN en la base, sesiones más cortas, encabezados de seguridad, repositorio privado y planes pagos de Vercel y GitHub.
