-- ============================================
-- MIGRACIÓN: Actualizar Player Stats al Finalizar Partido
-- ============================================
-- Cuando un partido se finaliza, actualiza automáticamente
-- las estadísticas de todos los jugadores participantes
-- ============================================

-- 1. Función para actualizar estadísticas de jugadores
CREATE OR REPLACE FUNCTION update_player_stats_on_match_finish()
RETURNS TRIGGER AS $$
DECLARE
  player_record RECORD;
  is_winner BOOLEAN;
  is_draw BOOLEAN;
BEGIN
  -- Solo ejecutar cuando el estado cambia a 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    
    -- Determinar si fue empate
    is_draw := (NEW.winning_team = 'empate' OR NEW.winning_team IS NULL);
    
    -- Iterar sobre todos los jugadores del partido
    FOR player_record IN 
      SELECT 
        mp.player_id,
        mp.team,
        mp.position
      FROM match_players mp
      WHERE mp.match_id = NEW.id
    LOOP
      -- Determinar si el jugador ganó
      IF is_draw THEN
        is_winner := FALSE;
      ELSIF NEW.winning_team IS NOT NULL AND player_record.team IS NOT NULL THEN
        is_winner := (player_record.team = NEW.winning_team);
      ELSE
        is_winner := FALSE;
      END IF;
      
      -- Actualizar o insertar estadísticas del jugador
      INSERT INTO player_stats (
        player_id,
        total_matches,
        wins,
        losses,
        draws,
        mvp_count,
        gk_count,
        df_count,
        mf_count,
        fw_count,
        updated_at
      )
      VALUES (
        player_record.player_id,
        1,
        CASE WHEN is_winner THEN 1 ELSE 0 END,
        CASE WHEN NOT is_winner AND NOT is_draw AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN is_draw THEN 1 ELSE 0 END,
        CASE WHEN NEW.mvp_player_id = player_record.player_id THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'GK' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'DF' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'MF' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'FW' THEN 1 ELSE 0 END,
        NOW()
      )
      ON CONFLICT (player_id)
      DO UPDATE SET
        total_matches = player_stats.total_matches + 1,
        wins = player_stats.wins + CASE WHEN is_winner THEN 1 ELSE 0 END,
        losses = player_stats.losses + CASE WHEN NOT is_winner AND NOT is_draw AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,
        draws = player_stats.draws + CASE WHEN is_draw THEN 1 ELSE 0 END,
        mvp_count = player_stats.mvp_count + CASE WHEN NEW.mvp_player_id = player_record.player_id THEN 1 ELSE 0 END,
        gk_count = player_stats.gk_count + CASE WHEN player_record.position = 'GK' THEN 1 ELSE 0 END,
        df_count = player_stats.df_count + CASE WHEN player_record.position = 'DF' THEN 1 ELSE 0 END,
        mf_count = player_stats.mf_count + CASE WHEN player_record.position = 'MF' THEN 1 ELSE 0 END,
        fw_count = player_stats.fw_count + CASE WHEN player_record.position = 'FW' THEN 1 ELSE 0 END,
        updated_at = NOW();
      
    END LOOP;
    
    RAISE NOTICE 'Player stats updated for match: %', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger para actualizar stats cuando partido se finaliza
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_finish ON matches;
CREATE TRIGGER trigger_update_player_stats_on_finish
  AFTER UPDATE OF status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match_finish();

-- 3. Función auxiliar para recalcular stats de un jugador (útil para correcciones)
CREATE OR REPLACE FUNCTION recalculate_player_stats(player_uuid UUID)
RETURNS VOID AS $$
DECLARE
  match_record RECORD;
  stats_total_matches INTEGER := 0;
  stats_wins INTEGER := 0;
  stats_losses INTEGER := 0;
  stats_draws INTEGER := 0;
  stats_mvp_count INTEGER := 0;
  stats_gk_count INTEGER := 0;
  stats_df_count INTEGER := 0;
  stats_mf_count INTEGER := 0;
  stats_fw_count INTEGER := 0;
  is_winner BOOLEAN;
  is_draw BOOLEAN;
BEGIN
  -- Iterar sobre todos los partidos finalizados del jugador
  FOR match_record IN
    SELECT 
      m.id,
      m.winning_team,
      m.mvp_player_id,
      mp.team,
      mp.position
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.id
    WHERE m.status = 'finished'
      AND mp.player_id = player_uuid
  LOOP
    stats_total_matches := stats_total_matches + 1;
    
    -- Determinar si fue empate
    is_draw := (match_record.winning_team = 'empate' OR match_record.winning_team IS NULL);
    
    -- Determinar si ganó
    IF is_draw THEN
      stats_draws := stats_draws + 1;
      is_winner := FALSE;
    ELSIF match_record.winning_team IS NOT NULL AND match_record.team IS NOT NULL THEN
      is_winner := (match_record.team = match_record.winning_team);
      IF is_winner THEN
        stats_wins := stats_wins + 1;
      ELSE
        stats_losses := stats_losses + 1;
      END IF;
    END IF;
    
    -- MVP
    IF match_record.mvp_player_id = player_uuid THEN
      stats_mvp_count := stats_mvp_count + 1;
    END IF;
    
    -- Posiciones
    CASE match_record.position
      WHEN 'GK' THEN stats_gk_count := stats_gk_count + 1;
      WHEN 'DF' THEN stats_df_count := stats_df_count + 1;
      WHEN 'MF' THEN stats_mf_count := stats_mf_count + 1;
      WHEN 'FW' THEN stats_fw_count := stats_fw_count + 1;
      ELSE NULL;
    END CASE;
    
  END LOOP;
  
  -- Actualizar o insertar stats
  INSERT INTO player_stats (
    player_id,
    total_matches,
    wins,
    losses,
    draws,
    mvp_count,
    gk_count,
    df_count,
    mf_count,
    fw_count,
    updated_at
  )
  VALUES (
    player_uuid,
    stats_total_matches,
    stats_wins,
    stats_losses,
    stats_draws,
    stats_mvp_count,
    stats_gk_count,
    stats_df_count,
    stats_mf_count,
    stats_fw_count,
    NOW()
  )
  ON CONFLICT (player_id)
  DO UPDATE SET
    total_matches = EXCLUDED.total_matches,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    draws = EXCLUDED.draws,
    mvp_count = EXCLUDED.mvp_count,
    gk_count = EXCLUDED.gk_count,
    df_count = EXCLUDED.df_count,
    mf_count = EXCLUDED.mf_count,
    fw_count = EXCLUDED.fw_count,
    updated_at = NOW();
    
  RAISE NOTICE 'Player stats recalculated for player: %', player_uuid;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para recalcular stats de todos los jugadores (mantenimiento)
