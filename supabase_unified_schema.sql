-- ============================================
-- SPORTMATCH - ESQUEMA UNIFICADO PARA SUPABASE
-- ============================================
-- Este archivo integra el esquema de ambos proyectos:
-- - sportmatch (app móvil): perfiles, ubicaciones, estadísticas, partidos
-- - sportmatch-admin (panel admin): canchas, reservas, administradores
--
-- CÓMO EJECUTAR:
-- 1. Ir a tu proyecto en Supabase Dashboard
-- 2. SQL Editor > New Query
-- 3. Pegar todo este contenido y ejecutar (Run)
--
-- REQUISITOS PREVIOS:
-- - Crear bucket 'avatars' en Storage (Dashboard > Storage) para fotos de perfil
-- - El script es idempotente: puede ejecutarse sobre una BD existente
--
-- TABLAS CREADAS:
-- Ubicación: countries, regions, cities (con datos de Chile)
-- Usuarios: profiles, admin_users, player_stats
-- Canchas: courts, bookings
-- Partidos: matches, match_players
-- ============================================

-- ============================================
-- SECCIÓN 1: TABLAS DE UBICACIÓN (CHILE)
-- ============================================

CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver países" ON countries;
CREATE POLICY "Todos pueden ver países"
  ON countries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden ver regiones" ON regions;
CREATE POLICY "Todos pueden ver regiones"
  ON regions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden ver ciudades" ON cities;
CREATE POLICY "Todos pueden ver ciudades"
  ON cities FOR SELECT USING (true);

-- Datos iniciales de Chile (solo si no existen)
INSERT INTO countries (name, code) 
SELECT 'Chile', 'CL' WHERE NOT EXISTS (SELECT 1 FROM countries WHERE code = 'CL');

INSERT INTO regions (name, country_id) 
SELECT v.name, c.id FROM (VALUES
  ('Arica y Parinacota'),
  ('Tarapacá'),
  ('Antofagasta'),
  ('Atacama'),
  ('Coquimbo'),
  ('Valparaíso'),
  ('Metropolitana de Santiago'),
  ('O''Higgins'),
  ('Maule'),
  ('Ñuble'),
  ('Biobío'),
  ('La Araucanía'),
  ('Los Ríos'),
  ('Los Lagos'),
  ('Aysén'),
  ('Magallanes')
) AS v(name)
CROSS JOIN (SELECT id FROM countries WHERE code = 'CL' LIMIT 1) c
WHERE NOT EXISTS (SELECT 1 FROM regions WHERE country_id = c.id LIMIT 1);

INSERT INTO cities (name, region_id) 
SELECT * FROM (VALUES
  ('Arica', 1), ('Putre', 1),
  ('Iquique', 2), ('Alto Hospicio', 2), ('Pozo Almonte', 2),
  ('Antofagasta', 3), ('Calama', 3), ('Tocopilla', 3), ('Mejillones', 3),
  ('Copiapó', 4), ('Vallenar', 4), ('Chañaral', 4),
  ('La Serena', 5), ('Coquimbo', 5), ('Ovalle', 5), ('Vicuña', 5),
  ('Valparaíso', 6), ('Viña del Mar', 6), ('Quilpué', 6), ('Villa Alemana', 6),
  ('Quillota', 6), ('San Antonio', 6), ('Los Andes', 6),
  ('Santiago', 7), ('Puente Alto', 7), ('Maipú', 7), ('La Florida', 7),
  ('Las Condes', 7), ('Providencia', 7), ('San Bernardo', 7), ('Ñuñoa', 7),
  ('Peñalolén', 7), ('La Reina', 7), ('Vitacura', 7), ('Lo Barnechea', 7),
  ('Colina', 7), ('Pudahuel', 7),
  ('Rancagua', 8), ('San Fernando', 8), ('Rengo', 8), ('Machalí', 8),
  ('Talca', 9), ('Curicó', 9), ('Linares', 9), ('Constitución', 9),
  ('Chillán', 10), ('Chillán Viejo', 10), ('San Carlos', 10),
  ('Concepción', 11), ('Talcahuano', 11), ('Los Ángeles', 11), ('Chiguayante', 11),
  ('San Pedro de la Paz', 11), ('Coronel', 11),
  ('Temuco', 12), ('Villarrica', 12), ('Angol', 12), ('Pucón', 12),
  ('Valdivia', 13), ('La Unión', 13), ('Río Bueno', 13),
  ('Puerto Montt', 14), ('Osorno', 14), ('Castro', 14), ('Ancud', 14), ('Puerto Varas', 14),
  ('Coyhaique', 15), ('Puerto Aysén', 15),
  ('Punta Arenas', 16), ('Puerto Natales', 16)
) AS v(name, region_id)
WHERE EXISTS (SELECT 1 FROM regions LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM cities LIMIT 1);

