-- ============================================
-- MIGRACIÓN: Sistema de Estados de Partido
-- ============================================
-- Implementa estados automáticos para los partidos:
-- - draft: Borrador (aún no publicado)
-- - open: Abierto para inscripciones
-- - full: Cupos completos
-- - confirmed: Confirmado para jugarse
-- - cancelled: Cancelado
-- ============================================

-- 1. Actualizar valores existentes de 'pending' a 'open'
UPDATE public.matches
SET status = 'open'
WHERE status = 'pending';

-- 2. Crear tipo ENUM para estados (opcional, para validación)
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('draft', 'open', 'full', 'confirmed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Agregar comentario explicativo
COMMENT ON COLUMN matches.status IS 'Estado del partido: draft (borrador), open (abierto), full (lleno), confirmed (confirmado), cancelled (cancelado)';

-- 4. Crear función para actualizar automáticamente el estado
CREATE OR REPLACE FUNCTION update_match_status()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  max_count INTEGER;
BEGIN
  -- Solo actualizar si el estado actual es 'open' o 'full'
  IF NEW.status IN ('open', 'full') OR (TG_OP = 'INSERT' AND NEW.status = 'open') THEN
    
    -- Obtener número de jugadores y máximo
    SELECT COUNT(*), NEW.max_players
    INTO player_count, max_count
    FROM match_players
    WHERE match_id = NEW.id;
    
    -- Actualizar estado según cupos
    IF player_count >= max_count THEN
      NEW.status := 'full';
    ELSIF player_count < max_count AND NEW.status = 'full' THEN
      NEW.status := 'open';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para actualizar estado al cambiar jugadores
DROP TRIGGER IF EXISTS trigger_update_match_status ON matches;
CREATE TRIGGER trigger_update_match_status
  BEFORE UPDATE OF max_players ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_match_status();

-- 6. Crear función para actualizar estado cuando se agregan/quitan jugadores
CREATE OR REPLACE FUNCTION update_match_status_on_player_change()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  max_count INTEGER;
  current_status TEXT;
BEGIN
  -- Obtener match_id apropiado
  IF TG_OP = 'DELETE' THEN
    -- Obtener datos del partido
    SELECT COUNT(*), m.max_players, m.status
    INTO player_count, max_count, current_status
    FROM match_players mp
    JOIN matches m ON m.id = OLD.match_id
    WHERE mp.match_id = OLD.match_id
    GROUP BY m.max_players, m.status;
    
    -- Ajustar por el jugador que se está eliminando
    player_count := player_count - 1;
    
    -- Solo actualizar si el estado es 'full' y hay cupos disponibles ahora
    IF current_status = 'full' AND player_count < max_count THEN
      UPDATE matches
      SET status = 'open'
      WHERE id = OLD.match_id;
    END IF;
    
  ELSE -- INSERT
    -- Obtener datos del partido
    SELECT COUNT(*), m.max_players, m.status
    INTO player_count, max_count, current_status
    FROM match_players mp
    JOIN matches m ON m.id = NEW.match_id
    WHERE mp.match_id = NEW.match_id
    GROUP BY m.max_players, m.status;
    
    -- Solo actualizar si el estado es 'open' y se llenó
    IF current_status = 'open' AND player_count >= max_count THEN
      UPDATE matches
      SET status = 'full'
      WHERE id = NEW.match_id;
    END IF;
    
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para cambios en match_players
DROP TRIGGER IF EXISTS trigger_match_status_on_player_change ON match_players;
CREATE TRIGGER trigger_match_status_on_player_change
  AFTER INSERT OR DELETE ON match_players
  FOR EACH ROW
  EXECUTE FUNCTION update_match_status_on_player_change();

-- 8. Crear índice para mejorar consultas por estado
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_status_datetime ON matches(status, datetime);

-- 9. Función auxiliar para confirmar partido (solo organizador)
CREATE OR REPLACE FUNCTION confirm_match(match_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_creator BOOLEAN;
  current_status TEXT;
BEGIN
  -- Verificar que el usuario es el creador
  SELECT created_by = user_uuid, status
  INTO is_creator, current_status
  FROM matches
  WHERE id = match_uuid;
  
  -- Solo el creador puede confirmar
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Solo el organizador puede confirmar el partido';
  END IF;
  
  -- Solo se puede confirmar si está 'full' o 'open'
  IF current_status NOT IN ('full', 'open') THEN
    RAISE EXCEPTION 'El partido debe estar abierto o lleno para confirmarse';
  END IF;
  
  -- Confirmar partido
  UPDATE matches
  SET status = 'confirmed'
  WHERE id = match_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función auxiliar para cancelar partido (solo organizador)
CREATE OR REPLACE FUNCTION cancel_match(match_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_creator BOOLEAN;
BEGIN
  -- Verificar que el usuario es el creador
  SELECT created_by = user_uuid
  INTO is_creator
  FROM matches
  WHERE id = match_uuid;
  
  -- Solo el creador puede cancelar
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Solo el organizador puede cancelar el partido';
  END IF;
  
  -- Cancelar partido
  UPDATE matches
  SET status = 'cancelled'
  WHERE id = match_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS DE SEGURIDAD
-- ============================================

-- Permitir a organizadores cambiar estado a 'confirmed' o 'cancelled'
DROP POLICY IF EXISTS "Organizador puede cambiar estado" ON matches;
CREATE POLICY "Organizador puede cambiar estado"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open', 'full', 'confirmed', 'cancelled')
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver distribución de estados
SELECT 
  status,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
FROM matches
GROUP BY status
ORDER BY cantidad DESC;

-- Ver triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('matches', 'match_players')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
Estados del Partido:

1. DRAFT (Borrador)
   - Partido recién creado pero no publicado
   - No visible en listados públicos
   - Solo visible para el organizador
   - Uso: Para preparar partido antes de publicar

2. OPEN (Abierto)
   - Partido publicado y aceptando inscripciones
   - Visible en listados
   - Los jugadores pueden unirse
   - Cambio automático: Cuando hay cupos disponibles

3. FULL (Lleno)
   - Cupos completos
   - Visible en listados pero sin botón "Unirse"
   - Cambio automático: Cuando jugadores_inscritos >= max_players
   - Vuelve a OPEN si alguien sale

4. CONFIRMED (Confirmado)
   - Organizador confirmó que el partido se jugará
   - No se pueden unir ni salir más jugadores
   - Cambio manual: Solo organizador
   - Paso previo a empezar el partido

5. CANCELLED (Cancelado)
   - Partido cancelado por organizador
   - No se puede unir
   - Visible en historial
   - Cambio manual: Solo organizador

Transiciones Permitidas:
- draft → open (publicar)
- open ↔ full (automático según cupos)
- open → confirmed (organizador)
- full → confirmed (organizador)
- open → cancelled (organizador)
- full → cancelled (organizador)
- confirmed → cancelled (organizador, excepcional)

NO Permitidas:
- confirmed → open (no se puede desconfirmar)
- cancelled → [cualquier otro] (no se puede descancelar)
*/
