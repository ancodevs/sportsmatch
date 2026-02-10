-- ============================================
-- Refactorizar precios: día/noche en courts
-- ============================================

-- 1. Añadir columnas de precio diurno/nocturno a courts
ALTER TABLE courts ADD COLUMN IF NOT EXISTS day_price DECIMAL(10, 2);
ALTER TABLE courts ADD COLUMN IF NOT EXISTS night_price DECIMAL(10, 2);

-- 2. Migrar datos existentes: usar price_per_hour como day_price por defecto
UPDATE courts 
SET day_price = COALESCE(price_per_hour, 0),
    night_price = COALESCE(price_per_hour, 0)
WHERE day_price IS NULL OR night_price IS NULL;

-- 3. Hacer obligatorios los nuevos campos
ALTER TABLE courts ALTER COLUMN day_price SET NOT NULL;
ALTER TABLE courts ALTER COLUMN night_price SET NOT NULL;
ALTER TABLE courts ALTER COLUMN day_price SET DEFAULT 0;
ALTER TABLE courts ALTER COLUMN night_price SET DEFAULT 0;

-- 4. Eliminar price_per_hour de courts (ya no se usa)
ALTER TABLE courts DROP COLUMN IF EXISTS price_per_hour;

-- 5. Eliminar campos de precio de schedules (ya no son necesarios)
ALTER TABLE schedules DROP COLUMN IF EXISTS price_per_hour;
ALTER TABLE schedules DROP COLUMN IF EXISTS lighting_price;

-- Comentarios
COMMENT ON COLUMN courts.day_price IS 'Precio por hora para horario diurno (apertura - 19:00)';
COMMENT ON COLUMN courts.night_price IS 'Precio por hora para horario nocturno (19:00 - cierre)';
