-- =============================================================================
-- SQL_CUOTAS_DESGLOSE_V1.sql
-- Cuotas dentro del desglose: columnas nuevas en las líneas de un gasto.
-- =============================================================================
--
-- DESCRIPCIÓN
--   Agrega a `detalle_movimiento` (las líneas del desglose de un gasto) dos
--   columnas para anotar que una línea es una cuota y cuál. Caso de uso: el
--   resumen de una tarjeta se carga como un solo gasto por el total, y cada
--   compra del resumen va como línea del desglose ("Decathlon, cuota 4 de 6").
--
-- FUENTES / TABLAS AFECTADAS
--   detalle_movimiento   (se agregan columnas y una restricción)
--   No se modifica ni se borra ninguna fila existente.
--
-- COLUMNAS NUEVAS (quedan en NULL para todas las líneas que ya existen)
--   cuota_numero   integer   Número de la cuota de esa compra (1, 2, 3...).
--   cuota_total    integer   Cantidad total de cuotas de esa compra.
--
-- LÓGICA
--   1. ADD COLUMN IF NOT EXISTS: el script se puede volver a correr sin efecto.
--   2. Restricción `detalle_cuota_coherente`: o las dos columnas están vacías
--      (línea común), o las dos tienen valor y cumplen
--      1 <= cuota_numero <= cuota_total, con cuota_total entre 2 y 60
--      (mismos límites que las compras en cuotas de `movimientos`).
--   3. Verificación final: frena con error si alguna línea quedó incoherente.
--
-- USO
--   Correr una sola vez, completo, sobre la base. Es una transacción: si algo
--   falla, no se aplica nada.
--   Orden de despliegue: primero este script, después el código que usa las
--   columnas. El código anterior sigue funcionando con las columnas agregadas.
--
-- PROPÓSITO
--   Que al replicar el resumen de la tarjeta al mes siguiente, la app copie
--   sola las compras en cuotas que siguen (con el número avanzado), deje afuera
--   las que terminaron y pueda calcular cuánto ya está comprometido.
--
-- CÓMO VOLVER ATRÁS
--   BEGIN;
--   ALTER TABLE detalle_movimiento DROP CONSTRAINT IF EXISTS detalle_cuota_coherente;
--   ALTER TABLE detalle_movimiento DROP COLUMN IF EXISTS cuota_numero,
--                                  DROP COLUMN IF EXISTS cuota_total;
--   COMMIT;
--   (Las líneas quedan como líneas comunes; los importes no cambian.)
-- =============================================================================

BEGIN;

-- 1. Columnas nuevas ---------------------------------------------------------
ALTER TABLE detalle_movimiento ADD COLUMN IF NOT EXISTS cuota_numero integer;
ALTER TABLE detalle_movimiento ADD COLUMN IF NOT EXISTS cuota_total  integer;

-- 2. Coherencia entre las dos columnas ----------------------------------------
ALTER TABLE detalle_movimiento DROP CONSTRAINT IF EXISTS detalle_cuota_coherente;
ALTER TABLE detalle_movimiento ADD CONSTRAINT detalle_cuota_coherente CHECK (
  (cuota_numero IS NULL AND cuota_total IS NULL)
  OR (
    cuota_numero IS NOT NULL AND cuota_total IS NOT NULL
    AND cuota_total BETWEEN 2 AND 60
    AND cuota_numero BETWEEN 1 AND cuota_total
  )
);

-- 3. Verificación: ninguna línea puede quedar a medias -------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM detalle_movimiento
    WHERE (cuota_numero IS NULL) <> (cuota_total IS NULL)
  ) THEN
    RAISE EXCEPTION 'Hay líneas de desglose con cuota incompleta';
  END IF;
END $$;

COMMIT;
