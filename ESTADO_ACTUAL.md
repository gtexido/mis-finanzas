# Estado Actual - Mis Finanzas

* **Carpeta correcta**: `C:\mis-finanzas\mis-finanzas-backup-antes-ajuste`
* **Branch**: `feature-ux-vencimientos-motivos-humanos`
* **Último commit estable**: `8af8fa7 UX traducir motivos de revision en vencimientos`
* **Último tag seguro**: `estable-ux-vencimientos-motivos-p2`

## Estado de la Aplicación
* **Git**: Limpio (`git status` sin cambios pendientes).
* **Compilación**: Vite Build exitoso (`npm run build` OK).
* **QA Visual**: Verificado localmente con Gustavo y Vane (OK).
* **Consola navegador**: Sin errores rojos ni warnings bloqueantes.
* **Producción**: P1 en producción. P2 validado en entorno local.

## Historial de Sprints
* **Sprint Refactor 1**: Completado con éxito y cerrado bajo el tag `cierre-sprint-refactor-1`.
* **Sprint UX Vencimientos Inteligentes**: **Iniciado**. 
  * Entregable **P1: UX badge revisar en vencimientos** en producción (`prod-candidato-ux-vencimientos-revisar-p1`).
  * Entregable **P2: Traducción humana de motivos técnicos de revisión** completado y validado localmente (`estable-ux-vencimientos-motivos-p2`).

## Cambios del Entregable P2 (Traducción de Motivos)
*   **Traducción de Claves**: Mapeo asociativo amigable para Vane y Gustavo:
    *   `REVISAR_MONTO` → **"Confirmar importe"**
    *   `REVISAR_FACTURA` → **"Esperando factura"**
    *   `REVISAR_VENCIMIENTO` → **"Confirmar vencimiento"**
    *   `REVISAR_MANUAL` → **"Revisar información"**
    *   `COPIAR_ANTERIOR` → **"Factura estimada"**
    *   `CARGA_MANUAL` → **"Confirmar datos"**
    *   `PENDIENTE_REVISION` → **"Pendiente de revisión"**
*   **Helper Centralizado**: Implementación de `getMotivoRevisionHumano` en `src/utils/formatters.js` con fallback robusto a *"Revisar información"*.
*   **Aplicación Visual**: Integración en las tarjetas del calendario (`Grupo`) y en la sección inferior (`RevisionCard`) reemplazando las visualizaciones directas.
*   **Seguridad**: Cero modificaciones lógicas o de persistencia. Solo presentación estética de solo lectura.

## Restricciones Vigentes
* 🚫 **No tocar Cargar**: Excluir todo formulario o carga inicial interactiva de gastos/ingresos.
* 🚫 **No tocar `guardarGasto`**: Blindar la función central de guardado y persistencia.
* 🚫 **No tocar APIs/Auth/Base de datos**: Mantener aislado el flujo de red, autenticación y base Neon.
* 🚫 **No tocar cotizaciones ni tipo de cambio (USD/ARS)**: Evitar cualquier lógica monetaria o de conversión.
* 🚫 **No tocar cálculo de payload ni validaciones**: Impedir modificaciones en la estructura de datos que se guarda.
* 🚫 **No modificar JSX sin QA dedicado**: Limitar los cambios que alteren la UI interactiva a menos que estén validados en el diseño del sprint UX.
