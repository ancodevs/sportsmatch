-- ============================================
-- MIGRACIÓN: Estado FINISHED (Finalizado)
-- ============================================
-- Agrega el estado 'finished' para partidos terminados
-- Permite registrar resultados y estadísticas
-- ============================================

-- 1. Actualizar comentario de la columna status
COMMENT ON COLUMN matches.status IS 'Estado del partido: draft (borrador), open (abierto), full (lleno), confirmed (confirmado), finished (finalizado), cancelled (cancelado)';

-- 2. Función para marcar partido como finalizado (solo organizador)
CREATE OR REPLACE FUNCTION finish_match(
  match_uuid UUID, 
  user_uuid UUID,
  team_a_score INTEGER DEFAULT NULL,
  team_b_score INTEGER DEFAULT NULL,
  winning_team_input TEXT DEFAULT NULL,
  mvp_player_uuid UUID DEFAULT NULL
)
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
  
  -- Solo el creador puede finalizar
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Solo el organizador puede finalizar el partido';
  END IF;
  
  -- Solo se puede finalizar si está confirmado
  IF current_status != 'confirmed' THEN
    RAISE EXCEPTION 'El partido debe estar confirmado para finalizarse. Estado actual: %', current_status;
  END IF;
  
  -- Finalizar partido con resultados opcionales
  UPDATE matches
  SET 
    status = 'finished',
    score_team_a = COALESCE(team_a_score, score_team_a),
    score_team_b = COALESCE(team_b_score, score_team_b),
    winning_team = COALESCE(winning_team_input, winning_team),
    mvp_player_id = COALESCE(mvp_player_uuid, mvp_player_id),
    updated_at = NOW()
  WHERE id = match_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para auto-finalizar partidos pasados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION auto_finish_past_matches()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Finalizar partidos confirmados cuya fecha ya pasó (más de 3 horas)
  UPDATE matches
  SET status = 'finished', updated_at = NOW()
  WHERE status = 'confirmed'
    AND datetime < NOW() - INTERVAL '3 hours';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para reabrir partido finalizado (excepcional, solo organizador)
CREATE OR REPLACE FUNCTION reopen_finished_match(
  match_uuid UUID,
  user_uuid UUID
)
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
  
  -- Solo el creador puede reabrir
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Solo el organizador puede reabrir el partido';
  END IF;
  
  -- Solo se puede reabrir si está finalizado
  IF current_status != 'finished' THEN
    RAISE EXCEPTION 'Solo se pueden reabrir partidos finalizados';
  END IF;
  
  -- Reabrir a estado confirmado
  UPDATE matches
  SET status = 'confirmed', updated_at = NOW()
  WHERE id = match_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vista para partidos finalizados con estadísticas
CREATE OR REPLACE VIEW finished_matches_stats AS
SELECT 
  m.id,
  m.title,
  m.datetime,
  m.match_type,
  m.game_mode,
  m.score_team_a,
  m.score_team_b,
  m.winning_team,
  m.mvp_player_id,
  mvp.first_name || ' ' || mvp.last_name as mvp_name,
  m.created_by,
  creator.first_name || ' ' || creator.last_name as organizer_name,
  COUNT(DISTINCT mp.player_id) as total_players,
  m.created_at,
  m.updated_at
FROM matches m
LEFT JOIN profiles mvp ON mvp.id = m.mvp_player_id
LEFT JOIN profiles creator ON creator.id = m.created_by
LEFT JOIN match_players mp ON mp.match_id = m.id
WHERE m.status = 'finished'
GROUP BY 
  m.id, m.title, m.datetime, m.match_type, m.game_mode,
  m.score_team_a, m.score_team_b, m.winning_team, m.mvp_player_id,
  mvp.first_name, mvp.last_name, m.created_by,
  creator.first_name, creator.last_name, m.created_at, m.updated_at;

-- 6. Actualizar política RLS para permitir ver partidos finalizados
DROP POLICY IF EXISTS "Usuarios pueden ver partidos disponibles" ON matches;
CREATE POLICY "Usuarios pueden ver partidos disponibles"
  ON matches
  FOR SELECT
  TO authenticated
  USING (
    status IN ('open', 'full', 'confirmed', 'finished') OR
    created_by = auth.uid()
  );

