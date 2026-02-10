-- ============================================
-- Añadir campos de precio e iluminación a schedules
-- ============================================

-- lighting_price: costo extra por usar iluminación en este horario
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS lighting_price DECIMAL(10, 2) DEFAULT 0;

-- price_per_hour: precio específico para este horario/día
-- Si es NULL, se usa el precio de la cancha (courts.price_per_hour)
-- Si tiene valor, se usa este precio
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10, 2);

COMMENT ON COLUMN schedules.lighting_price IS 'Costo extra por usar iluminación en este horario (ej: 2500 para tardes/noches)';
COMMENT ON COLUMN schedules.price_per_hour IS 'Precio por hora específico para este horario. Si es NULL, se usa el precio de la cancha';
