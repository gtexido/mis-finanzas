# Versión premium: edición, informes y acceso personal

Versión preparada el 5 de octubre de 2026 en la rama `design/premium-sin-categoria-tipo`, PR #2. La rama principal no se reemplaza con esta entrega.

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
