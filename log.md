# Log de Desarrollo - Mis Finanzas

* **Stack**: React + Vite + Vercel Serverless + Neon PostgreSQL
* **Branch actual**: `refactor-appjsx-fase1`
* **Estado actual**: Refactor seguro de `App.jsx` por microfases
* **Último tag seguro**: `estable-refactor-fase15`

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

### 2026-05-29
* **Microfase 15**: Refactor helper getMesKey en vistas
* **Objetivo**: eliminar duplicados locales de getMesKey en DetalleView y VencimientosView reutilizando el helper centralizado de src/utils/dates.js.
* **Archivos modificados**:
  * src/components/DetalleView.jsx
  * src/components/VencimientosView.jsx
* **Validaciones**:
  * git status limpio
  * npm run build OK
  * Detalle validado visualmente
  * Vencimientos validado visualmente
  * Mes actual y meses históricos OK
  * Gustavo y Vane OK
  * Consola sin errores rojos
* **Estado final**:
  * Tag `estable-refactor-fase15` creado.
  * Sprint Refactor 1 completado a nivel de alcance de refactorización segura de helpers y selectores puros.

### 2026-05-29
* **Cierre Formal de Sprint Refactor 1**
* **Decisión Técnica**: No implementar Microfase 16. La única candidata técnicamente segura (unificación de constante `MESES` local en `VencimientosView.jsx`) aporta un beneficio marginal. Cualquier otro cambio colisiona con el código monetario (`guardarGasto`, `toARS_`, cotizaciones, desgloses, etc.), lo cual queda blindado por diseño.
* **Alcance Cerrado de Sprint Refactor 1**:
  * Extracción de helpers de catálogo: `conceptoDesdeGasto`
  * Extracción de categorización dinámica: `categoriaRealDesdeGasto`
  * Extracción de agrupación visual para desgloses: `metaGrupoDetalle`
  * Unificación de claves de revisión: `claveRevisionGasto`
  * Desduplicación y unificación del formateador de fechas históricas: `getNombreMesKey`
  * Centralización y limpieza de normalizaciones: `normalizarEtiquetaVisual` en `DetalleView`
  * Traslado e integración del formateador de notas: `getObservacionVisual` en `src/utils/formatters.js`
  * Remoción de duplicaciones locales de control temporal: `getMesKey` centralizado en vistas.
  * Documentación completa del proyecto: `log.md`, `ESTADO_ACTUAL.md`, `PLAN_REFACTOR.md`
* **Estado Final Certificado**:
  * Git clean / status limpio.
  * `npm run build` OK (bundle 100% libre de errores de compilación).
  * QA visual OK verificado en entorno local con Gustavo y Vane.
  * Tags seguros creados hasta `estable-refactor-fase15`.
  * Producción sin alterar.
* **Próximo Sprint Recomendado**:
  * **Sprint UX Vencimientos Inteligentes** → Enfocado en la incorporación del badge "Revisar" para consumos periódicos pendientes de confirmación.

### 2026-05-29
* **Sprint UX Vencimientos Inteligentes - Entregable P1**
* **Objetivo**: Mejorar la visibilidad de gastos pendientes de revisión (`g.requiereRevision === true`) en la lista de Vencimientos principal.
* **Archivos modificados**:
  * `src/components/VencimientosView.jsx`
* **Cambios realizados**:
  * Detección condicional de `requiereRevision` en el renderizado de tarjetas ordinarias del calendario.
  * Añadida prominencia visual: borde izquierdo ámbar (`borderLeft: "4px solid #f59e0b"`), fondo ámbar translúcido con brillo premium, y glow de sombreado de alerta.
  * Inyección del badge de advertencia `⚠️ Revisar` junto al título del concepto (con `fontSize: 10`, tooltip nativo `title` con la justificación y prevención de flex-shrink).
  * Renderizado del motivo descriptivo `g.motivoRevision` de forma responsiva y adaptada (elipsis horizontal) bajo el subtítulo de la tarjeta.
  * Cero modificaciones en lógica monetaria, desgloses, cotizaciones, base de datos Neon o guardados en `App.jsx`.
* **Validaciones**:
  * `git status` limpio.
  * `npm run build` exitoso (cero errores en empaquetado de producción).
  * QA visual validado localmente con Gustavo y Vane en mobile/desktop.
  * Consola de navegador sin advertencias o logs rojos.
* **Estado final**:
  * Rama actual: `feature-ux-vencimientos-inteligentes`
  * Commit estable: `67f7c5b`
  * Tag seguro creado: `estable-ux-vencimientos-revisar-p1`

### 2026-05-29
* **Sprint UX Vencimientos Inteligentes - Entregable P2**
* **Objetivo**: Traducción humana de motivos técnicos de revisión en la interfaz de Vencimientos.
* **Archivos modificados**:
  * `src/utils/formatters.js`
  * `src/components/VencimientosView.jsx`
* **Cambios realizados**:
  * Implementación del helper puro `getMotivoRevisionHumano` en `src/utils/formatters.js` para traducir claves crudas como `REVISAR_MONTO` y `COPIAR_ANTERIOR`.
  * Integración del helper en el calendario principal (`Grupo`) y en la lista de revisión inferior (`RevisionCard`), reemplazando la visualización técnica.
  * Añadida protección de fallback robusta que retorna siempre *"Revisar información"* ante valores nulos, vacíos o desconocidos.
  * Cero modificaciones en base de datos, APIs, lógica monetaria, cotizaciones o `guardarGasto`.
* **Validaciones**:
  * `git status` limpio (después de commit).
  * `npm run build` OK (bundle 100% exitoso).
  * QA visual OK verificado en entorno local con Gustavo.
* **Estado final**:
  * Rama actual: `feature-ux-vencimientos-motivos-humanos`
  * Commit estable: `8af8fa7 UX traducir motivos de revision en vencimientos`
  * Tag seguro creado: `estable-ux-vencimientos-motivos-p2`


