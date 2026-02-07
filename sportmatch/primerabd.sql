### Esquema de Base de Datos - SportMatch

Ejecuta este SQL en tu proyecto de Supabase:

\`\`\`sql
-- ============================================
-- TABLAS DE UBICACIÓN (CHILE)
-- ============================================

-- Tabla de países
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de regiones
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ciudades
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en tablas de ubicación
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública de ubicaciones
CREATE POLICY "Todos pueden ver países"
  ON countries FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden ver regiones"
  ON regions FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden ver ciudades"
  ON cities FOR SELECT
  USING (true);

-- ============================================
-- DATOS INICIALES DE CHILE
-- ============================================

-- Insertar Chile
INSERT INTO countries (name, code) VALUES ('Chile', 'CL');

-- Insertar regiones de Chile
INSERT INTO regions (name, country_id) VALUES
  ('Arica y Parinacota', 1),
  ('Tarapacá', 1),
  ('Antofagasta', 1),
  ('Atacama', 1),
  ('Coquimbo', 1),
  ('Valparaíso', 1),
  ('Metropolitana de Santiago', 1),
  ('O''Higgins', 1),
  ('Maule', 1),
  ('Ñuble', 1),
  ('Biobío', 1),
  ('La Araucanía', 1),
  ('Los Ríos', 1),
  ('Los Lagos', 1),
  ('Aysén', 1),
  ('Magallanes', 1);

-- Insertar principales ciudades de Chile por región
INSERT INTO cities (name, region_id) VALUES
  -- Arica y Parinacota (1)
  ('Arica', 1),
  ('Putre', 1),
  -- Tarapacá (2)
  ('Iquique', 2),
  ('Alto Hospicio', 2),
  ('Pozo Almonte', 2),
  -- Antofagasta (3)
  ('Antofagasta', 3),
  ('Calama', 3),
  ('Tocopilla', 3),
  ('Mejillones', 3),
  -- Atacama (4)
  ('Copiapó', 4),
  ('Vallenar', 4),
  ('Chañaral', 4),
  -- Coquimbo (5)
  ('La Serena', 5),
  ('Coquimbo', 5),
  ('Ovalle', 5),
  ('Vicuña', 5),
  -- Valparaíso (6)
  ('Valparaíso', 6),
  ('Viña del Mar', 6),
  ('Quilpué', 6),
  ('Villa Alemana', 6),
  ('Quillota', 6),
  ('San Antonio', 6),
  ('Los Andes', 6),
  -- Metropolitana de Santiago (7)
  ('Santiago', 7),
  ('Puente Alto', 7),
  ('Maipú', 7),
  ('La Florida', 7),
  ('Las Condes', 7),
  ('Providencia', 7),
  ('San Bernardo', 7),
  ('Ñuñoa', 7),
  ('Peñalolén', 7),
  ('La Reina', 7),
  ('Vitacura', 7),
  ('Lo Barnechea', 7),
  ('Colina', 7),
  ('Pudahuel', 7),
  -- O''Higgins (8)
  ('Rancagua', 8),
  ('San Fernando', 8),
  ('Rengo', 8),
  ('Machalí', 8),
  -- Maule (9)
  ('Talca', 9),
  ('Curicó', 9),
  ('Linares', 9),
  ('Constitución', 9),
  -- Ñuble (10)
  ('Chillán', 10),
  ('Chillán Viejo', 10),
  ('San Carlos', 10),
  -- Biobío (11)
  ('Concepción', 11),
  ('Talcahuano', 11),
  ('Los Ángeles', 11),
  ('Chiguayante', 11),
  ('San Pedro de la Paz', 11),
  ('Coronel', 11),
  -- La Araucanía (12)
  ('Temuco', 12),
  ('Villarrica', 12),
  ('Angol', 12),
  ('Pucón', 12),
  -- Los Ríos (13)
  ('Valdivia', 13),
  ('La Unión', 13),
  ('Río Bueno', 13),
  -- Los Lagos (14)
  ('Puerto Montt', 14),
  ('Osorno', 14),
  ('Castro', 14),
  ('Ancud', 14),
  ('Puerto Varas', 14),
  -- Aysén (15)
  ('Coyhaique', 15),
  ('Puerto Aysén', 15),
  -- Magallanes (16)
  ('Punta Arenas', 16),
  ('Puerto Natales', 16);

-- ============================================
-- TABLA DE PERFILES
-- ============================================

-- Crear tabla de perfiles con campos extendidos
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
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

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para perfiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- TABLA DE ESTADÍSTICAS DE JUGADOR
-- ============================================

-- Crear tabla de estadísticas de jugador
CREATE TABLE player_stats (
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
  CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Habilitar RLS en player_stats
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para player_stats
CREATE POLICY "Los usuarios pueden ver sus propias estadísticas"
  ON player_stats FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias estadísticas"
  ON player_stats FOR UPDATE
  USING (auth.uid() = player_id);

CREATE POLICY "Los usuarios pueden insertar sus propias estadísticas"
  ON player_stats FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para crear perfil y estadísticas automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil con solo el email
  -- El usuario completará sus datos en el onboarding
  INSERT INTO public.profiles (id, email, extra_matches_balance)
  VALUES (new.id, new.email, 0);
  
  -- Crear estadísticas iniciales del jugador
  INSERT INTO public.player_stats (player_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en profiles
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger para actualizar updated_at en player_stats
CREATE TRIGGER on_player_stats_updated
  BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

CREATE INDEX idx_profiles_country ON profiles(country_id);
CREATE INDEX idx_profiles_region ON profiles(region_id);
CREATE INDEX idx_profiles_city ON profiles(city_id);
CREATE INDEX idx_regions_country ON regions(country_id);
CREATE INDEX idx_cities_region ON cities(region_id);
CREATE INDEX idx_player_stats_player ON player_stats(player_id);

-- ============================================
-- STORAGE BUCKET PARA AVATARES
-- ============================================

-- Políticas para subir avatares (ejecutar en Storage)
-- Nota: Crear el bucket 'avatars' manualmente en Supabase Storage primero

-- Política para subir avatares
CREATE POLICY "Los usuarios pueden subir su propio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para actualizar avatares
CREATE POLICY "Los usuarios pueden actualizar su propio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para eliminar avatares
CREATE POLICY "Los usuarios pueden eliminar su propio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- SCRIPT PARA COMPLETAR PERFILES EXISTENTES
-- ============================================

-- Crear estadísticas para perfiles que ya existen
INSERT INTO player_stats (player_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT player_id FROM player_stats WHERE player_id IS NOT NULL)
ON CONFLICT (player_id) DO NOTHING;
\`\`\`
