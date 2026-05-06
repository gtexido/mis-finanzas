# Bloque 4 — Fix Vencimientos / marcar como pagado

## Objetivo
Permitir que Vencimientos marque un gasto pendiente como pagado sin depender del endpoint completo de edición de gasto.

## Archivos incluidos
- `api/gastos-estado.js`
- `src/services/api.js`
- `src/App.jsx`

## Cambio principal
Se agrega un endpoint específico para actualizar únicamente el estado del gasto:

```js
PATCH /api/gastos-estado
{ movimientoId, estado }
```

El endpoint valida JWT, resuelve workspace por usuario y actualiza solo movimientos propios.

## QA mínimo
- Login Gustavo.
- Login Vane.
- Vane > Vencimientos > pagar gasto pendiente.
- Confirmar que desaparece de pendientes.
- Confirmar que el gasto queda `estado = pagado`.
- Confirmar que Gustavo no ve ni modifica gastos de Vane.
