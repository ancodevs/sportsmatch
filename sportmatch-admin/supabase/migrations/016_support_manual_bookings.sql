-- ============================================
-- MIGRACIÓN: Soportar Reservas Manuales (Clientes Externos)
-- ============================================
-- Esta migración permite crear reservas para clientes que NO son usuarios
-- de la app móvil. Son clientes externos que reservan directamente en el recinto.

-- 1. Hacer player_id nullable (puede ser NULL para reservas manuales)
ALTER TABLE bookings ALTER COLUMN player_id DROP NOT NULL;

-- 2. Agregar campos para datos del cliente externo
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_run TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_first_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_last_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 3. Agregar campo para identificar el tipo de reserva
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'manual' 
  CHECK (booking_type IN ('app', 'manual'));

-- 4. Actualizar reservas existentes como tipo 'app' (tienen player_id)
UPDATE bookings SET booking_type = 'app' WHERE player_id IS NOT NULL;

-- 5. Agregar índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_run ON bookings(customer_run);

-- 6. Agregar constraint: Las reservas manuales DEBEN tener datos del cliente
ALTER TABLE bookings ADD CONSTRAINT check_manual_booking_has_customer_data
  CHECK (
    (booking_type = 'app' AND player_id IS NOT NULL)
    OR
    (booking_type = 'manual' AND customer_run IS NOT NULL AND customer_first_name IS NOT NULL AND customer_last_name IS NOT NULL AND customer_phone IS NOT NULL)
  );

-- 7. Comentarios descriptivos
COMMENT ON COLUMN bookings.player_id IS 'ID del jugador en profiles (solo para reservas tipo app)';
COMMENT ON COLUMN bookings.customer_run IS 'RUN del cliente externo (solo para reservas manuales)';
COMMENT ON COLUMN bookings.customer_first_name IS 'Nombre del cliente externo (solo para reservas manuales)';
COMMENT ON COLUMN bookings.customer_last_name IS 'Apellido del cliente externo (solo para reservas manuales)';
COMMENT ON COLUMN bookings.customer_phone IS 'Teléfono del cliente externo (solo para reservas manuales)';
COMMENT ON COLUMN bookings.booking_type IS 'Tipo de reserva: app (desde app móvil) o manual (desde panel admin)';
