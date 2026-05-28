# Estado Actual - Mis Finanzas

* **Carpeta correcta**: `C:\mis-finanzas\mis-finanzas-backup-antes-ajuste`
* **Branch**: `refactor-appjsx-fase1`
* **Último commit estable**: `6f40775 Refactor normalizarEtiquetaVisual en DetalleView`
* **Último tag seguro**: `estable-refactor-fase13`

## Estado de la Aplicación
* **Git**: Limpio (`git status` sin cambios pendientes).
* **Compilación**: Vite Build exitoso (`npm run build` OK).
* **QA Visual**: Verificado localmente con Gustavo y Vane (OK).
* **Consola navegador**: Sin errores rojos ni warnings bloqueantes.
* **Producción**: Intacta y sin riesgos.

## Pendiente Inmediato
* Microfase 14 en modo *Analyze only* para detectar el próximo helper puro a extraer.

## Restricciones Vigentes
* 🚫 **No tocar Cargar**: Excluir todo formulario o carga inicial interactiva de gastos/ingresos.
* 🚫 **No tocar `guardarGasto`**: Blindar la función central de guardado y persistencia.
* 🚫 **No tocar APIs/Auth/Base de datos**: Mantener aislado el flujo de red, autenticación y base Neon.
* 🚫 **No tocar cotizaciones ni tipo de cambio (USD/ARS)**: Evitar cualquier lógica monetaria o de conversión.
* 🚫 **No tocar cálculo de payload ni validaciones**: Impedir modificaciones en la estructura de datos que se guarda.
* 🚫 **No modificar JSX**: La refactorización es puramente lógica y modular, sin tocar la interfaz web.
