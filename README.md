# Mis Finanzas

App personal de finanzas para dos personas (Gustavo y Vane), instalable en el celular. Registra gastos, ingresos, sueldo y ahorros, con montos en pesos y dólares.

## Cómo está armada

| Parte | Tecnología | Dónde vive |
|---|---|---|
| Pantallas | React 18 + Vite 5 (app instalable con vite-plugin-pwa) | `src/` |
| Servidor | Funciones de Vercel | `api/` |
| Base de datos | PostgreSQL en Neon | proyecto `mis-finanzas` |
| Código y versiones | GitHub | `gtexido/mis-finanzas` |

Carpetas de `src/`: `components` y `views` (pantallas), `utils` (cálculos y fechas sin pantalla), `mappers` (traducen lo que responde el servidor), `services` (llamadas al servidor).

En `api/`, los archivos que empiezan con guion bajo son ayudantes compartidos (`_auth`, `_db`, `_validation`, `_http`, `_loginGuard`, `_savings`). Los demás son un endpoint cada uno.

## Entornos

- **Producción:** `mis-finanzas-tan.vercel.app`, con la base real (rama `production` de Neon).
- **Versiones de prueba:** Vercel crea una por cada pull request. Usan una copia de la base (rama `pruebas-vista-previa` de Neon), así que se puede probar sin tocar datos reales.

## Cómo se hace un cambio

1. Rama nueva y pull request hacia `main`.
2. Controles automáticos en GitHub. Son obligatorios *Sintaxis, compilación y lógica* y *Servidor sobre PostgreSQL de prueba*. *Pantallas* es informativo.
3. Probar en la versión de prueba del pull request.
4. Mezclar. Vercel publica en producción solo.

`main` está protegida: no admite cambios directos ni sin los controles obligatorios.

## Cómo correr los controles

```bash
npm ci
npm run check
```

`npm run check` corre la sintaxis de `api/`, la compilación y las pruebas de lógica. Las pruebas del servidor y de pantallas usan herramientas extra; se explican en `verificacion/LEEME.md`.

## Variables de entorno

Ver `.env.example`. Los valores reales viven solo en Vercel y nunca se suben al repositorio.

## Más información

- `ESTADO_ACTUAL.md`: estado, decisiones y próximos pasos.
- `docs/LOCAL_DEV.md`: desarrollo local.
- `sql/`: scripts de la base. `SQL_MIGRACION_BASE_V1.sql` ya está aplicado en producción.
- `docs/historial/` y `sql/historial/`: documentos de etapas anteriores, solo para consulta.
