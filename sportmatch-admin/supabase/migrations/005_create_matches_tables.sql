-- ============================================
-- MIGRACIÓN: Crear tablas de Matches
-- ============================================
-- Este script crea las tablas para gestionar partidos
-- y los jugadores que participan en ellos
-- ============================================

-- 1. Crear o actualizar tabla matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NULL DEFAULT 10,
  match_type TEXT NULL DEFAULT 'futbol'::TEXT,
  game_mode TEXT NULL DEFAULT 'mixed'::TEXT,
  price INTEGER NULL DEFAULT 0,
  created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NULL DEFAULT 'pending'::TEXT,
  score_team_a INTEGER NULL DEFAULT 0,
  score_team_b INTEGER NULL DEFAULT 0,
  winning_team TEXT NULL,
  mvp_player_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT matches_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 1.1 Migrar estructura antigua a nueva (si existe)
-- Eliminar columnas antiguas de ubicación si existen
ALTER TABLE public.matches DROP COLUMN IF EXISTS address CASCADE;
ALTER TABLE public.matches DROP COLUMN IF EXISTS country_id CASCADE;
ALTER TABLE public.matches DROP COLUMN IF EXISTS region_id CASCADE;
ALTER TABLE public.matches DROP COLUMN IF EXISTS city_id CASCADE;

-- Agregar columna court_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'matches' 
    AND column_name = 'court_id'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN court_id UUID NULL REFERENCES courts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Crear tabla match_players
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  match_id UUID NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team TEXT NULL,
  position TEXT NULL,
  is_captain BOOLEAN NULL DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT match_players_pkey PRIMARY KEY (id),
  -- Evitar que un jugador se una dos veces al mismo partido
  CONSTRAINT unique_player_per_match UNIQUE (match_id, player_id)
) TABLESPACE pg_default;

-- 3. Habilitar RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad para matches
-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Todos pueden ver partidos públicos" ON matches;
DROP POLICY IF EXISTS "El creador puede actualizar su partido" ON matches;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear partidos" ON matches;
DROP POLICY IF EXISTS "El creador puede eliminar su partido pendiente" ON matches;

-- Crear políticas para matches
-- Todos pueden ver partidos pendientes o confirmados
CREATE POLICY "Todos pueden ver partidos públicos"
  ON matches FOR SELECT
  USING (status IN ('pending', 'confirmed', 'in_progress', 'completed'));

-- Solo el creador puede actualizar su partido (antes de que empiece)
CREATE POLICY "El creador puede actualizar su partido"
  ON matches FOR UPDATE
  USING (auth.uid() = created_by AND status = 'pending');

-- Cualquier usuario autenticado puede crear un partido
CREATE POLICY "Usuarios autenticados pueden crear partidos"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- El creador puede eliminar su partido (solo si está pendiente)
CREATE POLICY "El creador puede eliminar su partido pendiente"
  ON matches FOR DELETE
  USING (auth.uid() = created_by AND status = 'pending');

-- 5. Políticas de seguridad para match_players
-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Todos pueden ver jugadores de partidos" ON match_players;
DROP POLICY IF EXISTS "Usuarios pueden unirse a partidos" ON match_players;
DROP POLICY IF EXISTS "Jugadores pueden salir de partidos" ON match_players;
DROP POLICY IF EXISTS "Creador puede actualizar jugadores" ON match_players;

-- Crear políticas para match_players
-- Todos pueden ver los jugadores de un partido
CREATE POLICY "Todos pueden ver jugadores de partidos"
  ON match_players FOR SELECT
  USING (true);

-- Usuarios autenticados pueden unirse a partidos
CREATE POLICY "Usuarios pueden unirse a partidos"
  ON match_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Los jugadores pueden salirse de un partido
CREATE POLICY "Jugadores pueden salir de partidos"
  ON match_players FOR DELETE
  USING (auth.uid() = player_id);

-- El creador del partido puede actualizar equipos y posiciones
CREATE POLICY "Creador puede actualizar jugadores"
  ON match_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_players.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_datetime ON matches(datetime);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON matches(match_type);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- 7. Trigger para updated_at en matches
DROP TRIGGER IF EXISTS on_match_updated ON matches;
CREATE TRIGGER on_match_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 8. Función para actualizar estadísticas después de un partido
CREATE OR REPLACE FUNCTION public.update_player_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si el partido se completó
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Actualizar estadísticas de todos los jugadores del partido
    UPDATE player_stats
    SET 
      total_matches = total_matches + 1,
      wins = wins + CASE 
        WHEN mp.team = NEW.winning_team THEN 1 
        ELSE 0 
      END,
      losses = losses + CASE 
        WHEN mp.team != NEW.winning_team AND NEW.winning_team IS NOT NULL THEN 1 
        ELSE 0 
      END,
      draws = draws + CASE 
        WHEN NEW.winning_team IS NULL THEN 1 
        ELSE 0 
      END,
      mvp_count = mvp_count + CASE 
        WHEN NEW.mvp_player_id = mp.player_id THEN 1 
        ELSE 0 
      END,
      gk_count = gk_count + CASE WHEN mp.position = 'GK' THEN 1 ELSE 0 END,
      df_count = df_count + CASE WHEN mp.position = 'DF' THEN 1 ELSE 0 END,
      mf_count = mf_count + CASE WHEN mp.position = 'MF' THEN 1 ELSE 0 END,
      fw_count = fw_count + CASE WHEN mp.position = 'FW' THEN 1 ELSE 0 END,
      updated_at = NOW()
    FROM match_players mp
    WHERE mp.match_id = NEW.id 
    AND player_stats.player_id = mp.player_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger para actualizar estadísticas al completar partido
DROP TRIGGER IF EXISTS on_match_completed ON matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON matches
  FOR EACH ROW 
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.update_player_stats_after_match();

-- ============================================
-- COMENTARIOS SOBRE LAS TABLAS
-- ============================================

COMMENT ON TABLE matches IS 'Tabla que almacena información de los partidos creados';
COMMENT ON TABLE match_players IS 'Tabla que relaciona jugadores con partidos';

COMMENT ON COLUMN matches.court_id IS 'Cancha donde se juega el partido (FK a courts)';
COMMENT ON COLUMN matches.match_type IS 'Tipo de deporte: futbol, basketball, volleyball, etc.';
COMMENT ON COLUMN matches.game_mode IS 'Modo de juego: mixed (mixto), male (masculino), female (femenino)';
COMMENT ON COLUMN matches.status IS 'Estado: pending, confirmed, in_progress, completed, cancelled';
COMMENT ON COLUMN matches.winning_team IS 'Equipo ganador: team_a, team_b, o NULL para empate';
COMMENT ON COLUMN match_players.team IS 'Equipo asignado: team_a, team_b, o NULL si no está asignado';
COMMENT ON COLUMN match_players.position IS 'Posición: GK (portero), DF (defensa), MF (medio), FW (delantero)';
