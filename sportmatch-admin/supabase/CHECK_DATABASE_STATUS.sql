-- ============================================
-- SCRIPT DE VERIFICACIÓN DE BASE DE DATOS
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- 1. Verificar si existe tabla de migraciones (opcional)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'schema_migrations'
) AS tiene_tabla_migraciones;

-- ============================================
-- 2. VERIFICAR TABLAS PRINCIPALES
-- ============================================

SELECT 
  'Tablas Principales' as categoria,
  string_agg(table_name::text, ', ' ORDER BY table_name) as tablas_existentes
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles',
    'admin_users',
    'courts',
    'bookings',
    'schedules',
    'matches',
    'match_players',
    'player_stats',
    'countries',
    'regions',
    'cities'
  );

-- ============================================
-- 3. VERIFICAR COLUMNAS DE COURTS
-- ============================================

SELECT 
  'courts - columnas' as verificacion,
  string_agg(column_name::text, ', ' ORDER BY column_name) as columnas
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'courts';

-- Verificar campos específicos críticos
SELECT 
  'courts - campos precio' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='day_price') 
    THEN '✅ day_price existe'
    ELSE '❌ day_price NO existe'
  END as day_price,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='night_price') 
    THEN '✅ night_price existe'
    ELSE '❌ night_price NO existe'
  END as night_price,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='price_per_hour') 
    THEN '⚠️ price_per_hour existe (debería eliminarse)'
    ELSE '✅ price_per_hour eliminado correctamente'
  END as price_per_hour_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courts' AND column_name='sport_type') 
    THEN '✅ sport_type existe'
    ELSE '❌ sport_type NO existe'
  END as sport_type;

-- ============================================
-- 4. VERIFICAR COLUMNAS DE SCHEDULES
-- ============================================

SELECT 
  'schedules - columnas' as verificacion,
  string_agg(column_name::text, ', ' ORDER BY column_name) as columnas
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'schedules';

-- Verificar que schedules NO tenga campos de pricing
SELECT 
  'schedules - campos precio (NO deberían existir)' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='price_per_hour') 
    THEN '⚠️ price_per_hour existe (debería eliminarse)'
    ELSE '✅ price_per_hour no existe'
  END as price_per_hour,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='lighting_price') 
    THEN '⚠️ lighting_price existe (debería eliminarse)'
    ELSE '✅ lighting_price no existe'
  END as lighting_price;

-- ============================================
-- 5. VERIFICAR COLUMNAS DE MATCHES
-- ============================================

SELECT 
  'matches - columnas importantes' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='game_mode') 
    THEN '✅ game_mode existe'
    ELSE '❌ game_mode NO existe'
  END as game_mode,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='gender_restriction') 
    THEN '✅ gender_restriction existe'
    ELSE '❌ gender_restriction NO existe'
  END as gender_restriction,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='status') 
    THEN '✅ status existe'
    ELSE '❌ status NO existe'
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='finished_at') 
    THEN '✅ finished_at existe'
    ELSE '❌ finished_at NO existe'
  END as finished_at;

-- ============================================
-- 6. VERIFICAR COLUMNAS DE PROFILES
-- ============================================

SELECT 
  'profiles - columnas avatar' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') 
    THEN '✅ avatar_url existe'
    ELSE '❌ avatar_url NO existe'
  END as avatar_url;

-- ============================================
-- 7. VERIFICAR POLÍTICAS RLS (Row Level Security)
-- ============================================

SELECT 
  'Políticas RLS' as verificacion,
  schemaname,
  tablename,
  COUNT(*) as cantidad_politicas
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Listar políticas específicas importantes
SELECT 
  'Detalle políticas' as categoria,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('courts', 'schedules', 'bookings', 'matches', 'match_players', 'player_stats')
ORDER BY tablename, policyname;

-- ============================================
-- 8. VERIFICAR FUNCIONES/TRIGGERS
-- ============================================

SELECT 
  'Funciones importantes' as verificacion,
  COUNT(*) FILTER (WHERE proname = 'update_player_stats_on_finish') as func_update_stats,
  COUNT(*) FILTER (WHERE proname LIKE '%match%') as funciones_matches
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- 9. VERIFICAR BUCKETS DE STORAGE
-- ============================================

SELECT 
  'Storage Buckets' as verificacion,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'avatars') 
    THEN '✅ Bucket avatars existe'
    ELSE '❌ Bucket avatars NO existe'
  END as avatars_bucket;

-- ============================================
-- 10. RESUMEN GENERAL
-- ============================================

SELECT 
  '=== RESUMEN GENERAL ===' as categoria,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_politicas_rls,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as total_funciones;

-- ============================================
-- INSTRUCCIONES
-- ============================================
/*
CÓMO INTERPRETAR LOS RESULTADOS:

✅ = Correcto, está como debería
❌ = Falta, necesita migración
⚠️ = Existe pero debería eliminarse

TABLAS ESPERADAS:
- profiles, admin_users, courts, bookings, schedules
- matches, match_players, player_stats
- countries, regions, cities

CAMPOS CLAVE A VERIFICAR:
1. courts: day_price, night_price (NO price_per_hour)
2. schedules: NO debe tener price_per_hour ni lighting_price
3. matches: game_mode, gender_restriction, status, finished_at
4. profiles: avatar_url

SIGUIENTE PASO:
Revisa los resultados y compártelos para saber qué migraciones faltan ejecutar.
*/