-- 7. Función para obtener historial de un jugador
CREATE OR REPLACE FUNCTION get_player_match_history(
  player_uuid UUID,
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  match_id UUID,
  match_title TEXT,
  match_datetime TIMESTAMP WITH TIME ZONE,
  match_type TEXT,
  team TEXT,
  is_captain BOOLEAN,
  score_team_a INTEGER,
  score_team_b INTEGER,
  winning_team TEXT,
  was_mvp BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    m.title as match_title,
    m.datetime as match_datetime,
    m.match_type,
    mp.team,
    mp.is_captain,
    m.score_team_a,
    m.score_team_b,
    m.winning_team,
    (m.mvp_player_id = player_uuid) as was_mvp
  FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  WHERE m.status = 'finished'
    AND mp.player_id = player_uuid
  ORDER BY m.datetime DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Índice para mejorar consultas de partidos finalizados
CREATE INDEX IF NOT EXISTS idx_matches_finished_datetime 
  ON matches(datetime DESC) 
  WHERE status = 'finished';

-- 9. Función para estadísticas de jugador
CREATE OR REPLACE FUNCTION get_player_stats(player_uuid UUID)
RETURNS TABLE (
  total_matches BIGINT,
  matches_won BIGINT,
  matches_lost BIGINT,
  mvp_count BIGINT,
  captain_count BIGINT,
  total_goals INTEGER,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_matches,
    COUNT(*) FILTER (
      WHERE (mp.team = m.winning_team)
    ) as matches_won,
    COUNT(*) FILTER (
      WHERE (mp.team IS NOT NULL AND mp.team != m.winning_team AND m.winning_team IS NOT NULL)
    ) as matches_lost,
    COUNT(*) FILTER (WHERE m.mvp_player_id = player_uuid) as mvp_count,
    COUNT(*) FILTER (WHERE mp.is_captain = true) as captain_count,
    COALESCE(SUM(ps.goals), 0)::INTEGER as total_goals,
    CASE 
      WHEN COUNT(*) > 0 THEN
        ROUND(
          COUNT(*) FILTER (WHERE mp.team = m.winning_team) * 100.0 / COUNT(*),
          2
        )
      ELSE 0
    END as win_rate
  FROM match_players mp
  JOIN matches m ON m.id = mp.match_id
  LEFT JOIN player_stats ps ON ps.player_id = player_uuid AND ps.match_id = m.id
  WHERE m.status = 'finished'
    AND mp.player_id = player_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'finish_match',
  'auto_finish_past_matches',
  'reopen_finished_match',
  'get_player_match_history',
  'get_player_stats'
)
ORDER BY routine_name;

-- Ver vista creada
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'finished_matches_stats';

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

/*
-- 1. Finalizar partido manualmente (organizador)
SELECT finish_match(
  '[match-uuid]'::UUID,
  '[user-uuid]'::UUID,
  5,  -- score equipo A
  3,  -- score equipo B
  'A', -- equipo ganador
  '[mvp-uuid]'::UUID
);

-- 2. Auto-finalizar partidos pasados (cron job)
SELECT auto_finish_past_matches();
-- Resultado: Número de partidos finalizados

-- 3. Ver estadísticas de partidos finalizados
SELECT * FROM finished_matches_stats
ORDER BY datetime DESC
LIMIT 10;

-- 4. Ver historial de un jugador
SELECT * FROM get_player_match_history('[player-uuid]'::UUID, 10, 0);

-- 5. Ver estadísticas de un jugador
SELECT * FROM get_player_stats('[player-uuid]'::UUID);

-- 6. Reabrir partido finalizado (excepcional)
SELECT reopen_finished_match('[match-uuid]'::UUID, '[user-uuid]'::UUID);
*/

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
Estado FINISHED:

Características:
- Partido terminado y jugado
- Visible en historial
- Puede tener resultados (scores, ganador, MVP)
- Los jugadores NO pueden unirse ni salir
- Cuenta para estadísticas de jugadores

Transiciones:
- confirmed → finished (manual: organizador marca como finalizado)
- confirmed → finished (automático: 3h después de la hora programada)
- finished → confirmed (excepcional: reabrir partido)

UI Sugerida:
- Badge "🏆 Finalizado" en verde oscuro
- Mostrar scores si existen
- Mostrar MVP si existe
- Botón "Ver Resultados" para detalles
- En historial personal del jugador

Casos de Uso:
1. Organizador finaliza manualmente después del partido
2. Sistema auto-finaliza partidos confirmados pasados
3. Jugadores ven su historial de partidos
4. Sistema calcula estadísticas (victorias, derrotas, MVP)
5. Rankings y tablas de posiciones (futuro)

Automatización:
- Ejecutar auto_finish_past_matches() cada hora (cron job)
- O implementar como función de Edge en Supabase
- O trigger temporal en la base de datos
*/
