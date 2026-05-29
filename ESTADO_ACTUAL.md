# Estado Actual - Mis Finanzas

* **Carpeta correcta**: `C:\mis-finanzas\mis-finanzas-backup-antes-ajuste`
* **Branch**: `feature-ux-vencimientos-inteligentes`
* **Último commit estable**: `67f7c5b UX badge revisar en vencimientos`
* **Último tag seguro**: `estable-ux-vencimientos-revisar-p1`

## Estado de la Aplicación
* **Git**: Limpio (`git status` sin cambios pendientes).
* **Compilación**: Vite Build exitoso (`npm run build` OK).
* **QA Visual**: Verificado localmente con Gustavo y Vane (OK).
* **Consola navegador**: Sin errores rojos ni warnings bloqueantes.
* **Producción**: Intacta y sin riesgos.

## Historial de Sprints
* **Sprint Refactor 1**: Completado con éxito y cerrado bajo el tag `cierre-sprint-refactor-1` (Fases 8-15).
* **Sprint UX Vencimientos Inteligentes**: **Iniciado**. Entregable **P1: UX badge revisar en vencimientos** completado y validado en producción local con éxito.

## Cambios del Entregable P1 (UX Vencimientos)
*   **Visibilidad**: Detección inteligente de `g.requiereRevision === true` en la lista principal de vencimientos.
*   **Aparición visual destacado**: Tarjetas con borde izquierdo ámbar (`borderLeft: "4px solid #f59e0b"`), fondo ámbar translúcido y glow sutil.
*   **Badge Prominente**: Añadido badge `⚠️ Revisar` junto al título del servicio con tooltip descriptivo.
*   **Detalle Descriptivo**: Renderizado automático de `g.motivoRevision` (si existe) en el cuerpo de la tarjeta para evitar ingresos a ciegas.
*   **Aislamiento y Seguridad**: Cero impacto en lógica de persistencia (`guardarGasto`), cotizaciones, red, base Neon o desgloses monetarios.

## Restricciones Vigentes
* 🚫 **No tocar Cargar**: Excluir todo formulario o carga inicial interactiva de gastos/ingresos.
* 🚫 **No tocar `guardarGasto`**: Blindar la función central de guardado y persistencia.
* 🚫 **No tocar APIs/Auth/Base de datos**: Mantener aislado el flujo de red, autenticación y base Neon.
* 🚫 **No tocar cotizaciones ni tipo de cambio (USD/ARS)**: Evitar cualquier lógica monetaria o de conversión.
* 🚫 **No tocar cálculo de payload ni validaciones**: Impedir modificaciones en la estructura de datos que se guarda.
* 🚫 **No modificar JSX sin QA dedicado**: Limitar los cambios que alteren la UI interactiva a menos que estén validados en el diseño del sprint UX.
