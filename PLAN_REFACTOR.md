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
* [x] **Helpers de gastos**: `gastoTieneDesglose`, `tieneSubconceptosValidos`, `obtenerMedioPagoComparable`, `conceptoDesdeGasto`.
* [x] **Helpers de categorías**: `categoriaRealDesdeGasto` (con su correspondiente wrapper local).
* [x] **Helpers de vencimientos**: `claveRevisionGasto`, `metaGrupoDetalle`.
* [x] **Helpers de fechas visuales**: `getNombreMesKey` (reutilizado en Vencimientos y Detalle).
* [x] **Limpieza duplicada en vistas**: Remoción de `normalizarEtiquetaVisual` local en `DetalleView` reutilizando el helper centralizado.

## Pendientes y Próximos Pasos
* **Microfase 14**: Detección y propuesta del próximo helper puro o selector visual en modo *Analyze only*.
* **Modularización progresiva**: Evaluar la extracción de selectores más grandes que no comprometan la lógica monetaria.
* **Cargar Premium Asistido**: (Planificado para etapas posteriores).
* **Badge visual**: Badge dinámico para gastos pendientes de revisión en la vista de Vencimientos (Planificado para etapas posteriores).

## Checklist por Microfase
* [ ] **Fase de Análisis**: Modo *Analyze only* con propuesta detallada que no toque zonas prohibidas.
* [ ] **Aprobación**: Detalle de dependencias, riesgos, plan de pruebas y rollback antes de implementar.
* [ ] **Implementación acotada**: Cambios quirúrgicos mínimos.
* [ ] **Revisión de Diff**: Ejecutar `git diff` para validar líneas afectadas.
* [ ] **Compilación**: Ejecutar `npm run build` sin errores de bundle.
* [ ] **QA Visual**: Pruebas en el navegador local si aplica.
* [ ] **Commit**: Con mensaje descriptivo y tag si la fase toca vistas o componentes importantes.
* [ ] **Git Status**: Dejar el árbol de trabajo completamente limpio.
