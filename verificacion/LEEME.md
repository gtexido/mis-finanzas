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

## Estado de las pruebas de pantallas en GitHub (2026-10-29)

Corren en cada pedido de cambio como control informativo (no bloquean). En la corrida de hoy pasaron 8 de 16 escenarios.

Motivos de los 8 que fallan, leídos de la salida de GitHub:
- UI-02, UI-05 y UI-09 leen `gapp_v7` de localStorage. La app actual borra esa clave a propósito (los datos viven en el servidor), así que esas pruebas quedaron desactualizadas.
- UI-14 espera el acceso visible antes del menú inferior y la pantalla cambió.
- UI-07, UI-10, UI-12 y UI-15 esperan elementos que ya no se encuentran con esos nombres (tiempo agotado o aserción falsa). No se verificó caso por caso si es la prueba o la app.

Decisión: no reescribirlas ahora, porque Cargar y Ajustes se van a rediseñar. Después del rediseño se reemplazan por pruebas de humo (entrar, ver el mes, cargar un gasto, marcar un pago) y recién entonces el control pasa a ser obligatorio.
