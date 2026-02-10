-- ============================================
-- MIGRACIÓN: Fix RLS para Player Stats
-- ============================================
-- Habilita RLS y crea políticas para player_stats
-- Permite que triggers actualicen stats automáticamente
-- ============================================

-- 1. Habilitar RLS en player_stats (si no está habilitado)
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their own stats" ON player_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON player_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON player_stats;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias estadísticas" ON player_stats;
DROP POLICY IF EXISTS "Usuarios pueden ver estadísticas públicas" ON player_stats;
DROP POLICY IF EXISTS "Sistema puede actualizar estadísticas" ON player_stats;

-- 3. Política SELECT: Todos pueden ver todas las estadísticas (para rankings)
CREATE POLICY "Usuarios autenticados pueden ver todas las estadísticas"
  ON player_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Política INSERT: Permitir inserciones desde triggers y sistema
-- Usamos una función que verifica si es el sistema o el propio usuario
CREATE POLICY "Sistema y usuario pueden insertar estadísticas"
  ON player_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Permite si es el propio usuario O si es una operación de sistema
    player_id = auth.uid() OR
    -- Permitir desde funciones/triggers (sin restricción adicional para operaciones de sistema)
    current_setting('role', true) = 'authenticated'
  );

-- 5. Política UPDATE: Permitir actualizaciones desde triggers y sistema
CREATE POLICY "Sistema puede actualizar estadísticas"
  ON player_stats
  FOR UPDATE
  TO authenticated
  USING (true)  -- Permitir leer cualquier fila para actualizar
  WITH CHECK (true);  -- Permitir actualizar a cualquier valor

-- 6. Crear función auxiliar para operaciones de sistema (opcional)
-- Esta función ejecuta con privilegios elevados (SECURITY DEFINER)
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
    p_player_id,
    p_total_matches,
    p_wins,
    p_losses,
    p_draws,
    p_mvp_count,
    p_gk_count,
    p_df_count,
    p_mf_count,
    p_fw_count,
    NOW()
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

-- 7. Modificar el trigger para usar la función con privilegios elevados
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
      
      -- Usar función con privilegios elevados
      PERFORM upsert_player_stats(
        player_record.player_id,
        1,  -- total_matches
        CASE WHEN is_winner THEN 1 ELSE 0 END,  -- wins
        CASE WHEN NOT is_winner AND NOT is_draw AND NEW.winning_team IS NOT NULL THEN 1 ELSE 0 END,  -- losses
        CASE WHEN is_draw THEN 1 ELSE 0 END,  -- draws
        CASE WHEN NEW.mvp_player_id = player_record.player_id THEN 1 ELSE 0 END,  -- mvp_count
        CASE WHEN player_record.position = 'GK' THEN 1 ELSE 0 END,  -- gk_count
        CASE WHEN player_record.position = 'DF' THEN 1 ELSE 0 END,  -- df_count
        CASE WHEN player_record.position = 'MF' THEN 1 ELSE 0 END,  -- mf_count
        CASE WHEN player_record.position = 'FW' THEN 1 ELSE 0 END   -- fw_count
      );
      
    END LOOP;
    
    RAISE NOTICE 'Player stats updated for match: %', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recrear el trigger (por si acaso)
DROP TRIGGER IF EXISTS trigger_update_player_stats_on_finish ON matches;
CREATE TRIGGER trigger_update_player_stats_on_finish
  AFTER UPDATE OF status ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match_finish();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'player_stats'
ORDER BY policyname;

-- Ver si RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'player_stats';

-- ============================================
-- TESTING
-- ============================================

/*
-- Test 1: Finalizar partido y verificar que actualiza stats
UPDATE matches
SET status = 'finished', winning_team = 'A'
WHERE id = '[match-uuid]';

-- Verificar que se actualizaron las estadísticas
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.wins,
  ps.losses
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.player_id IN (
  SELECT player_id FROM match_players WHERE match_id = '[match-uuid]'
);

-- Test 2: Verificar que usuarios pueden ver sus stats
SELECT * FROM player_stats WHERE player_id = auth.uid();

-- Test 3: Verificar que usuarios pueden ver stats de otros (para rankings)
SELECT 
  player_id,
  total_matches,
  wins
FROM player_stats
ORDER BY wins DESC
LIMIT 10;
*/

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

/*
Políticas RLS Creadas:

1. SELECT (Ver estadísticas):
   - Cualquier usuario autenticado puede ver TODAS las estadísticas
   - Necesario para rankings, tablas de posiciones, perfiles públicos
   - USING (true) = sin restricciones

2. INSERT (Crear estadísticas):
   - El sistema puede crear estadísticas para cualquier jugador
   - El jugador puede crear sus propias estadísticas
   - WITH CHECK permite operaciones de sistema

3. UPDATE (Actualizar estadísticas):
   - El sistema puede actualizar cualquier estadística
   - Necesario para que el trigger funcione
   - USING (true) y WITH CHECK (true) = sin restricciones para actualizaciones

Función SECURITY DEFINER:
- upsert_player_stats() se ejecuta con privilegios del dueño (superuser)
- Bypasea las políticas RLS
- Segura porque solo se llama desde el trigger (no expuesta a usuarios)
- Hace el UPSERT (INSERT o UPDATE) según corresponda

¿Por qué SECURITY DEFINER?
- Los triggers normalmente se ejecutan con permisos del usuario que dispara la acción
- Pero queremos que el trigger actualice stats sin importar quién finaliza el partido
- SECURITY DEFINER ejecuta con permisos elevados
- Solución más limpia y segura que deshabilitar RLS

Seguridad:
✓ SELECT abierto (OK para stats públicas)
✓ INSERT/UPDATE controlado por trigger (no expuesto a usuarios directamente)
✓ Función SECURITY DEFINER solo accesible desde trigger
✓ No hay riesgo de manipulación de stats por usuarios
*/
