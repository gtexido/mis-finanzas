# Versión premium: ahorros, panorama y acceso personal

Entrega iniciada el 5 de octubre y actualizada el 10 de octubre de 2026 en la rama `design/premium-sin-categoria-tipo`, PR #2. La rama principal no se reemplaza con esta entrega.

## Qué cambia

- Gastos: botones visibles Editar y Eliminar; también se puede borrar desde la edición. Confirmación con concepto, importe y mes. Los demás meses no se eliminan.
- Ingresos extra: alta, edición y eliminación. Se conservan los nombres de fuentes personalizados. El sueldo del mes se puede actualizar y eliminar.
- Débito automático: casilla explícita, independiente del estado pagado; insignia en movimientos, filtro y listado en Ajustes. Marcar esta casilla no da de alta una adhesión en el banco.
- Vencimientos: manual vencido/hoy en rojo, próximos tres días en ámbar, datos por revisar en azul, pagados en verde. Débitos cuya fecha llegó piden verificar el cobro. Las fechas estimadas de copias no se presentan como vencimientos confirmados.
- Informes e ingresos: diferencia en pesos y porcentaje frente al mes anterior; comparación por concepto y por medio de pago. Sin registros previos o con base cero se aclara la ausencia de comparación. Se avisa cuando el mes está en curso. Los importes conservan centavos si existen.
- Replicar: se pueden completar meses parcialmente cargados. Se preseleccionan recurrentes y débitos, se puede elegir el resto. Se compara concepto, cuenta, instrumento y moneda para omitir coincidencias ya cargadas, conservando multiplicidad. Cada copia queda pendiente, con importe y fecha por confirmar. Se ajustan días a la duración del siguiente mes; se mantienen desgloses y la indicación de débito automático.
- Errores: bloqueo de doble guardado, borrador conservado ante fallo, eliminación reintentable y distinción entre fallo de escritura y fallo al refrescar.
- Datos en pantalla: se limpian al terminar la sesión y al cambiar de usuario. No se guardan los movimientos financieros en localStorage. Las sugerencias de fuentes y la cotización elegida son preferencias locales separadas por usuario.

## Cómo ingresar

El acceso pide **Usuario** y **Clave personal**, sin publicar una lista de personas.

| Cuenta existente | Usuario que se escribe | Clave |
| --- | --- | --- |
| Gustavo | `gustavo` | La configurada en `MF_PIN_GUSTAVO` |
| Vane | `vane` | La configurada en `MF_PIN_VANE` |

Se aceptan también los identificadores anteriores `usr_gustavo` y `usr_vane`. Las variables de Preview pueden tener claves diferentes de Production. Las claves no están incluidas en el repositorio. No se cambian las credenciales de las cuentas existentes en esta entrega.

Los movimientos se consultan y modifican por usuario y espacio. Una membresía inactiva o un usuario sin espacio activo no recibe acceso al espacio predeterminado. Los catálogos pueden compartirse dentro de un espacio; para personas independientes se debe provisionar un espacio separado. La app elige el primer espacio activo priorizando el rol owner; no incorpora selector de espacios.

## Habilitar otra persona

El acceso sigue siendo privado y administrado. Esta entrega no incorpora registro público, recuperación por correo ni un panel de administración de cuentas.

1. El administrador crea o verifica el usuario y su espacio en Neon, con una membresía activa en `workspace_usuarios`. Las columnas obligatorias y claves foráneas del esquema real deben respetarse. No se ejecutó una migración ni se crearon usuarios reales como parte de esta entrega.
2. En Vercel, agrega una variable secreta `MF_PIN_PERSONA` con la clave personal elegida, sin prefijo `VITE_`.
3. Agrega esa cuenta al JSON de `MF_AUTH_USERS`, por ejemplo:

```json
[{"usuarioId":"usr_persona","login":"persona","nombre":"Nombre visible","pinEnv":"MF_PIN_PERSONA","activo":true}]
```

Este ejemplo es solo configuración de identificación; no contiene una clave. Los identificadores y nombres de login deben ser únicos. Se pueden incluir Gustavo o Vane en el JSON para personalizar o deshabilitar esas cuentas; la entrada reemplaza la predeterminada por `usuarioId`.

4. Aplica las variables al entorno correcto y vuelve a desplegar. Verifica el ingreso y el aislamiento entre cuentas sobre Neon de pruebas. Los usuarios adicionales no se asignan a la fuente histórica de Vane; usan fuente nula y el nombre visible en `concepto_manual`, compatible con el tratamiento nullable de los gastos.

