-- ============================================
-- MIGRACIÓN: Separar gender_mode de game_mode
-- ============================================
-- Esta migración separa el concepto de género (masculino/femenino/mixto)
-- del modo de juego (selección/aleatorio/equipos)
-- ============================================

-- 1. Agregar columna gender_mode para el género
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS gender_mode TEXT NULL DEFAULT 'mixed'::TEXT;

-- 2. Migrar datos existentes: mover game_mode actual a gender_mode
UPDATE public.matches 
SET gender_mode = game_mode
WHERE game_mode IN ('mixed', 'male', 'female');

-- 3. Actualizar game_mode a los nuevos valores
-- Por defecto, todos los partidos existentes serán de tipo "selection"
UPDATE public.matches
SET game_mode = 'selection'
WHERE game_mode IN ('mixed', 'male', 'female');

-- 4. Crear índice para búsquedas por modo de juego
CREATE INDEX IF NOT EXISTS idx_matches_game_mode ON matches(game_mode);
CREATE INDEX IF NOT EXISTS idx_matches_gender_mode ON matches(gender_mode);

-- 5. Agregar comentarios explicativos
COMMENT ON COLUMN matches.game_mode IS 'Modo de juego: selection (selección libre), random (aleatorio), teams (equipos creados)';
COMMENT ON COLUMN matches.gender_mode IS 'Género: mixed (mixto), male (masculino), female (femenino)';

-- ============================================
-- VERIFICAR DATOS MIGRADOS
-- ============================================

SELECT 
  id,
  title,
  game_mode,
  gender_mode,
  datetime
FROM matches
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- VALORES VÁLIDOS
-- ============================================

-- game_mode:
--   'selection' - Los jugadores seleccionan su equipo al unirse
--   'random'    - Lista única, se dividen automáticamente cuando se llena
--   'teams'     - Solo equipos creados pueden participar

-- gender_mode:
--   'mixed'  - Mixto
--   'male'   - Masculino
--   'female' - Femenino
