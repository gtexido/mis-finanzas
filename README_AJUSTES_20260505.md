# Mis Finanzas - Ajustes críticos 2026-05-05

## Qué incluye este paquete

- Estructura corregida para Vite/Vercel:
  - `/api` para funciones serverless.
  - `/src` para React.
  - `/public` para íconos.
- `vercel.json` para evitar 404 al recargar rutas internas.
- Fix de período dinámico en `src/services/api.js`.
- Fix de período dinámico en `src/mappers/movimientosMapper.js`.
- Limpieza de delete legacy `subconceptos_usd` en `api/gastos-delete.js`.
- Auth agregada al GET de `api/cotizaciones.js`.
- Filtros correctos `activa`/`activo` en `api/catalogos.js`.
- Reorden de workspace en `api/ingresos.js`.
- SQL seguro de saneamiento en `SQL_NEON_FIXES.sql`.

## Orden de aplicación

1. Copiar esta carpeta sobre el proyecto local real.
2. Ejecutar `npm install` si no existe `node_modules`.
3. Ejecutar `npm run build`.
4. Correr en Neon `SQL_NEON_FIXES.sql`, pero revisando cada SELECT antes de los UPDATE.
5. Probar Preview en Vercel.
6. Recién después promover a Production.

## Pruebas mínimas

- Login Gustavo y Vane.
- Ver mayo 2026 con datos correctos.
- Cargar gasto ARS.
- Cargar gasto USD.
- Borrar gasto sin error.
- Editar gasto.
- Marcar vencimiento como pagado.
- Vane no ve gastos de Gustavo.
- Gustavo no ve gastos de Vane.
- Recargar una ruta interna y confirmar que no da 404.

## Nota de validación

En este entorno no se pudo ejecutar `npm run build` porque no estaba instalado `vite` localmente. Sí se validó sintaxis JS de archivos API, services, mappers y utils con `node --check`.