-- ============================================
-- SECCIÓN 2: TABLA DE PERFILES (App móvil)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  telefono TEXT,
  gender VARCHAR(10),
  birth_date DATE,
  country_id INTEGER REFERENCES countries(id),
  region_id INTEGER REFERENCES regions(id),
  city_id INTEGER REFERENCES cities(id),
  premiumstatus BOOLEAN DEFAULT FALSE,
  premiumfinalizedat TIMESTAMP WITH TIME ZONE,
  extra_matches_balance INTEGER DEFAULT 0 NOT NULL,
  team_creation_tokens INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- SECCIÓN 3: FUNCIONES AUXILIARES
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECCIÓN 4: ESTADÍSTICAS DE JUGADOR (App móvil)
-- ============================================

CREATE TABLE IF NOT EXISTS player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NULL,
  total_matches INTEGER NULL DEFAULT 0,
  wins INTEGER NULL DEFAULT 0,
  losses INTEGER NULL DEFAULT 0,
  draws INTEGER NULL DEFAULT 0,
  mvp_count INTEGER NULL DEFAULT 0,
  gk_count INTEGER NULL DEFAULT 0,
  df_count INTEGER NULL DEFAULT 0,
  mf_count INTEGER NULL DEFAULT 0,
  fw_count INTEGER NULL DEFAULT 0,
  current_level INTEGER NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT player_stats_pkey PRIMARY KEY (id),
  CONSTRAINT player_stats_player_id_key UNIQUE (player_id),
  CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE
);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias estadísticas" ON player_stats;
CREATE POLICY "Los usuarios pueden ver sus propias estadísticas"
  ON player_stats FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias estadísticas" ON player_stats;
CREATE POLICY "Los usuarios pueden actualizar sus propias estadísticas"
  ON player_stats FOR UPDATE USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias estadísticas" ON player_stats;
CREATE POLICY "Los usuarios pueden insertar sus propias estadísticas"
  ON player_stats FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_player_stats_updated ON player_stats;
CREATE TRIGGER on_player_stats_updated
  BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función y trigger para crear perfil + stats al registrarse (debe ir después de player_stats)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, extra_matches_balance)
  VALUES (new.id, new.email, 0);
  
  INSERT INTO public.player_stats (player_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECCIÓN 5: USUARIOS ADMINISTRADORES (Panel admin)
-- ============================================

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

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los admin pueden ver su propio perfil" ON admin_users;
CREATE POLICY "Los admin pueden ver su propio perfil"
  ON admin_users FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los admin pueden actualizar su propio perfil" ON admin_users;
CREATE POLICY "Los admin pueden actualizar su propio perfil"
  ON admin_users FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los admin pueden insertar su propio perfil" ON admin_users;
CREATE POLICY "Los admin pueden insertar su propio perfil"
  ON admin_users FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para lectura pública (necesaria para mostrar canchas con info del complejo)
DROP POLICY IF EXISTS "Todos pueden ver admin_users públicos" ON admin_users;
CREATE POLICY "Todos pueden ver admin_users públicos"
  ON admin_users FOR SELECT USING (true);

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
  FOR EACH ROW EXECUTE FUNCTION update_admin_users_updated_at();

-- Permitir que admins lean perfiles para crear reservas en nombre de jugadores
DROP POLICY IF EXISTS "Admin pueden ver perfiles para reservas" ON profiles;
CREATE POLICY "Admin pueden ver perfiles para reservas"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- ============================================
-- SECCIÓN 6: CANCHAS DEPORTIVAS (Panel admin)
-- ============================================

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sport_type TEXT,
  surface_type TEXT,
  has_lighting BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  has_changing_rooms BOOLEAN DEFAULT false,
  day_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  night_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CLP',
  capacity INTEGER,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver canchas activas" ON courts;
CREATE POLICY "Todos pueden ver canchas activas"
  ON courts FOR SELECT
  USING (is_active = true OR auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden insertar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden actualizar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden actualizar sus propias canchas"
  ON courts FOR UPDATE USING (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Los admin pueden eliminar sus propias canchas" ON courts;
CREATE POLICY "Los admin pueden eliminar sus propias canchas"
  ON courts FOR DELETE USING (auth.uid() = admin_id);

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
  FOR EACH ROW EXECUTE FUNCTION update_courts_updated_at();

-- ============================================
-- SECCIÓN 7: RESERVAS (Panel admin)
-- ============================================

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

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias reservas" ON bookings;
CREATE POLICY "Los usuarios pueden ver sus propias reservas"
  ON bookings FOR SELECT
  USING (
    auth.uid() = player_id 
    OR auth.uid() IN (SELECT admin_id FROM courts WHERE id = bookings.court_id)
  );

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias reservas" ON bookings;
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
    OR auth.uid() IN (SELECT admin_id FROM courts WHERE id = bookings.court_id)
  );

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
  FOR EACH ROW EXECUTE FUNCTION update_bookings_updated_at();

-- ============================================
-- SECCIÓN 7B: GESTIÓN DE HORARIOS (Solo admin)
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
  USING (court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid()))
  WITH CHECK (court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid()));

