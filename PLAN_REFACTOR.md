# Plan de Refactorización - Mis Finanzas

## Objetivo General
Reducir la complejidad y tamaño de `App.jsx` de forma progresiva hasta convertirlo en un componente orquestador limpio, delegando la lógica de cálculo, formateo y visualización a utilidades y vistas especializadas.

## Estrategia de Trabajo
1. **Extraer helpers puros**: Identificar funciones puras que no manejen estado o closures de React.
2. **Extraer selectors**: Modularizar funciones de filtrado y mapeo de datos complejos.
3. **Limpiar duplicados**: Eliminar réplicas idénticas de funciones en componentes secundarios y centralizarlas en utilidades comunes.
4. **Wrappers locales**: Mantener envoltorios mínimos en `App.jsx` cuando esto minimice drásticamente el riesgo de cambiar firmas o contratos de propiedades (*props*) en componentes hijos.
5. **Validación estricta**: Compilar mediante Vite (`npm run build`) y realizar QA visual en cada paso.

## Fases Completadas
* [x] **Helpers de gastos**: `gastoTieneDesglose`, `tieneSubconceptosValidos`, `obtenerMedioPagoComparable`, `conceptoDesdeGasto` (Fases 1-8).
* [x] **Helpers de categorías**: `categoriaRealDesdeGasto` (con su correspondiente wrapper local - Fase 9).
* [x] **Helpers de vencimientos**: `claveRevisionGasto` (Fase 11), `metaGrupoDetalle` (Fase 10).
* [x] **Helpers de fechas visuales**: `getNombreMesKey` (reutilizado en Vencimientos y Detalle - Fase 12).
* [x] **Limpieza duplicada en vistas**: Remoción de `normalizarEtiquetaVisual` local en `DetalleView` (Fase 13).
* [x] **Microfase 14**: Refactor del helper visual `getObservacionVisual` trasladándolo a `src/utils/formatters.js`.
* [x] **Microfase 15**: Eliminación del helper local `getMesKey` duplicado en views centralizándolo en `src/utils/dates.js`.

## Cierre de Sprint Refactor 1 (Decisión de Diseño)
Se descarta la implementación de una **Microfase 16** técnica de refactorización de código. La única candidata segura y sin impacto era la unificación de la constante local `MESES` en `VencimientosView.jsx`, la cual posee un valor técnico marginal. Cualquier otro refactor en `App.jsx` colisionaría con lógica monetaria, desgloses, cotizaciones y persistencia (`guardarGasto`), lo cual supera el alcance permitido para mantener el código blindado. **Sprint Refactor 1 cerrado formal y exitosamente.**

## Pendientes y Próximos Pasos (Nuevo Sprint Recomendado)
* **Sprint UX Vencimientos Inteligentes**:
  * **Objetivo**: Diseñar y añadir un badge visual llamativo e intuitivo de **"Revisar"** en la vista de Vencimientos para alertar sobre gastos que requieren confirmación manual (por ejemplo, facturas de Gas u otros servicios variables).
* **Pendientes a largo plazo (Futuros Sprints)**:
  * **Cargar Premium Asistido**: Facilitar la carga inteligente guiada de movimientos.
  * **Seguridad y Backups**: Estrategias automatizadas de resguardo de datos locales y Neon.
  * **Cierre técnico de deuda sensible**: Refactorización profunda de componentes core (`App.jsx` orquestador) solo bajo una fase de testing automatizado y QA 100% dedicado.

## Checklist por Microfase
* [ ] **Fase de Análisis**: Modo *Analyze only* con propuesta detallada que no toque zonas prohibidas.
* [ ] **Aprobación**: Detalle de dependencias, riesgos, plan de pruebas y rollback antes de implementar.
* [ ] **Implementación acotada**: Cambios quirúrgicos mínimos.
* [ ] **Revisión de Diff**: Ejecutar `git diff` para validar líneas afectadas.
* [ ] **Compilación**: Ejecutar `npm run build` sin errores de bundle.
* [ ] **QA Visual**: Pruebas en el navegador local si aplica.
* [ ] **Commit**: Con mensaje descriptivo y tag si la fase toca vistas o componentes importantes.
* [ ] **Git Status**: Dejar el árbol de trabajo completamente limpio.
