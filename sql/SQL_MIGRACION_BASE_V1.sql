-- ======================================================================
-- MIS FINANZAS - MIGRACIÓN DE BASE V1 (integridad, reglas e índices)
-- ======================================================================
-- Descripción : Ordena la base de Neon para que no pueda quedar en estado
--               inconsistente: corrige datos huérfanos, agrega claves
--               foráneas y reglas de validación, quita índices duplicados,
--               agrega índices útiles y crea la tabla del límite de login.
-- Fuentes     : Auditoría de solo lectura del 2026-10-29 sobre la rama
--               production (274 movimientos, 189 conceptos, 3 workspaces).
-- Hallazgos que corrige:
--   1) 146 filas de movimiento_etiquetas apuntaban a 37 movimientos que ya
--      no existen (el borrado de sueldo/ingreso no limpiaba etiquetas).
--   2) 5 movimientos usaban un medio de pago y 7 un instrumento que
--      pertenecen a OTRO workspace (ws_default). Se re-apuntan al medio o
--      instrumento del mismo nombre dentro del workspace del movimiento.
--   3) movimientos y catálogos no tenían claves foráneas hacia workspaces,
--      conceptos, medios, instrumentos, categorías ni etiquetas.
--   4) Sin reglas sobre tipo, estado, moneda, monto ni formato de período.
--   5) Índices duplicados: idx_detalle_mov_id (igual a idx_detalle_mov) e
--      idx_cotizaciones_lookup (igual a la clave única de cotizaciones).
-- Lógica      : Todo corre en UNA transacción. Antes de cambiar datos se
--               copian las filas afectadas a tablas backup_*_20261029. Las
--               verificaciones (DO) frenan y deshacen todo si algo no cierra.
-- Qué NO toca : tablas legacy (categorias, formas_pago, servicios,
--               fuentes_ingreso: los movimientos todavía las usan), tablas
--               backup_* de mayo, columnas ni tipos de datos existentes.
-- Uso         : Ejecutar UNA vez en Neon (SQL Editor) sobre production,
--               después de probarlo en una rama. Es repetible: usa IF NOT
--               EXISTS y chequea antes de crear cada regla.
-- Reversión   : Restaurar desde la rama restore-antes-migracion-20261029
--               o borrar las reglas con ALTER TABLE ... DROP CONSTRAINT.
-- Propósito   : Base confiable para 2 usuarios hoy y para varios
--               workspaces (venta de la app) mañana.
-- ======================================================================

BEGIN;

-- ----------------------------------------------------------------------
-- 1. RESPALDO de las filas que se van a modificar o borrar
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_movimiento_etiquetas_huerfanas_20261029 AS
SELECT me.* FROM movimiento_etiquetas me
WHERE NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.movimiento_id = me.movimiento_id);

CREATE TABLE IF NOT EXISTS backup_movimientos_refs_20261029 AS
SELECT m.movimiento_id, m.workspace_id, m.medio_pago_id, m.instrumento_id
FROM movimientos m
LEFT JOIN medios_pago mp ON mp.medio_pago_id = m.medio_pago_id
LEFT JOIN instrumentos_pago ip ON ip.instrumento_id = m.instrumento_id
WHERE (mp.workspace_id IS NOT NULL AND mp.workspace_id IS DISTINCT FROM m.workspace_id)
   OR (ip.workspace_id IS NOT NULL AND ip.workspace_id IS DISTINCT FROM m.workspace_id);

-- ----------------------------------------------------------------------
-- 2. CORRECCIÓN DE DATOS
-- ----------------------------------------------------------------------
-- 2.1 Etiquetas colgadas de movimientos inexistentes
DELETE FROM movimiento_etiquetas me
WHERE NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.movimiento_id = me.movimiento_id);

