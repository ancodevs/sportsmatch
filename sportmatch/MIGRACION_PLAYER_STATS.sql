-- ============================================
-- MIGRACIÓN: Agregar Player Stats
-- ============================================
-- Este script agrega la tabla player_stats y crea
-- estadísticas para todos los perfiles existentes
-- ============================================

-- 1. Crear tabla player_stats (si no existe)
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
  CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- 2. Habilitar RLS
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de seguridad (solo si no existen)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'player_stats' 
    AND policyname = 'Los usuarios pueden ver sus propias estadísticas'
  ) THEN
    CREATE POLICY "Los usuarios pueden ver sus propias estadísticas"
      ON player_stats FOR SELECT
      USING (auth.uid() = player_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'player_stats' 
    AND policyname = 'Los usuarios pueden actualizar sus propias estadísticas'
  ) THEN
    CREATE POLICY "Los usuarios pueden actualizar sus propias estadísticas"
      ON player_stats FOR UPDATE
      USING (auth.uid() = player_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'player_stats' 
    AND policyname = 'Los usuarios pueden insertar sus propias estadísticas'
  ) THEN
    CREATE POLICY "Los usuarios pueden insertar sus propias estadísticas"
      ON player_stats FOR INSERT
      WITH CHECK (auth.uid() = player_id);
  END IF;
END $$;

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);

-- 5. Actualizar función handle_new_user para incluir creación de stats
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil con solo el email
  INSERT INTO public.profiles (id, email, extra_matches_balance)
  VALUES (new.id, new.email, 0);
  
  -- Crear estadísticas iniciales del jugador
  INSERT INTO public.player_stats (player_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear trigger para updated_at (si no existe)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a player_stats
DROP TRIGGER IF EXISTS on_player_stats_updated ON player_stats;
CREATE TRIGGER on_player_stats_updated
  BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. MIGRACIÓN: Crear estadísticas para perfiles existentes
-- Este es el paso más importante para completar perfiles ya creados
INSERT INTO player_stats (player_id)
SELECT id FROM profiles
WHERE id NOT IN (
  SELECT player_id FROM player_stats 
  WHERE player_id IS NOT NULL
)
ON CONFLICT (player_id) DO NOTHING;

-- 8. Verificar resultados
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM player_stats) as total_stats,
  (SELECT COUNT(*) FROM profiles WHERE id NOT IN (
    SELECT player_id FROM player_stats WHERE player_id IS NOT NULL
  )) as profiles_sin_stats;

-- ============================================
-- RESULTADO ESPERADO:
-- total_profiles: X
-- total_stats: X (debe ser igual a total_profiles)
-- profiles_sin_stats: 0 (todos deben tener stats)
-- ============================================
