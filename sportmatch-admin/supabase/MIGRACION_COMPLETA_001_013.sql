-- ============================================
-- MIGRACIÓN CONSOLIDADA COMPLETA 001-013
-- SPORTMATCH - Sistema Completo
-- Fecha: 2026-02-10
-- ============================================
--
-- Este archivo consolida TODAS las migraciones del proyecto:
-- - 001: Tablas admin, courts, bookings
-- - 002: Ubicación en admin_users
-- - 003: Remover ubicación de courts
-- - 004: Añadir sport_type a courts
-- - 005: Crear tablas matches y match_players
-- - 006 (schedules): Crear tabla schedules
-- - 006 (game_mode): Separar gender de game_mode
-- - 007 (bookings): Políticas admin para bookings
-- - 007 (profiles): Permitir leer todos los perfiles
-- - 008 (pricing): Añadir pricing a schedules (luego eliminado)
-- - 008 (status): Sistema de estados de partido
-- - 009 (pricing): Refactorizar precios día/noche
-- - 009 (finished): Estado finished para partidos
-- - 010: Fix RLS para finalizar partidos
-- - 011: Actualizar player_stats al finalizar
-- - 012: Fix RLS para player_stats
-- - 013: Bucket de avatares
--
-- ⚠️ IMPORTANTE: Si ya ejecutaste algunas migraciones,
-- este script tiene protecciones IF NOT EXISTS / IF EXISTS
-- para evitar errores, pero es recomendable ejecutar
-- solo las secciones que faltan.
--
-- ============================================


