-- ============================================
-- MIGRACIONES FALTANTES - ACTUALIZACIÓN
-- Ejecutar en Supabase SQL Editor
-- ============================================
-- Este archivo contiene SOLO las migraciones que faltan
-- en tu base de datos actual
-- ============================================

-- ============================================
-- MIGRACIÓN 006: Separar gender_restriction de game_mode
-- ============================================

-- 1. Agregar columna gender_restriction
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS gender_restriction TEXT NULL DEFAULT 'mixed'::TEXT;

-- 2. Migrar datos existentes: copiar game_mode a gender_restriction si es necesario
UPDATE matches 
SET gender_restriction = game_mode
WHERE game_mode IN ('mixed', 'male', 'female');

-- 3. Actualizar game_mode a 'selection' para partidos que tenían gender en game_mode
UPDATE matches
SET game_mode = 'selection'
WHERE game_mode IN ('mixed', 'male', 'female');

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_matches_gender_restriction ON matches(gender_restriction);

-- 5. Comentarios
COMMENT ON COLUMN matches.game_mode IS 'Modo de juego: selection (selección libre), random (aleatorio), teams (equipos creados)';
COMMENT ON COLUMN matches.gender_restriction IS 'Género: mixed (mixto), male (masculino), female (femenino)';


-- ============================================
-- MIGRACIÓN 009: Agregar finished_at y funciones
-- ============================================

-- 1. Agregar columna finished_at
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Actualizar comentario de status
COMMENT ON COLUMN matches.status IS 'Estado del partido: draft (borrador), open (abierto), full (lleno), confirmed (confirmado), finished (finalizado), cancelled (cancelado)';

-- 3. Función para finalizar partido
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
  SELECT created_by = user_uuid, status
  INTO is_creator, current_status
  FROM matches
  WHERE id = match_uuid;
  
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Solo el organizador puede finalizar el partido';
  END IF;
  
  IF current_status != 'confirmed' THEN
    RAISE EXCEPTION 'El partido debe estar confirmado para finalizarse. Estado actual: %', current_status;
  END IF;
  
  UPDATE matches
  SET 
    status = 'finished',
    score_team_a = COALESCE(team_a_score, score_team_a),
    score_team_b = COALESCE(team_b_score, score_team_b),
    winning_team = COALESCE(winning_team_input, winning_team),
    mvp_player_id = COALESCE(mvp_player_uuid, mvp_player_id),
    finished_at = NOW(),
    updated_at = NOW()
  WHERE id = match_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para auto-finalizar partidos pasados
CREATE OR REPLACE FUNCTION auto_finish_past_matches()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE matches
  SET status = 'finished', finished_at = NOW(), updated_at = NOW()
  WHERE status = 'confirmed'
    AND datetime < NOW() - INTERVAL '3 hours';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar política RLS para permitir ver partidos finished
DROP POLICY IF EXISTS "Usuarios pueden ver partidos disponibles" ON matches;
CREATE POLICY "Usuarios pueden ver partidos disponibles"
  ON matches FOR SELECT TO authenticated
  USING (
    status IN ('open', 'full', 'confirmed', 'finished') OR
    created_by = auth.uid()
  );

-- 6. Índice para partidos finalizados
CREATE INDEX IF NOT EXISTS idx_matches_finished_datetime 
  ON matches(datetime DESC) 
  WHERE status = 'finished';


-- ============================================
-- MIGRACIÓN 010: Fix RLS para finalizar partidos
-- ============================================

DROP POLICY IF EXISTS "Organizador puede actualizar su partido" ON matches;
CREATE POLICY "Organizador puede actualizar su partido"
  ON matches FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open', 'full', 'confirmed', 'finished', 'cancelled')
  );


-- ============================================
-- MIGRACIÓN 011 y 012: Player Stats al finalizar
-- ============================================

-- 1. Habilitar RLS en player_stats (si no está)
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS para player_stats
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las estadísticas" ON player_stats;
CREATE POLICY "Usuarios autenticados pueden ver todas las estadísticas"
  ON player_stats FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Sistema y usuario pueden insertar estadísticas" ON player_stats;
