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

## Cierre de Sprint Refactor 1
* [x] **Sprint Refactor 1 Cerrado**: Completado con éxito en su totalidad y etiquetado con `cierre-sprint-refactor-1`.

## Sprint UX Vencimientos Inteligentes (Iniciado)
*   **Objetivo**: Diseñar y añadir alertas visuales de alta visibilidad para que Gustavo y Vane identifiquen consumos recurrentes o estimados que requieren confirmación de factura física (ej. Gas, Luz).
*   **Entregables Completados**:
    *   [x] **P1: UX badge revisar en vencimientos**: Inyección dinámica del borde izquierdo ámbar en la tarjeta (`borderLeft: "4px solid #f59e0b"`), fondo ámbar translúcido, glow sutil de alerta, badge `⚠️ Revisar` de alta visibilidad (con `fontSize: 10` y tooltip explicativo) y renderizado de `g.motivoRevision` de forma responsiva en la cabecera. Etiquetado con `estable-ux-vencimientos-revisar-p1`.

## Pendientes y Próximos Pasos (Sprint UX & Futuros)
*   **Próximos Pasos en Sprint UX**:
    *   [ ] **Traducción Humana de Motivos**: Mapear claves técnicas del sistema (ej. `REVISAR_MONTO`, `FALTA_FACTURA`) a descripciones de lenguaje natural legibles (ej. `"Confirmar importe"`, `"Falta factura del mes"`).
    *   [ ] **Resumen Ejecutivo Superior**: Diseñar y renderizar en la cabecera un widget sintetizado que alerte la cantidad total de vencimientos que requieren acción antes de procesar el pago.
*   **Pendientes a largo plazo (Futuros Sprints)**:
    *   [ ] **Cargar Premium Asistido**: Facilitar la carga inteligente y guiada.
    *   [ ] **Seguridad y Backups**: Estrategias automatizadas de resguardo de datos locales y Neon.
    *   [ ] **Cierre técnico de deuda sensible**: Refactorización profunda de componentes core (`App.jsx`) solo bajo una fase de testing automatizado e integral con QA dedicado.

## Checklist por Microfase
* [ ] **Fase de Análisis**: Modo *Analyze only* con propuesta detallada que no toque zonas prohibidas.
* [ ] **Aprobación**: Detalle de dependencias, riesgos, plan de pruebas y rollback antes de implementar.
* [ ] **Implementación acotada**: Cambios quirúrgicos mínimos.
* [ ] **Revisión de Diff**: Ejecutar `git diff` para validar líneas afectadas.
* [ ] **Compilación**: Ejecutar `npm run build` sin errores de bundle.
* [ ] **QA Visual**: Pruebas en el navegador local si aplica.
* [ ] **Commit**: Con mensaje descriptivo y tag si la fase toca vistas o componentes importantes.
* [ ] **Git Status**: Dejar el árbol de trabajo completamente limpio.