Para revocar acceso, desactiva la membresía en Neon, o configura `activo:false` en `MF_AUTH_USERS` y vuelve a desplegar. El backend vuelve a comprobar usuario habilitado y membresía en cada petición protegida. Las sesiones firmadas duran hasta 30 días; cambiar una clave por sí solo no revoca sesiones ya emitidas. Cambiar `MF_AUTH_SECRET` termina todas las sesiones.

## Verificación ejecutada

- Compilación de producción `npm run build`: correcta.
- 21 escenarios de API/cálculos: correctos, ejecutados en PostgreSQL embebido con esquema y datos ficticios. Incluyen transacciones con rollback, ARS/USD/desglose, fechas inválidas, CRUD de ingresos, sueldo por mes, acceso por usuario/espacio, tercer usuario y revocación.
- 17 escenarios de navegador: correctos, con API simulada. Incluyen 8 vistas a 320, 390 y 1280 px, CRUD, reintentos, error de refresco, comparaciones, login/logout, copia parcial, fin de mes y exportación.
- Sin escrituras en Neon real ni movimientos de prueba en cuentas reales.
- Se conservan 12 funciones públicas en Vercel; PUT de ingresos y DELETE de sueldo reutilizan endpoints existentes.

Comandos de pruebas (Playwright, Chromium y PGlite deben estar disponibles en el entorno de QA):

```bash
npm run build
QA_PGLITE_MODULE=/ruta/pglite/dist/index.js node --experimental-vm-modules verificacion/pruebas/api-postgres.mjs .
node verificacion/pruebas/release.cjs
```

`release.cjs` admite `AUDIT_PROJECT`, `AUDIT_OUTPUT`, `AUDIT_CHROMIUM_MODULE` y `AUDIT_BROWSER_EXECUTABLE`. Las capturas se generan localmente; no se publican capturas ni datos de cuentas en este repositorio.

## Publicación y límites de la comprobación

La rama genera una Preview de Vercel para revisión; el PR #2 reúne el cambio que se puede integrar en `main`. Mantener las variables del entorno y los respaldos descritos en `GUIA_RESPALDO_Y_PUBLICACION.md`.

No hacen falta columnas nuevas para edición, comparación o débito automático. El catálogo del espacio debe incluir un instrumento de débito automático. Si falta, la casilla lo indica y no envía un identificador inventado.

Las pruebas locales no sustituyen una prueba contra el esquema y las variables reales de Preview. No se han inspeccionado secretos, verificado claves reales ni comprobado que `DATABASE_URL` de Preview apunte a una rama de pruebas. Antes de hacer cargas o borrados de prueba desde esa Preview, el administrador debe comprobar esa configuración.

La copia reconsulta el destino y omite coincidencias antes de guardar. No es una transacción de lote entre dispositivos: si dos personas/sesiones copian a la vez, puede haber una carrera. Si se interrumpe la conexión, se informa el avance conocido y se vuelve a consultar al reintentar. La eliminación es definitiva, con confirmación previa; no hay papelera. Los avisos son visuales dentro de la app, no notificaciones push. Los informes comparan lo registrado y no verifican por sí mismos que un mes esté completo.


## Panorama al abrir la app · 9 de octubre de 2026

El inicio muestra primero el balance del mes, ingresos y gastos, con una barra de proporción gastada. Si faltan ingresos, propone cargarlos; si los gastos los superan, explica la diferencia. El pendiente del mes ya está incluido en el gasto total y no se resta por segunda vez.

Debajo aparecen cuatro accesos con cantidad, importe, texto e ícono: **Vencidos y hoy**, **Próximos 3 días**, **Verificar débitos** y **Por revisar**. Estos avisos recorren todos los meses, aunque el usuario consulte un balance histórico. Cada tarjeta abre su filtro exacto en Vencimientos; el pendiente mensual abre el alcance del mes elegido. El próximo pago con fecha confirmada puede abrirse y editarse incluso si pertenece a otro mes.

Los avisos cuentan cada registro una sola vez. Se priorizan vencimiento y débito alcanzado, luego los próximos tres días, luego revisión de importe. Una fecha ausente, inválida o estimada siempre pide revisión. Los pagados por revisar son accesibles sin sumarse al total de deuda ni mostrar una acción para volver a pagarlos. Vencimientos permite ver todos los registros, cambiar el alcance y limpiar un filtro vacío.

Los avisos se actualizan al cambiar el día y al volver a la app. Esto recalcula fechas sobre los registros cargados; no incorpora sincronización en vivo entre dispositivos ni notificaciones fuera de la app.

Validación de esta actualización:

