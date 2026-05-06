-- ======================================================
-- MIS FINANZAS - FIXES NEON SEGUROS
-- Fecha: 2026-05-05
-- Ejecutar desde Neon Console, en este orden.
-- ======================================================

-- 1) Verificar aislamiento multiusuario
SELECT wu.usuario_id, wu.workspace_id, wu.rol, wu.activo
FROM workspace_usuarios wu
ORDER BY wu.usuario_id;

-- 2) Verificar gasto perdido de Vane en ws_default
SELECT movimiento_id, usuario_id, workspace_id, tipo_movimiento, monto, periodo, fecha_operacion, concepto_manual, medio_pago_id, instrumento_id
FROM movimientos
WHERE movimiento_id = 'mov_337fzw9fgf8';

-- 3) Mover gasto perdido de Vane a su workspace correcto
-- Ejecutar SOLO si el SELECT anterior confirma usuario_id = usr_vane y workspace_id = ws_default.
UPDATE movimientos
SET workspace_id = 'ws_vane',
    updated_at = NOW()
WHERE movimiento_id = 'mov_337fzw9fgf8'
  AND usuario_id = 'usr_vane'
  AND workspace_id = 'ws_default';

-- 4) Confirmar que quedó en ws_vane
SELECT movimiento_id, usuario_id, workspace_id, monto, periodo, fecha_operacion
FROM movimientos
WHERE movimiento_id = 'mov_337fzw9fgf8';

-- 5) Identificar gastos activos sin concepto/concepto_manual claro
SELECT movimiento_id, usuario_id, workspace_id,
       concepto_id, concepto_manual, servicio_id,
       medio_pago_id, instrumento_id, categoria_gasto_id,
       monto, periodo, fecha_operacion, estado
FROM movimientos
WHERE tipo_movimiento = 'GASTO'
  AND activo = true
  AND concepto_id IS NULL
  AND (concepto_manual IS NULL OR concepto_manual = '')
ORDER BY created_at DESC;

-- 6) Opción segura para que no aparezcan vacíos en la app.
-- Recomendada si todavía no se sabe qué concepto eran.
-- Deja trazabilidad para revisar después.
-- Descomentar cuando confirmes.
/*
UPDATE movimientos
SET concepto_manual = 'Gasto sin clasificar - revisar',
    updated_at = NOW()
WHERE movimiento_id IN ('mov_337fzw9fgf8', 'mov_jdt80eopfud')
  AND usuario_id = 'usr_vane'
  AND tipo_movimiento = 'GASTO'
  AND activo = true
  AND concepto_id IS NULL
  AND (concepto_manual IS NULL OR concepto_manual = '');
*/

-- 7) Índices seguros de performance
CREATE INDEX IF NOT EXISTS idx_mov_periodo_usuario
  ON movimientos(periodo, usuario_id, workspace_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_mov_etiquetas_mov
  ON movimiento_etiquetas(movimiento_id);

CREATE INDEX IF NOT EXISTS idx_detalle_mov
  ON detalle_movimiento(movimiento_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_lookup
  ON cotizaciones(fecha, moneda_origen, moneda_destino, tipo);

CREATE INDEX IF NOT EXISTS idx_conceptos_workspace
  ON conceptos(workspace_id)
  WHERE activo = true;

-- 8) Control posterior
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT usuario_id, workspace_id, tipo_movimiento, periodo, COUNT(*) cantidad, SUM(monto) total_monto
FROM movimientos
WHERE activo = true
GROUP BY usuario_id, workspace_id, tipo_movimiento, periodo
ORDER BY usuario_id, workspace_id, periodo DESC, tipo_movimiento;
