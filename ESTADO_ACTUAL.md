# Estado Actual - Mis Finanzas

* **Carpeta correcta**: `C:\mis-finanzas\mis-finanzas-backup-antes-ajuste`
* **Branch**: `refactor-appjsx-fase1`
* **Último commit estable**: `dfad12f docs: actualizar log con microfase 15`
* **Último tag seguro**: `estable-refactor-fase15`

## Estado de la Aplicación
* **Git**: Limpio (`git status` sin cambios pendientes).
* **Compilación**: Vite Build exitoso (`npm run build` OK).
* **QA Visual**: Verificado localmente con Gustavo y Vane (OK).
* **Consola navegador**: Sin errores rojos ni warnings bloqueantes.
* **Producción**: Intacta y sin riesgos.

## Cierre del Sprint Refactor 1
* **Estado**: Completado con éxito en la Microfase 15.
* **Decisión Técnica**: No implementar Microfase 16 debido a un retorno de inversión técnica decreciente (el único candidato seguro era centralizar `MESES` en la vista de Vencimientos, lo cual tiene un valor muy bajo). Se decide blindar y pausar la refactorización de helpers/cálculos sensibles para evitar riesgos innecesarios en la lógica monetaria, desgloses, cotizaciones y guardado.

## Próximo Sprint Recomendado (Pendiente Inmediato)
* **Sprint UX Vencimientos Inteligentes**: Diseñar e implementar un badge visual claro de "Revisar" para aquellos gastos que están pendientes de revisión (por ejemplo, facturas de servicios variables como Gas) en la interfaz de usuario.

## Restricciones Vigentes
* 🚫 **No tocar Cargar**: Excluir todo formulario o carga inicial interactiva de gastos/ingresos.
* 🚫 **No tocar `guardarGasto`**: Blindar la función central de guardado y persistencia.
* 🚫 **No tocar APIs/Auth/Base de datos**: Mantener aislado el flujo de red, autenticación y base Neon.
* 🚫 **No tocar cotizaciones ni tipo de cambio (USD/ARS)**: Evitar cualquier lógica monetaria o de conversión.
* 🚫 **No tocar cálculo de payload ni validaciones**: Impedir modificaciones en la estructura de datos que se guarda.
* 🚫 **No modificar JSX sin QA dedicado**: Limitar los cambios que alteren la UI interactiva a menos que estén validados en el diseño del sprint UX.