- Build de producción correcto.
- 8 escenarios de cálculos: períodos cruzados, prioridad sin duplicados, débitos, pagados por revisar, ARS/USD/desglose, fechas inválidas, cambio de mes y vacíos.
- 24 escenarios de navegador con API simulada, incluidos los 17 recorridos de la entrega anterior. Ocho vistas a 320, 390 y 1280 px, sin desbordes ni errores. Los cuatro avisos quedan completos antes de la navegación inferior a 390 × 844; el espacio visible varía según pantalla y tamaño de texto.
- 32 escenarios aprobados en esta ejecución. Los 21 escenarios de API de la entrega anterior permanecen documentados arriba y no se volvieron a ejecutar: no cambian endpoints ni consultas.
- Estado de pruebas en `verificacion/panorama/resultados.json`; capturas locales no publicadas.

Para los cálculos: `node verificacion/pruebas/overview.mjs`. Para navegador se mantiene el comando y las opciones de `release.cjs`. No requiere cambios de esquema ni de variables del entorno.

## Próxima acción, aumentos y duplicados · 10 de octubre de 2026

El inicio propone la próxima acción según los registros: primero pagos vencidos o de hoy y débitos por verificar, luego los próximos tres días y después las revisiones pendientes. Cada propuesta abre el filtro correspondiente. Si no hay tareas, no se muestra una urgencia ficticia.

La sección de aumentos compara gastos habituales del mes con el anterior. Muestra diferencia de importe, porcentaje y ambos valores, y permite abrir el gasto. Solo compara una carga confirmada de cada mes para el mismo concepto, cuenta y moneda original; excluye importes por revisar, múltiples cargos ambiguos, desgloses mixtos y bases cero. Una variación de cotización no se presenta como aumento del servicio. El aviso describe lo registrado, no confirma un cambio de tarifa.

Antes de guardar un gasto, se vuelven a consultar los registros del mes. Una coincidencia de concepto, cuenta, importes en sus monedas originales y día de carga o vencimiento confirmado abre una revisión: ver el gasto existente, volver al formulario o guardar otro gasto. Cancelar conserva el borrador. Un fallo de lectura impide la escritura y permite reintentar. Cerrar la sesión cancela una revisión pendiente. La opción predeterminada es crear un movimiento nuevo; sumar al anterior requiere elegirlo expresamente y esa elección se reinicia al cambiar de concepto.

Este control advierte sobre posibles duplicados y permite cargas repetidas legítimas. No garantiza unicidad entre dos guardados simultáneos desde distintos dispositivos: no incorpora bloqueo ni transacción distribuida.

El botón del ojo permite ocultar importes, porcentajes y proporciones **solo en Inicio**, incluidos los textos accesibles de los avisos. Conserva cantidades de tareas y recuerda la preferencia por usuario en este navegador. La preferencia es un booleano local; no guarda movimientos ni importes. Las demás pantallas y los diálogos siguen mostrando sus valores.

Validación de esta actualización:

- Build de producción correcto.
- 31 escenarios de navegador con API simulada, incluidos los 24 anteriores y siete nuevos para próxima acción, aumentos, privacidad por usuario, duplicados, reconsulta antes de guardar, carga separada y cierre de sesión durante una revisión.
- 16 escenarios de cálculos: ocho del panorama anterior y ocho nuevos para coincidencias, monedas originales, aumentos y prioridad de acciones.
- **47 escenarios aprobados en esta ejecución**, con datos ficticios y sin escrituras en cuentas reales.
- No se modifican endpoints, consultas del backend ni esquema. Los 21 escenarios de API de la entrega inicial no se volvieron a ejecutar.
- Estado de pruebas en `verificacion/avisos/resultados.json`; capturas locales no publicadas en el repositorio.

Para los nuevos cálculos: `node verificacion/pruebas/smart-hints.mjs`. Se conservan los comandos anteriores para panorama, navegador y compilación.


## Ahorros y claridad visual · 10 de octubre de 2026

Acceso desde **Cargar → Ahorro**, **Movimientos → Ahorros** o la tarjeta **Tu ahorro** en Inicio. Se conservan los cinco destinos de navegación y no se reincorporan campos de categoría o tipo.

| Registro | Disponible del mes | Ahorro acumulado | Ingresos y gastos |
| --- | --- | --- | --- |
| Apartar ahorro | Disminuye | Aumenta | No cambia |
| Retirar ahorro | Aumenta | Disminuye | No cambia |
| Ahorro que ya tenía | No cambia | Aumenta | No cambia |

El disponible muestra ingresos menos gastos registrados, menos aportes y más retiros del período elegido. Los pendientes ya están incluidos en gastos. Es un cálculo mensual sobre lo registrado, no el saldo bancario. El ahorro acumulado incluye meses anteriores hasta el cierre del período elegido o hasta hoy, lo que ocurra primero.

Pesos y dólares se conservan por separado. Para aportes y retiros en USD se pide la cotización usada en esa operación y se guarda su equivalente en pesos. No se recalculan por la cotización global de tarjetas. El saldo inicial no requiere cotización y no genera ingresos artificiales. Cada registro permite indicar dónde se guarda el dinero y un objetivo opcional. Registrar una operación no ejecuta una transferencia bancaria.

