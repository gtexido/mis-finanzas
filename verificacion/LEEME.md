# Verificación local de las correcciones

Datos ficticios. No hay conexiones a Neon, GitHub ni Vercel. Los resultados no certifican el esquema o las credenciales de la base real.

- `pruebas/navegador.cjs`: Chromium móvil 390×844, API interceptada, conexiones externas bloqueadas y fecha fija 2026-10-01. Diez escenarios de comportamiento, incluyendo ARS y USD.
- `pruebas/api-postgres.mjs`: handlers reales, SQL sobre PostgreSQL embebido PGlite, esquema sintético con restricciones, diez escenarios API y uno de cálculos. Sustituye el transporte HTTP de Neon por un adaptador local de consultas diferidas y transacciones. Incluye fallos provocados en alta, edición y borrado y una violación real de clave foránea.
- `evidencias/`: resultados JSON, exportación ficticia y capturas. La ausencia de algunos emojis/fuentes en capturas corresponde al entorno de pruebas.

Para repetir en una computadora: ejecutar `npm ci` en el proyecto; instalar `playwright` y `@electric-sql/pglite` como dependencias **de este directorio de pruebas** (`npm install --no-save --package-lock=false playwright @electric-sql/pglite`) y después `npx playwright install chromium`. No se agregaron estas herramientas a las dependencias productivas de la app.

En una terminal Bash, ajustando la ruta:

```bash
AUDIT_PROJECT=/ruta/al/proyecto node pruebas/navegador.cjs
node --experimental-vm-modules pruebas/api-postgres.mjs /ruta/al/proyecto
```

Opciones para entornos especializados: `AUDIT_CHROMIUM_MODULE` y `AUDIT_BROWSER_EXECUTABLE` permiten usar un Chromium empaquetado. `QA_PGLITE_MODULE` permite resolver PGlite desde otra instalación. `AUDIT_ONLY=UI-01` selecciona un escenario. El resultado JSON de cada ejecución reemplaza el anterior.

El frontend Vite se inicia dentro del proceso de prueba, en 127.0.0.1:4173. Las pruebas de API usan el esquema definido en el propio script, no migraciones de producción.

## Estado de las pruebas de pantallas en GitHub (2026-10-30)

Corren en cada pedido de cambio como control informativo (no bloquean). En la última corrida pasaron 14 de 16 escenarios.

Se actualizaron UI-02, UI-05, UI-07, UI-09, UI-14 y UI-15 a la app actual: ya no leen `gapp_v7` (los datos viven en el servidor), llegan a Replicar desde Movimientos y usan los textos vigentes. UI-09 comprueba que la copia al mes siguiente guarda una sola vez, con el mes, el concepto y el vencimiento trasladado.

Quedan dos pendientes:
- UI-10 (carga libre) depende de los nombres de campos de Cargar, que se va a rediseñar.
- UI-12 (Evolución y próximo pago) busca clases y textos que cambiaron en Evolución y Vencimientos.

Decisión: reemplazarlas por pruebas de humo después del rediseño (entrar, ver el mes, cargar un gasto, marcar un pago) y recién entonces el control pasa a ser obligatorio.
