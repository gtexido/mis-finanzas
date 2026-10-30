-- ======================================================================
-- MIS FINANZAS - TABLA DE INTENTOS FALLIDOS DE LOGIN
-- ======================================================================
-- Descripción : Registra cada intento de login fallido para poder bloquear
--               temporalmente a quien prueba claves una tras otra.
-- Fuente      : la escribe y la lee api/_loginGuard.js desde api/auth-login.js.
-- Lógica      : - Cada fallo inserta una fila (usuario, ip, momento).
--               - El login se bloquea si hay 5 fallos en 15 minutos para el
--                 mismo usuario desde la misma IP, o 30 fallos en 60 minutos
--                 para el mismo usuario desde cualquier IP.
--               - Un login correcto borra los fallos de ese usuario + IP.
--               - Las filas de más de 1 día se limpian solas.
-- Uso         : Ejecutar UNA vez en Neon (SQL Editor). Es seguro repetirlo
--               (IF NOT EXISTS). Sin esta tabla el login sigue funcionando,
--               pero sin límite de intentos (el código lo avisa en el log).
-- Propósito   : Frenar adivinación de PIN por fuerza bruta.
-- ======================================================================

CREATE TABLE IF NOT EXISTS login_fallos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  TEXT        NOT NULL,
  ip          TEXT        NOT NULL,
  creado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_fallos_usuario_ip
  ON login_fallos (usuario_id, ip, creado_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_fallos_usuario
  ON login_fallos (usuario_id, creado_at DESC);

-- Verificación (debería devolver 0 filas al principio)
SELECT COUNT(*) AS fallos_registrados FROM login_fallos;