DROP POLICY IF EXISTS "Todos pueden leer horarios" ON schedules;
CREATE POLICY "Todos pueden leer horarios"
  ON schedules FOR SELECT USING (true);

-- ============================================
-- SECCIÓN 8: PARTIDOS Y JUGADORES (App móvil)
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NULL DEFAULT 10,
  match_type TEXT NULL DEFAULT 'futbol',
  game_mode TEXT NULL DEFAULT 'mixed',
  price INTEGER NULL DEFAULT 0,
  created_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NULL DEFAULT 'pending',
  score_team_a INTEGER NULL DEFAULT 0,
  score_team_b INTEGER NULL DEFAULT 0,
  winning_team TEXT NULL,
  mvp_player_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  court_id UUID NULL REFERENCES courts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver partidos públicos" ON matches;
CREATE POLICY "Todos pueden ver partidos públicos"
  ON matches FOR SELECT
  USING (status IN ('pending', 'confirmed', 'in_progress', 'completed'));

DROP POLICY IF EXISTS "El creador puede actualizar su partido" ON matches;
CREATE POLICY "El creador puede actualizar su partido"
  ON matches FOR UPDATE USING (auth.uid() = created_by AND status = 'pending');

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear partidos" ON matches;
CREATE POLICY "Usuarios autenticados pueden crear partidos"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "El creador puede eliminar su partido pendiente" ON matches;
CREATE POLICY "El creador puede eliminar su partido pendiente"
  ON matches FOR DELETE USING (auth.uid() = created_by AND status = 'pending');

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

ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver jugadores de partidos" ON match_players;
CREATE POLICY "Todos pueden ver jugadores de partidos"
  ON match_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios pueden unirse a partidos" ON match_players;
CREATE POLICY "Usuarios pueden unirse a partidos"
  ON match_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Jugadores pueden salir de partidos" ON match_players;
CREATE POLICY "Jugadores pueden salir de partidos"
  ON match_players FOR DELETE USING (auth.uid() = player_id);

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

-- Función para actualizar estadísticas al completar partido
CREATE OR REPLACE FUNCTION public.update_player_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE player_stats ps
    SET 
      total_matches = total_matches + 1,
      wins = wins + CASE WHEN mp.team = NEW.winning_team AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN mp.team IS NOT NULL AND mp.team != NEW.winning_team AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN NEW.winning_team IS NULL THEN 1 ELSE 0 END,
      mvp_count = mvp_count + CASE WHEN NEW.mvp_player_id = mp.player_id THEN 1 ELSE 0 END,
      gk_count = gk_count + CASE WHEN mp.position = 'GK' THEN 1 ELSE 0 END,
      df_count = df_count + CASE WHEN mp.position = 'DF' THEN 1 ELSE 0 END,
      mf_count = mf_count + CASE WHEN mp.position = 'MF' THEN 1 ELSE 0 END,
      fw_count = fw_count + CASE WHEN mp.position = 'FW' THEN 1 ELSE 0 END,
      updated_at = NOW()
    FROM match_players mp
    WHERE mp.match_id = NEW.id AND ps.player_id = mp.player_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_completed ON matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE ON matches
  FOR EACH ROW 
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION public.update_player_stats_after_match();

DROP TRIGGER IF EXISTS on_match_updated ON matches;
CREATE TRIGGER on_match_updated
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SECCIÓN 9: ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_regions_country ON regions(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);

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

CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_datetime ON matches(datetime);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON matches(match_type);
CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- ============================================
-- SECCIÓN 10: REALTIME PARA RESERVAS
-- ============================================
-- Habilitar Realtime para notificaciones de reservas en tiempo real

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- ============================================
-- SECCIÓN 11: STORAGE PARA AVATARES
-- ============================================
-- Nota: Crear el bucket 'avatars' manualmente en Supabase Storage primero

DROP POLICY IF EXISTS "Los usuarios pueden subir su propio avatar" ON storage.objects;
CREATE POLICY "Los usuarios pueden subir su propio avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio avatar" ON storage.objects;
CREATE POLICY "Los usuarios pueden actualizar su propio avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar su propio avatar" ON storage.objects;
CREATE POLICY "Los usuarios pueden eliminar su propio avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- SECCIÓN 12: MIGRACIÓN DE PERFILES EXISTENTES
-- ============================================
-- Crear estadísticas para perfiles que ya existen (ejecutar solo si hay datos previos)

INSERT INTO player_stats (player_id)
SELECT p.id FROM profiles p
WHERE p.id NOT IN (SELECT player_id FROM player_stats WHERE player_id IS NOT NULL)
ON CONFLICT (player_id) DO NOTHING;

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