-- ============================================
-- PARTE 1: TABLAS PRINCIPALES (001)
-- ============================================

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  phone TEXT,
  address TEXT,
  country_id INTEGER REFERENCES countries(id),
  region_id INTEGER REFERENCES regions(id),
  city_id INTEGER REFERENCES cities(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla de canchas
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sport_type TEXT,
  surface_type TEXT,
  has_lighting BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  has_changing_rooms BOOLEAN DEFAULT false,
  day_price DECIMAL(10, 2) DEFAULT 0,
  night_price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'CLP',
  capacity INTEGER,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users
DROP POLICY IF EXISTS "Los admin pueden ver su propio perfil" ON admin_users;
CREATE POLICY "Los admin pueden ver su propio perfil"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los admin pueden actualizar su propio perfil" ON admin_users;
CREATE POLICY "Los admin pueden actualizar su propio perfil"
  ON admin_users FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para courts
DROP POLICY IF EXISTS "Todos pueden ver canchas activas" ON courts;
CREATE POLICY "Todos pueden ver canchas activas"
  ON courts FOR SELECT
  USING (is_active = true OR auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden insertar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden actualizar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden actualizar sus propias canchas"
  ON courts FOR UPDATE
  USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden eliminar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden eliminar sus propias canchas"
  ON courts FOR DELETE
  USING (auth.uid() = admin_id);

-- Políticas para bookings
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias reservas" ON bookings;
CREATE POLICY "Los usuarios pueden ver sus propias reservas"
  ON bookings FOR SELECT
  USING (
    auth.uid() = player_id 
    OR auth.uid() IN (
      SELECT admin_id FROM courts WHERE id = bookings.court_id
    )
  );

DROP POLICY IF EXISTS "Insertar reservas: jugador o admin" ON bookings;
CREATE POLICY "Insertar reservas: jugador o admin"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "Eliminar reservas: jugador o admin" ON bookings;
CREATE POLICY "Eliminar reservas: jugador o admin"
  ON bookings FOR DELETE TO authenticated
  USING (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "Los usuarios y admins pueden actualizar reservas" ON bookings;
CREATE POLICY "Los usuarios y admins pueden actualizar reservas"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = player_id 
    OR auth.uid() IN (
      SELECT admin_id FROM courts WHERE id = bookings.court_id
    )
  );

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_users_updated_at ON admin_users;
CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_courts_updated_at ON courts;
CREATE TRIGGER trigger_update_courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW
  EXECUTE FUNCTION update_courts_updated_at();

CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_country_id ON admin_users(country_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_region_id ON admin_users(region_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_city_id ON admin_users(city_id);
CREATE INDEX IF NOT EXISTS idx_courts_admin_id ON courts(admin_id);
CREATE INDEX IF NOT EXISTS idx_courts_is_active ON courts(is_active);
CREATE INDEX IF NOT EXISTS idx_courts_sport_type ON courts(sport_type);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_player_id ON bookings(player_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Comentarios
COMMENT ON COLUMN courts.day_price IS 'Precio por hora para horario diurno (apertura - 19:00)';
COMMENT ON COLUMN courts.night_price IS 'Precio por hora para horario nocturno (19:00 - cierre)';
COMMENT ON COLUMN courts.sport_type IS 'Tipo de deporte: football, tennis, basketball, volleyball, paddle, etc.';


-- ============================================
-- PARTE 2: TABLA SCHEDULES (006)
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

CREATE INDEX IF NOT EXISTS idx_schedules_court_id ON schedules(court_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_court_day ON schedules(court_id, day_of_week);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE schedules IS 'Horarios de disponibilidad de canchas por día de semana';
COMMENT ON COLUMN schedules.day_of_week IS '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';


-- ============================================
-- PARTE 3: TABLAS MATCHES (005)
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NULL DEFAULT 10,
  match_type TEXT NULL DEFAULT 'futbol'::TEXT,
  game_mode TEXT NULL DEFAULT 'selection'::TEXT,
  gender_restriction TEXT NULL DEFAULT 'mixed'::TEXT,
  price INTEGER NULL DEFAULT 0,
  created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NULL DEFAULT 'open'::TEXT,
  score_team_a INTEGER NULL DEFAULT 0,
  score_team_b INTEGER NULL DEFAULT 0,
  winning_team TEXT NULL,
  mvp_player_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  court_id UUID NULL REFERENCES courts(id) ON DELETE SET NULL,
  finished_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  match_id UUID NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team TEXT NULL,
  position TEXT NULL,
  is_captain BOOLEAN NULL DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT match_players_pkey PRIMARY KEY (id),
  CONSTRAINT unique_player_per_match UNIQUE (match_id, player_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Políticas para matches
DROP POLICY IF EXISTS "Usuarios pueden ver partidos disponibles" ON matches;
CREATE POLICY "Usuarios pueden ver partidos disponibles"
  ON matches FOR SELECT TO authenticated
  USING (
    status IN ('open', 'full', 'confirmed', 'finished') OR
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Organizador puede actualizar su partido" ON matches;
CREATE POLICY "Organizador puede actualizar su partido"
  ON matches FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open', 'full', 'confirmed', 'finished', 'cancelled')
  );

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear partidos" ON matches;
CREATE POLICY "Usuarios autenticados pueden crear partidos"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open')
  );

DROP POLICY IF EXISTS "El creador puede eliminar su partido pendiente" ON matches;
CREATE POLICY "El creador puede eliminar su partido pendiente"
  ON matches FOR DELETE
  USING (auth.uid() = created_by AND status = 'pending');

-- Políticas para match_players
DROP POLICY IF EXISTS "Todos pueden ver jugadores de partidos" ON match_players;
CREATE POLICY "Todos pueden ver jugadores de partidos"
  ON match_players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden unirse a partidos" ON match_players;
CREATE POLICY "Usuarios pueden unirse a partidos"
  ON match_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Jugadores pueden salir de partidos" ON match_players;
CREATE POLICY "Jugadores pueden salir de partidos"
  ON match_players FOR DELETE
  USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Creador puede actualizar jugadores" ON match_players;
CREATE POLICY "Creador puede actualizar jugadores"
  ON match_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = match_players.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Índices para matches
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_datetime ON matches(datetime);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON matches(match_type);
CREATE INDEX IF NOT EXISTS idx_matches_game_mode ON matches(game_mode);
CREATE INDEX IF NOT EXISTS idx_matches_gender_mode ON matches(gender_restriction);
CREATE INDEX IF NOT EXISTS idx_matches_status_datetime ON matches(status, datetime);
CREATE INDEX IF NOT EXISTS idx_matches_finished_datetime ON matches(datetime DESC) WHERE status = 'finished';
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- Comentarios
COMMENT ON COLUMN matches.game_mode IS 'Modo de juego: selection (selección libre), random (aleatorio), teams (equipos creados)';
COMMENT ON COLUMN matches.gender_restriction IS 'Género: mixed (mixto), male (masculino), female (femenino)';
COMMENT ON COLUMN matches.status IS 'Estado del partido: draft (borrador), open (abierto), full (lleno), confirmed (confirmado), finished (finalizado), cancelled (cancelado)';


-- ============================================
-- PARTE 4: POLÍTICAS PROFILES (007)
-- ============================================

DROP POLICY IF EXISTS "Users can only view their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede ver su perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todos los perfiles" ON profiles;

CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can only update their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede actualizar su perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios solo pueden actualizar su propio perfil" ON profiles;

CREATE POLICY "Usuarios solo pueden actualizar su propio perfil"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede crear su perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON profiles;

CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin pueden ver perfiles para reservas" ON profiles;
CREATE POLICY "Admin pueden ver perfiles para reservas"
  ON profiles FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );


-- ============================================
-- PARTE 5: SISTEMA DE ESTADOS (008)
-- ============================================

-- Actualizar partidos existentes de 'pending' a 'open'
UPDATE matches SET status = 'open' WHERE status = 'pending';

-- Función para actualizar estado automáticamente
CREATE OR REPLACE FUNCTION update_match_status_on_player_change()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  max_count INTEGER;
  current_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*), m.max_players, m.status
    INTO player_count, max_count, current_status
    FROM match_players mp
    JOIN matches m ON m.id = OLD.match_id
    WHERE mp.match_id = OLD.match_id
    GROUP BY m.max_players, m.status;
    
    player_count := player_count - 1;
    
    IF current_status = 'full' AND player_count < max_count THEN
      UPDATE matches SET status = 'open' WHERE id = OLD.match_id;
    END IF;
    
  ELSE -- INSERT
    SELECT COUNT(*), m.max_players, m.status
    INTO player_count, max_count, current_status
    FROM match_players mp
    JOIN matches m ON m.id = NEW.match_id
    WHERE mp.match_id = NEW.match_id
    GROUP BY m.max_players, m.status;
    
    IF current_status = 'open' AND player_count >= max_count THEN
      UPDATE matches SET status = 'full' WHERE id = NEW.match_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_match_status_on_player_change ON match_players;
CREATE TRIGGER trigger_match_status_on_player_change
  AFTER INSERT OR DELETE ON match_players
  FOR EACH ROW
  EXECUTE FUNCTION update_match_status_on_player_change();


-- ============================================
-- PARTE 6: FUNCIONES FINISH MATCH (009)
-- ============================================

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


-- ============================================
-- PARTE 7: ACTUALIZAR PLAYER STATS (011, 012)
-- ============================================

-- Habilitar RLS en player_stats
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para player_stats
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

-- Función para upsert de stats con privilegios elevados
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

-- Función para actualizar stats al finalizar partido
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

DROP TRIGGER IF EXISTS trigger_update_player_stats_on_finish ON matches;
CREATE TRIGGER trigger_update_player_stats_on_finish
  AFTER UPDATE OF status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match_finish();


-- ============================================
-- PARTE 8: BUCKET DE AVATARES (013)
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
-- PARTE 9: HABILITAR REALTIME
-- ============================================

-- Habilitar realtime para notificaciones en tiempo real
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ============================================
-- FIN DE MIGRACIÓN CONSOLIDADA
-- ============================================

-- Verificar instalación
SELECT 
  'Migración Completada' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_politicas,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as total_funciones;
