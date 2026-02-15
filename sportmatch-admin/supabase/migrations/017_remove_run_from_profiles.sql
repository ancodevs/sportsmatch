-- ============================================
-- MIGRACIÓN: Remover columna run de profiles
-- ============================================
-- Esta migración elimina la columna 'run' de profiles ya que no se usa.
-- Las reservas manuales ahora usan customer_run en la tabla bookings.

-- Eliminar índice
DROP INDEX IF EXISTS idx_profiles_run;

-- Eliminar columna run
ALTER TABLE profiles DROP COLUMN IF EXISTS run;
