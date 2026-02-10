-- ============================================
-- AÑADIR TIPO DE DEPORTE A COURTS
-- ============================================
-- Esta migración añade el campo sport_type a la tabla courts
-- para clasificar las canchas por tipo de deporte.

-- Añadir columna de tipo de deporte
ALTER TABLE courts
ADD COLUMN IF NOT EXISTS sport_type TEXT;

-- Opcional: Actualizar canchas existentes basándose en el nombre
-- Puedes descomentar y ajustar según tus datos existentes
-- UPDATE courts SET sport_type = 'football' WHERE name ILIKE '%fútbol%' OR name ILIKE '%futbol%' OR name ILIKE '%soccer%';
-- UPDATE courts SET sport_type = 'tennis' WHERE name ILIKE '%tenis%' OR name ILIKE '%tennis%';
-- UPDATE courts SET sport_type = 'basketball' WHERE name ILIKE '%básquet%' OR name ILIKE '%basket%';
-- UPDATE courts SET sport_type = 'volleyball' WHERE name ILIKE '%vólei%' OR name ILIKE '%voley%' OR name ILIKE '%volleyball%';
-- UPDATE courts SET sport_type = 'paddle' WHERE name ILIKE '%pádel%' OR name ILIKE '%paddle%';

-- Crear índice para búsquedas por tipo de deporte
CREATE INDEX IF NOT EXISTS idx_courts_sport_type ON courts(sport_type);

-- Nota: El tipo de deporte se guarda en inglés para mantener consistencia
-- en la base de datos, pero se mostrará traducido en la interfaz.
