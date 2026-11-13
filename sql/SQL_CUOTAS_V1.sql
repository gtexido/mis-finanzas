-- =============================================================================
-- SQL_CUOTAS_V1.sql
-- Compras en cuotas: columnas nuevas en la tabla de movimientos.
-- =============================================================================
--
-- DESCRIPCIÓN
--   Agrega a `movimientos` tres columnas que permiten saber si un gasto es una
--   cuota, de qué compra forma parte y qué número de cuota es.
--
-- FUENTES / TABLAS AFECTADAS
--   movimientos   (se agregan columnas, una restricción y un índice)
--   No se modifica ni se borra ninguna fila existente.
--
-- COLUMNAS NUEVAS (las tres quedan en NULL para todo lo que ya existe)
--   cuota_plan_id   text      Identificador de la compra. Todas las cuotas de
--                             una misma compra comparten este valor.
--   cuota_numero    integer   Número de esta cuota (1, 2, 3...).
--   cuota_total     integer   Cantidad total de cuotas de la compra.
--
-- LÓGICA
--   1. ADD COLUMN IF NOT EXISTS: el script se puede volver a correr sin efecto.
--   2. Restricción `movimientos_cuota_coherente`: o las tres columnas están
--      vacías (gasto común), o las tres tienen valor y cumplen
--      1 <= cuota_numero <= cuota_total, con cuota_total entre 2 y 60.
--   3. Índice parcial sobre cuota_plan_id, solo para las filas que son cuotas,
--      para buscar rápido "esta cuota y las que faltan".
--   4. Verificación final: frena con error si alguna fila quedó incoherente.
--
-- USO
--   Correr una sola vez, completo, sobre la base. Es una transacción: si algo
--   falla, no se aplica nada.
--   Orden de despliegue: primero este script, después el código que usa las
--   columnas. El código anterior sigue funcionando con las columnas agregadas.
--
-- PROPÓSITO
--   Que una compra en cuotas se cargue una sola vez y la app genere el gasto de
--   cada mes, en lugar de replicarlo a mano.
--
-- CÓMO VOLVER ATRÁS
--   BEGIN;
--   DROP INDEX IF EXISTS idx_movimientos_cuota_plan;
--   ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_cuota_coherente;
--   ALTER TABLE movimientos DROP COLUMN IF EXISTS cuota_plan_id,
--                           DROP COLUMN IF EXISTS cuota_numero,
--                           DROP COLUMN IF EXISTS cuota_total;
--   COMMIT;
--   (Los gastos creados como cuotas quedan como gastos comunes.)
-- =============================================================================

BEGIN;

-- 1. Columnas nuevas ---------------------------------------------------------
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cuota_plan_id text;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cuota_numero  integer;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cuota_total   integer;

-- 2. Coherencia entre las tres columnas ---------------------------------------
ALTER TABLE movimientos DROP CONSTRAINT IF EXISTS movimientos_cuota_coherente;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_cuota_coherente CHECK (
  (cuota_plan_id IS NULL AND cuota_numero IS NULL AND cuota_total IS NULL)
  OR
  (cuota_plan_id IS NOT NULL AND cuota_numero IS NOT NULL AND cuota_total IS NOT NULL
   AND cuota_total BETWEEN 2 AND 60
   AND cuota_numero BETWEEN 1 AND cuota_total)
);

-- 3. Índice para buscar las cuotas de una compra -------------------------------
CREATE INDEX IF NOT EXISTS idx_movimientos_cuota_plan
  ON movimientos (cuota_plan_id, cuota_numero)
  WHERE cuota_plan_id IS NOT NULL;

-- 4. Verificación -------------------------------------------------------------
DO $$
DECLARE n_columnas int; n_incoherentes int;
BEGIN
  SELECT count(*) INTO n_columnas
    FROM information_schema.columns
   WHERE table_name = 'movimientos'
     AND column_name IN ('cuota_plan_id', 'cuota_numero', 'cuota_total');
  IF n_columnas <> 3 THEN
    RAISE EXCEPTION 'Cuotas V1 frenada: se esperaban 3 columnas nuevas y hay %', n_columnas;
  END IF;

  SELECT count(*) INTO n_incoherentes
    FROM movimientos
   WHERE NOT (
     (cuota_plan_id IS NULL AND cuota_numero IS NULL AND cuota_total IS NULL)
     OR (cuota_plan_id IS NOT NULL AND cuota_numero BETWEEN 1 AND cuota_total AND cuota_total BETWEEN 2 AND 60)
   );
  IF n_incoherentes > 0 THEN
    RAISE EXCEPTION 'Cuotas V1 frenada: % filas con datos de cuota incoherentes', n_incoherentes;
  END IF;
END $$;

COMMIT;