CREATE POLICY "Sistema y usuario pueden insertar estadísticas"
  ON player_stats FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid() OR
    current_setting('role', true) = 'authenticated'
  );

DROP POLICY IF EXISTS "Sistema puede actualizar estadísticas" ON player_stats;
CREATE POLICY "Sistema puede actualizar estadísticas"
  ON player_stats FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Función para upsert de stats
CREATE OR REPLACE FUNCTION upsert_player_stats(
  p_player_id UUID,
  p_total_matches INTEGER DEFAULT 0,
  p_wins INTEGER DEFAULT 0,
  p_losses INTEGER DEFAULT 0,
  p_draws INTEGER DEFAULT 0,
  p_mvp_count INTEGER DEFAULT 0,
  p_gk_count INTEGER DEFAULT 0,
  p_df_count INTEGER DEFAULT 0,
  p_mf_count INTEGER DEFAULT 0,
  p_fw_count INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO player_stats (
    player_id, total_matches, wins, losses, draws, mvp_count,
    gk_count, df_count, mf_count, fw_count, updated_at
  )
  VALUES (
    p_player_id, p_total_matches, p_wins, p_losses, p_draws, p_mvp_count,
    p_gk_count, p_df_count, p_mf_count, p_fw_count, NOW()
  )
  ON CONFLICT (player_id)
  DO UPDATE SET
    total_matches = player_stats.total_matches + p_total_matches,
    wins = player_stats.wins + p_wins,
    losses = player_stats.losses + p_losses,
    draws = player_stats.draws + p_draws,
    mvp_count = player_stats.mvp_count + p_mvp_count,
    gk_count = player_stats.gk_count + p_gk_count,
    df_count = player_stats.df_count + p_df_count,
    mf_count = player_stats.mf_count + p_mf_count,
    fw_count = player_stats.fw_count + p_fw_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función trigger para actualizar stats
CREATE OR REPLACE FUNCTION update_player_stats_on_match_finish()
RETURNS TRIGGER AS $$
DECLARE
  player_record RECORD;
  is_winner BOOLEAN;
  is_draw BOOLEAN;
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    
    is_draw := (NEW.winning_team = 'empate' OR NEW.winning_team IS NULL);
    
    FOR player_record IN 
      SELECT mp.player_id, mp.team, mp.position
      FROM match_players mp
      WHERE mp.match_id = NEW.id
    LOOP
      IF is_draw THEN
        is_winner := FALSE;
      ELSIF NEW.winning_team IS NOT NULL AND player_record.team IS NOT NULL THEN
        is_winner := (player_record.team = NEW.winning_team);
      ELSE
        is_winner := FALSE;
      END IF;
      
      PERFORM upsert_player_stats(
        player_record.player_id,
        1,
        CASE WHEN is_winner THEN 1 ELSE 0 END,
        CASE WHEN NOT is_winner AND NOT is_draw AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN is_draw THEN 1 ELSE 0 END,
        CASE WHEN NEW.mvp_player_id = player_record.player_id THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'GK' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'DF' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'MF' THEN 1 ELSE 0 END,
        CASE WHEN player_record.position = 'FW' THEN 1 ELSE 0 END
      );
      
    END LOOP;
    
    RAISE NOTICE 'Player stats updated for match: %', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear trigger
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_finish ON matches;
CREATE TRIGGER trigger_update_player_stats_on_finish
  AFTER UPDATE OF status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match_finish();


-- ============================================
-- MIGRACIÓN 013: Bucket de avatares
-- ============================================

-- Crear bucket para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para storage de avatares
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');


-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar columnas de matches
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('gender_restriction', 'finished_at')
ORDER BY column_name;

-- Verificar funciones creadas
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name IN (
  'finish_match',
  'auto_finish_past_matches',
  'upsert_player_stats',
  'update_player_stats_on_match_finish'
)
ORDER BY routine_name;

-- Verificar bucket de avatares
SELECT name, public FROM storage.buckets WHERE id = 'avatars';

SELECT 'Migración completada exitosamente' as resultado;