-- 2.2 Medios de pago de otro workspace -> el del mismo nombre en el workspace del movimiento
UPDATE movimientos m
SET medio_pago_id = destino.medio_pago_id
FROM medios_pago origen
JOIN medios_pago destino ON destino.nombre = origen.nombre
WHERE origen.medio_pago_id = m.medio_pago_id
  AND origen.workspace_id IS DISTINCT FROM m.workspace_id
  AND destino.workspace_id = m.workspace_id;

-- 2.3 Instrumentos de otro workspace -> el del mismo nombre en el workspace del movimiento
UPDATE movimientos m
SET instrumento_id = destino.instrumento_id
FROM instrumentos_pago origen
JOIN instrumentos_pago destino ON destino.nombre = origen.nombre
WHERE origen.instrumento_id = m.instrumento_id
  AND origen.workspace_id IS DISTINCT FROM m.workspace_id
  AND destino.workspace_id = m.workspace_id;

-- 2.4 Verificación: no debe quedar ninguna referencia cruzada ni huérfana
DO $$
DECLARE n_medios int; n_instr int; n_etq int;
BEGIN
  SELECT count(*) INTO n_medios FROM movimientos m JOIN medios_pago x ON x.medio_pago_id = m.medio_pago_id
   WHERE x.workspace_id IS DISTINCT FROM m.workspace_id;
  SELECT count(*) INTO n_instr FROM movimientos m JOIN instrumentos_pago x ON x.instrumento_id = m.instrumento_id
   WHERE x.workspace_id IS DISTINCT FROM m.workspace_id;
  SELECT count(*) INTO n_etq FROM movimiento_etiquetas me
   WHERE NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.movimiento_id = me.movimiento_id);
  IF n_medios > 0 OR n_instr > 0 OR n_etq > 0 THEN
    RAISE EXCEPTION 'Migración frenada: quedan % medios, % instrumentos y % etiquetas sin corregir', n_medios, n_instr, n_etq;
  END IF;
END $$;

-- ----------------------------------------------------------------------
-- 3. CLAVES FORÁNEAS (cada una se crea solo si no existe)
-- ----------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('movimientos',          'fk_mov_workspace',       'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('movimientos',          'fk_mov_concepto',        'FOREIGN KEY (concepto_id) REFERENCES conceptos(concepto_id)'),
    ('movimientos',          'fk_mov_medio_pago',      'FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(medio_pago_id)'),
    ('movimientos',          'fk_mov_instrumento',     'FOREIGN KEY (instrumento_id) REFERENCES instrumentos_pago(instrumento_id)'),
    ('movimientos',          'fk_mov_categoria_gasto', 'FOREIGN KEY (categoria_gasto_id) REFERENCES categorias_gasto(categoria_gasto_id)'),
    ('movimiento_etiquetas', 'fk_movetq_movimiento',   'FOREIGN KEY (movimiento_id) REFERENCES movimientos(movimiento_id) ON DELETE CASCADE'),
    ('movimiento_etiquetas', 'fk_movetq_etiqueta',     'FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(etiqueta_id) ON DELETE CASCADE'),
    ('concepto_etiquetas',   'fk_conetq_concepto',     'FOREIGN KEY (concepto_id) REFERENCES conceptos(concepto_id) ON DELETE CASCADE'),
    ('concepto_etiquetas',   'fk_conetq_etiqueta',     'FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(etiqueta_id) ON DELETE CASCADE'),
    ('conceptos',            'fk_conceptos_workspace', 'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('conceptos',            'fk_conceptos_categoria', 'FOREIGN KEY (categoria_gasto_id) REFERENCES categorias_gasto(categoria_gasto_id)'),
    ('conceptos',            'fk_conceptos_medio',     'FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(medio_pago_id)'),
    ('conceptos',            'fk_conceptos_instr',     'FOREIGN KEY (instrumento_id) REFERENCES instrumentos_pago(instrumento_id)'),
    ('medios_pago',          'fk_medios_workspace',    'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('instrumentos_pago',    'fk_instr_workspace',     'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('categorias_gasto',     'fk_catgasto_workspace',  'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('etiquetas',            'fk_etiquetas_workspace', 'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('workspace_usuarios',   'fk_wu_workspace',        'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('workspace_usuarios',   'fk_wu_usuario',          'FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id)'),
    ('ahorro_libros',        'fk_ahorro_workspace',    'FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id)'),
    ('ahorro_libros',        'fk_ahorro_usuario',      'FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id)')
  ) AS t(tabla, nombre, definicion)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.nombre AND conrelid = ('public.' || r.tabla)::regclass) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.tabla, r.nombre, r.definicion);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------
-- 4. REGLAS DE VALIDACIÓN (CHECK)
-- ----------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('movimientos',        'ck_mov_tipo',    $c$CHECK (tipo_movimiento IN ('GASTO','INGRESO'))$c$),
    ('movimientos',        'ck_mov_estado',  $c$CHECK (estado IS NULL OR estado IN ('pagado','pendiente'))$c$),
    ('movimientos',        'ck_mov_moneda',  $c$CHECK (moneda IS NULL OR moneda IN ('ARS','USD'))$c$),
    ('movimientos',        'ck_mov_monto',   $c$CHECK (monto IS NULL OR monto >= 0)$c$),
    ('movimientos',        'ck_mov_periodo', $c$CHECK (periodo IS NULL OR periodo ~ '^\d{4}-(0[1-9]|1[0-2])$')$c$),
    ('detalle_movimiento', 'ck_det_moneda',  $c$CHECK (moneda IN ('ARS','USD'))$c$),
    ('detalle_movimiento', 'ck_det_monto',   $c$CHECK (monto >= 0)$c$),
    ('conceptos',          'ck_conceptos_tipo', $c$CHECK (tipo_movimiento IN ('GASTO','INGRESO'))$c$),
    ('cotizaciones',       'ck_cotiz_valor', $c$CHECK (valor > 0)$c$),
    ('workspace_usuarios', 'ck_wu_rol',      $c$CHECK (rol IN ('owner','admin','member','viewer'))$c$)
  ) AS t(tabla, nombre, definicion)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.nombre AND conrelid = ('public.' || r.tabla)::regclass) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.tabla, r.nombre, r.definicion);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------