Para corregir un ahorro cargado como gasto: abrir **Movimientos → Más opciones → Convertir en ahorro**. Requiere un gasto pagado, confirmado y en una sola moneda; solicita destino y confirmación explícita. Archiva el gasto original conservando su detalle y crea el aporte en una sola operación atómica. El importe y la fecha del origen no se cambian durante la conversión. En USD se usa la cotización confirmada para el nuevo aporte. La eliminación posterior del ahorro no reactiva automáticamente el gasto.

Los ahorros se pueden editar y eliminar con confirmación. No se permiten retiros sin fondos ni modificaciones o borrados que dejen un retiro histórico sin respaldo. Se validan importes, centavos, moneda, fecha real no futura y un saldo inicial por destino/objetivo/moneda. Cada registro tiene versión para detectar modificaciones simultáneas; el libro del usuario se guarda con control de revisión. Los reintentos de creación usan la misma clave y no duplican operaciones. Los errores conservan el formulario.

El acceso requiere sesión válida y membresía activa; todos los libros están delimitados por usuario y espacio. Al cerrar sesión se descartan saldos y borradores. La copia JSON incluye los ahorros activos de todos los meses. La preferencia para ocultar importes del Inicio también cubre Ahorros.

### Base y despliegue

Se añade únicamente la tabla independiente `ahorro_libros` (JSONB, una fila versionada por usuario y espacio). Se inicializa de forma idempotente en el primer acceso autenticado a Ahorros. No se cambia la estructura ni los valores admitidos por la tabla existente de movimientos. El rol de base necesita permiso para crear la nueva tabla; si el rol está restringido, el administrador debe provisionarla usando la definición de `api/_savings.js`.

La función se publica dentro de `/api/movimientos?recurso=ahorros` con GET, POST, PUT y DELETE, conservando las doce funciones públicas de Vercel. Las consultas previas de movimientos mantienen su funcionamiento. Las ediciones y eliminaciones de gastos bloquean y verifican el origen activo, para preservar gastos archivados por una conversión aunque haya una pantalla antigua abierta.

No se conectó la prueba a Neon real ni se usaron claves personales. La inicialización y las restricciones de la base real deben verificarse al acceder desde una cuenta autorizada. El despliegue de código no confirma por sí solo esos permisos.

### Diseño e informes

- Disponible e ingresos en verde; pendiente en ámbar; vencidos en coral; acciones en violeta. Siempre acompañados de texto o ícono.
- Tarjeta de ahorro acumulado en Inicio, con acceso a sus movimientos. Los tres mayores conceptos quedan desplegables para mantener el resumen corto.
- Vencimientos con una indicación concreta: vencido, vence mañana, débito por verificar o dato que falta confirmar. Se elimina la repetición de insignias de revisión.
- Evolución diferencia **Primera carga** de **Reaparece**, consultando el historial cargado. Cada concepto expande sus importes mensuales sin repetir tarjetas de antes/actual. Las ausencias son «Sin registro» y no se califican automáticamente como ahorro.
- Una variación de cero se muestra neutral; el aviso de mes parcial queda visible.

### Validación de Ahorros

Resultados de la ejecución en `verificacion/ahorros/resultados.json`. Las capturas se revisan localmente y no se suben al repositorio. Las pruebas usan registros ficticios; no acreditan operaciones sobre cuentas reales.

- Compilación de producción correcta.
- **90 escenarios aprobados**: 35 de API y cálculos con PostgreSQL embebido, 39 de navegador con API simulada y 16 de cálculos de panorama/avisos.
- Incluye inicialización, aislamiento entre usuarios, retiros concurrentes, versiones, reintentos, conversión atómica con rollback real y protección del origen archivado; además de los recorridos anteriores de gastos, ingresos, réplica y login.
- Nueve vistas a 320, 390 y 1280 px sin desbordes; formulario en dólares comprobado a 320 px. Capturas de Inicio, Ahorros y Evolución revisadas.


## Campo de importe en Ingresos · 10 de octubre de 2026

Se corrige el campo de nuevo importe del sueldo, que podía quedar comprimido por el ancho del botón Actualizar. El importe ocupa ahora toda la tarjeta y el botón queda debajo. Los importes de sueldo y de otros ingresos tienen mayor altura y tipografía para facilitar la carga desde el celular. La corrección es de presentación y no cambia cálculos ni guardado.

Validación: build correcto; recorridos existentes UI-02, UI-04 y UI-05 aprobados con API simulada. Campos revisados visualmente a 320 y 390 px, y distribución comprobada también a 1280 px.
