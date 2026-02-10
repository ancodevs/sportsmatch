-- ============================================
-- MIGRACIÓN CONSOLIDADA 006-009
-- SPORTMATCH - Horarios, Reservas y Sistema de Precios
-- Fecha: 2026-02-10
-- ============================================
-- 
-- Esta migración consolida las siguientes migraciones:
-- - 006_create_schedules_table.sql
-- - 007_bookings_admin_policies.sql
-- - 008_add_pricing_to_schedules.sql (temporales)
-- - 009_refactor_pricing_day_night.sql
--
-- IMPORTANTE: Esta es una versión consolidada para referencia.
-- Si ya aplicaste las migraciones 006-009, NO ejecutes este archivo.
-- ============================================


-- ============================================
-- PARTE 1: TABLA SCHEDULES (desde 006)
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER DEFAULT 60,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_schedules_court_id ON schedules(court_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_court_day ON schedules(court_id, day_of_week);

-- Habilitar RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para schedules
DROP POLICY IF EXISTS "Admin pueden gestionar horarios de sus canchas" ON schedules;
CREATE POLICY "Admin pueden gestionar horarios de sus canchas"
  ON schedules FOR ALL TO authenticated
  USING (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "Todos pueden leer horarios" ON schedules;
CREATE POLICY "Todos pueden leer horarios"
  ON schedules FOR SELECT USING (true);


-- ============================================
-- PARTE 2: POLÍTICAS BOOKINGS (desde 007)
-- ============================================

-- Eliminar política antigua de INSERT
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias reservas" ON bookings;

-- INSERT: jugador puede crear su propia reserva O admin puede crear en sus canchas
DROP POLICY IF EXISTS "Insertar reservas: jugador o admin" ON bookings;
CREATE POLICY "Insertar reservas: jugador o admin"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- DELETE: jugador puede eliminar la suya O admin puede eliminar en sus canchas
DROP POLICY IF EXISTS "Eliminar reservas: jugador o admin" ON bookings;
CREATE POLICY "Eliminar reservas: jugador o admin"
  ON bookings FOR DELETE TO authenticated
  USING (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- Permitir que admins lean perfiles para crear reservas en nombre de jugadores
DROP POLICY IF EXISTS "Admin pueden ver perfiles para reservas" ON profiles;
CREATE POLICY "Admin pueden ver perfiles para reservas"
  ON profiles FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );


-- ============================================
-- PARTE 3: SISTEMA DE PRECIOS DÍA/NOCHE (desde 009)
-- ============================================

-- 1. Añadir columnas de precio diurno/nocturno a courts
ALTER TABLE courts ADD COLUMN IF NOT EXISTS day_price DECIMAL(10, 2);
ALTER TABLE courts ADD COLUMN IF NOT EXISTS night_price DECIMAL(10, 2);

-- 2. Migrar datos existentes: usar price_per_hour como day_price por defecto
-- (si price_per_hour existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courts' AND column_name = 'price_per_hour'
  ) THEN
    UPDATE courts 
    SET day_price = COALESCE(price_per_hour, 0),
        night_price = COALESCE(price_per_hour, 0)
    WHERE day_price IS NULL OR night_price IS NULL;
  ELSE
    -- Si no existe price_per_hour, inicializar a 0
    UPDATE courts 
    SET day_price = COALESCE(day_price, 0),
        night_price = COALESCE(night_price, 0)
    WHERE day_price IS NULL OR night_price IS NULL;
  END IF;
END $$;

-- 3. Hacer obligatorios los nuevos campos
ALTER TABLE courts ALTER COLUMN day_price SET NOT NULL;
ALTER TABLE courts ALTER COLUMN night_price SET NOT NULL;
ALTER TABLE courts ALTER COLUMN day_price SET DEFAULT 0;
ALTER TABLE courts ALTER COLUMN night_price SET DEFAULT 0;

-- 4. Eliminar columnas antiguas de courts
ALTER TABLE courts DROP COLUMN IF EXISTS price_per_hour;

-- 5. Eliminar campos de precio de schedules (si existen de migración temporal 008)
ALTER TABLE schedules DROP COLUMN IF EXISTS price_per_hour;
ALTER TABLE schedules DROP COLUMN IF EXISTS lighting_price;

-- Comentarios descriptivos
COMMENT ON TABLE schedules IS 'Horarios de disponibilidad de canchas por día de semana';
COMMENT ON COLUMN schedules.day_of_week IS '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';
COMMENT ON COLUMN schedules.interval_minutes IS 'Duración de cada slot de reserva en minutos (ej: 60, 90)';
COMMENT ON COLUMN schedules.is_blocked IS 'Indica si el horario está bloqueado para reservas';

COMMENT ON COLUMN courts.day_price IS 'Precio por hora para horario diurno (apertura - 19:00)';
COMMENT ON COLUMN courts.night_price IS 'Precio por hora para horario nocturno (19:00 - cierre)';


-- ============================================
-- FIN DE MIGRACIÓN CONSOLIDADA
-- ============================================