-- 5. ÍNDICES: quitar duplicados y agregar los que usan las pantallas
-- ----------------------------------------------------------------------
DROP INDEX IF EXISTS idx_detalle_mov_id;        -- idéntico a idx_detalle_mov
DROP INDEX IF EXISTS idx_cotizaciones_lookup;   -- idéntico a la clave única de cotizaciones

CREATE INDEX IF NOT EXISTS idx_movetq_etiqueta
  ON movimiento_etiquetas (etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_conetq_etiqueta
  ON concepto_etiquetas (etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_wu_usuario
  ON workspace_usuarios (usuario_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_mov_pendientes
  ON movimientos (usuario_id, vencimiento) WHERE estado = 'pendiente' AND activo = true;
CREATE INDEX IF NOT EXISTS idx_mov_concepto
  ON movimientos (concepto_id) WHERE concepto_id IS NOT NULL;

-- ----------------------------------------------------------------------
-- 6. LÍMITE DE INTENTOS DE LOGIN (ver SQL_LOGIN_INTENTOS.sql)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_fallos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  TEXT        NOT NULL,
  ip          TEXT        NOT NULL,
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_fallos_usuario_ip ON login_fallos (usuario_id, ip, creado_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_fallos_usuario    ON login_fallos (usuario_id, creado_at DESC);

COMMIT;

-- ----------------------------------------------------------------------
-- Verificación posterior (cada fila debería dar el resultado indicado)
-- ----------------------------------------------------------------------
-- SELECT count(*) FROM pg_constraint WHERE conname LIKE 'fk\_%' ESCAPE '\';  -- 23 (21 nuevas + 2 previas)
-- SELECT count(*) FROM pg_constraint WHERE conname LIKE 'ck\_%' ESCAPE '\';  -- 10
-- SELECT count(*) FROM movimientos;                                          -- 274