CREATE OR REPLACE FUNCTION recalculate_all_player_stats()
RETURNS TABLE (
  player_id UUID,
  total_matches INTEGER,
  status TEXT
) AS $$
DECLARE
  player_uuid UUID;
BEGIN
  -- Obtener todos los jugadores únicos que han participado en partidos
  FOR player_uuid IN
    SELECT DISTINCT mp.player_id
    FROM match_players mp
    JOIN matches m ON m.id = mp.match_id
    WHERE m.status = 'finished'
  LOOP
    BEGIN
      PERFORM recalculate_player_stats(player_uuid);
      
      player_id := player_uuid;
      SELECT ps.total_matches INTO total_matches
      FROM player_stats ps
      WHERE ps.player_id = player_uuid;
      status := 'success';
      
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      player_id := player_uuid;
      total_matches := 0;
      status := 'error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver trigger creado
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_player_stats_on_finish';

-- Ver funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'update_player_stats_on_match_finish',
  'recalculate_player_stats',
  'recalculate_all_player_stats'
)
ORDER BY routine_name;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

/*
-- 1. Las estadísticas se actualizan automáticamente al finalizar partido
UPDATE matches
SET status = 'finished', winning_team = 'A', mvp_player_id = '[uuid]'
WHERE id = '[match-uuid]';
-- Los stats de todos los jugadores se actualizan automáticamente

-- 2. Recalcular stats de un jugador específico (si hay inconsistencias)
SELECT recalculate_player_stats('[player-uuid]'::UUID);

-- 3. Recalcular stats de todos los jugadores (mantenimiento)
SELECT * FROM recalculate_all_player_stats();

-- 4. Ver estadísticas de un jugador
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.wins,
  ps.losses,
  ps.draws,
  ps.mvp_count,
  ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) as win_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.player_id = '[player-uuid]'::UUID;

-- 5. Top jugadores por victorias
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.wins,
  ps.mvp_count,
  ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) as win_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.total_matches > 0
ORDER BY ps.wins DESC, win_rate DESC
LIMIT 10;

-- 6. Top jugadores MVP
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.mvp_count,
  ROUND(ps.mvp_count * 100.0 / NULLIF(ps.total_matches, 0), 2) as mvp_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.total_matches > 0
ORDER BY ps.mvp_count DESC, mvp_rate DESC
LIMIT 10;
*/

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
Cómo Funciona:

1. TRIGGER AUTOMÁTICO:
   - Se ejecuta DESPUÉS de UPDATE en matches
   - Solo cuando el campo 'status' cambia
   - Solo cuando el nuevo estado es 'finished'

2. LÓGICA DE ACTUALIZACIÓN:
   - Itera sobre todos los jugadores del partido (match_players)
   - Para cada jugador:
     * total_matches +1
     * wins +1 si su equipo ganó
     * losses +1 si su equipo perdió
     * draws +1 si fue empate
     * mvp_count +1 si fue el MVP
     * position counts según su posición

3. UPSERT:
   - Si el jugador NO tiene registro en player_stats:
     → Crea uno nuevo con los valores iniciales
   - Si el jugador YA tiene registro:
     → Incrementa los contadores existentes

4. FUNCIONES AUXILIARES:
   - recalculate_player_stats(uuid):
     → Recalcula desde cero las stats de un jugador
     → Útil si hay inconsistencias o errores
   
   - recalculate_all_player_stats():
     → Recalcula stats de TODOS los jugadores
     → Útil para mantenimiento o migraciones

5. CASOS ESPECIALES:
   - Si winning_team es NULL → No suma win ni loss
   - Si winning_team = 'empate' → Suma 1 a draws
   - Si position es NULL → No suma a ningún contador de posición
   - Si team del jugador es NULL → No puede ganar/perder

Campos Actualizados:
✓ total_matches  - Total de partidos jugados
✓ wins           - Victorias (si su equipo ganó)
✓ losses         - Derrotas (si su equipo perdió)
✓ draws          - Empates
✓ mvp_count      - Veces que fue MVP
✓ gk_count       - Partidos como Portero (GK)
✓ df_count       - Partidos como Defensa (DF)
✓ mf_count       - Partidos como Mediocampista (MF)
✓ fw_count       - Partidos como Delantero (FW)
✓ updated_at     - Timestamp de última actualización

NO se actualiza:
✗ current_level  - Se puede calcular después basado en total_matches
✗ created_at     - Se mantiene al crear el registro
*/
