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
