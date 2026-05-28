# Log de Desarrollo - Mis Finanzas

* **Stack**: React + Vite + Vercel Serverless + Neon PostgreSQL
* **Branch actual**: `refactor-appjsx-fase1`
* **Estado actual**: Refactor seguro de `App.jsx` por microfases
* **Último tag seguro**: `estable-refactor-fase14`

## Registro de Avances

### 2026-05-25
* **Objetivo**: Reducir responsabilidad de `App.jsx` sin cambiar comportamiento funcional.
* **Reglas aplicadas**:
  * No tocar Cargar.
  * No tocar `guardarGasto`.
  * No tocar APIs/auth/base de datos.
  * No tocar cotizaciones ni lógica monetaria.
  * No modificar JSX.
  * Microfases pequeñas y acotadas.
  * Build y QA local antes de avanzar.
* **Microfases cerradas**:
  * `estable-refactor-fase8` → `conceptoDesdeGasto` (extracción y unificación pura).
  * `estable-refactor-fase9` → `categoriaRealDesdeGasto` (extracción y wrapper local).
  * `estable-refactor-fase10` → `metaGrupoDetalle` (extracción y wrapper local).
  * `estable-refactor-fase11` → `claveRevisionGasto` (extracción pura y unificación en VencimientosView).
  * `estable-refactor-fase12` → `getNombreMesKey` (extracción pura y reutilización en VencimientosView y DetalleView).
  * `estable-refactor-fase13` → `normalizarEtiquetaVisual` (limpieza de duplicados locales en DetalleView reutilizando el helper central).
* **Estado final**:
  * Git clean.
  * `npm run build` OK.
  * QA visual local OK con Gustavo y Vane.
  * Consola de navegador sin errores rojos.

### 2026-05-28
* **Microfase 14**: Refactor helper getObservacionVisual
* **Objetivo**: mover el helper visual `getObservacionVisual` desde `src/components/DetalleView.jsx` hacia `src/utils/formatters.js`.
* **Archivos modificados**:
  * `src/components/DetalleView.jsx`
  * `src/utils/formatters.js`
* **Validaciones**:
  * git status limpio
  * `npm run build` OK
  * Detalle validado visualmente
  * Observaciones con ícono/color/texto/fondo/borde OK
  * Búsqueda/filtros OK
  * Gustavo y Vane OK
* **Estado final**:
  * Tag `estable-refactor-fase14` creado
  * Listo para continuar con Microfase 15 en modo *Analyze only*

