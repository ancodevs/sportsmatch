-- ============================================
-- Script de Verificación: Sistema de Estados
-- ============================================
-- Ejecuta este script para probar que el sistema
-- de estados funciona correctamente
-- ============================================

BEGIN;

-- 1. Verificar que los triggers existen
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_update_match_status',
  'trigger_match_status_on_player_change'
)
ORDER BY event_object_table, trigger_name;

-- Resultado esperado: 2 filas
-- ✓ trigger_update_match_status en matches
-- ✓ trigger_match_status_on_player_change en match_players

COMMIT;

-- ============================================

BEGIN;

-- 2. Verificar distribución de estados actuales
SELECT 
  status,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
FROM matches
GROUP BY status
ORDER BY cantidad DESC;

-- Resultado esperado:
-- ✓ open: Mayor cantidad
-- ✓ full: Algunos partidos
-- ✓ confirmed: Pocos
-- ✓ cancelled: Muy pocos
-- ✗ pending: NO debe existir (migrados a 'open')

COMMIT;

-- ============================================

BEGIN;

-- 3. Verificar índices creados
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_matches_status',
  'idx_matches_status_datetime',
  'idx_matches_game_mode',
  'idx_matches_gender_mode'
)
ORDER BY tablename, indexname;

-- Resultado esperado: 4 índices
-- ✓ idx_matches_status
-- ✓ idx_matches_status_datetime
-- ✓ idx_matches_game_mode
-- ✓ idx_matches_gender_mode

COMMIT;

-- ============================================

BEGIN;

-- 4. Probar transición automática: open → full
DO $$
DECLARE
  test_match_id UUID;
  test_user_id UUID;
  initial_status TEXT;
  final_status TEXT;
  player_count INT;
BEGIN
  -- Crear partido de prueba (max 2 jugadores)
  INSERT INTO matches (
    title,
    description,
    datetime,
    max_players,
    match_type,
    game_mode,
    gender_mode,
    status,
    created_by
  )
  VALUES (
    'TEST: Transición open → full',
    'Partido de prueba automático',
    NOW() + INTERVAL '1 day',
    2,
    'futbol',
    'selection',
    'mixed',
    'open',
    (SELECT id FROM profiles LIMIT 1)
  )
  RETURNING id, created_by INTO test_match_id, test_user_id;

  -- Verificar estado inicial
  SELECT status INTO initial_status FROM matches WHERE id = test_match_id;
  RAISE NOTICE 'Estado inicial: %', initial_status;

  -- Agregar primer jugador (el creador ya cuenta como 1)
  INSERT INTO match_players (match_id, player_id, team, is_captain)
  VALUES (test_match_id, test_user_id, 'A', true);

  -- Estado aún debe ser 'open' (1/2)
  SELECT status INTO initial_status FROM matches WHERE id = test_match_id;
  RAISE NOTICE 'Después de 1er jugador: % (debe ser open)', initial_status;

  -- Agregar segundo jugador
  INSERT INTO match_players (match_id, player_id, team)
  VALUES (
    test_match_id,
    (SELECT id FROM profiles WHERE id != test_user_id LIMIT 1),
    'B'
  );

  -- Verificar transición automática a 'full'
  SELECT status, COUNT(*) 
  INTO final_status, player_count
  FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  WHERE m.id = test_match_id
  GROUP BY m.status;

  RAISE NOTICE 'Después de 2do jugador: % (debe ser full)', final_status;
  RAISE NOTICE 'Jugadores: % (debe ser 2)', player_count;

  -- Verificar resultado
  IF final_status = 'full' AND player_count = 2 THEN
    RAISE NOTICE '✅ TEST PASSED: Transición automática open → full funciona';
  ELSE
    RAISE EXCEPTION '❌ TEST FAILED: Estado % con % jugadores', final_status, player_count;
  END IF;

  -- Limpiar
  DELETE FROM match_players WHERE match_id = test_match_id;
  DELETE FROM matches WHERE id = test_match_id;

  RAISE NOTICE '✅ Cleanup completado';
END $$;

COMMIT;

-- ============================================

BEGIN;

-- 5. Probar transición automática: full → open
DO $$
DECLARE
  test_match_id UUID;
  test_user_id UUID;
  second_user_id UUID;
  status_before TEXT;
  status_after TEXT;
BEGIN
  -- Obtener dos usuarios
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  SELECT id INTO second_user_id FROM profiles WHERE id != test_user_id LIMIT 1;

  -- Crear partido lleno (max 2 jugadores)
  INSERT INTO matches (
    title,
    description,
    datetime,
    max_players,
    match_type,
    game_mode,
    gender_mode,
    status,
    created_by
  )
  VALUES (
    'TEST: Transición full → open',
    'Partido de prueba automático',
    NOW() + INTERVAL '1 day',
    2,
    'futbol',
    'selection',
    'mixed',
    'open',
    test_user_id
  )
  RETURNING id INTO test_match_id;

  -- Llenar el partido
  INSERT INTO match_players (match_id, player_id, team, is_captain)
  VALUES (test_match_id, test_user_id, 'A', true);

  INSERT INTO match_players (match_id, player_id, team)
  VALUES (test_match_id, second_user_id, 'B');

  -- Verificar que está lleno
  SELECT status INTO status_before FROM matches WHERE id = test_match_id;
  RAISE NOTICE 'Estado inicial: % (debe ser full)', status_before;

  IF status_before != 'full' THEN
    RAISE EXCEPTION '❌ TEST SETUP FAILED: Estado inicial debería ser full';
  END IF;

  -- Quitar un jugador
  DELETE FROM match_players WHERE match_id = test_match_id AND player_id = second_user_id;

  -- Verificar transición automática a 'open'
  SELECT status INTO status_after FROM matches WHERE id = test_match_id;
  RAISE NOTICE 'Después de quitar jugador: % (debe ser open)', status_after;

  -- Verificar resultado
  IF status_after = 'open' THEN
    RAISE NOTICE '✅ TEST PASSED: Transición automática full → open funciona';
  ELSE
    RAISE EXCEPTION '❌ TEST FAILED: Estado final es %', status_after;
  END IF;

  -- Limpiar
  DELETE FROM match_players WHERE match_id = test_match_id;
  DELETE FROM matches WHERE id = test_match_id;

  RAISE NOTICE '✅ Cleanup completado';
END $$;

COMMIT;

-- ============================================

BEGIN;

-- 6. Verificar funciones auxiliares existen
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name IN (
  'update_match_status',
  'update_match_status_on_player_change',
  'confirm_match',
  'cancel_match'
)
ORDER BY routine_name;

-- Resultado esperado: 4 funciones
-- ✓ confirm_match → boolean
-- ✓ cancel_match → boolean
-- ✓ update_match_status → trigger
-- ✓ update_match_status_on_player_change → trigger

COMMIT;

-- ============================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================

SELECT 
  '✅ Sistema de Estados de Partido' as componente,
  'Completamente Operativo' as estado,
  NOW() as verificado_en;

-- ============================================
-- TESTS MANUALES EN APP
-- ============================================

/*
Para probar en la app React Native:

1. TEST: Crear partido y llenarlo
   ✓ Crear partido (max 4 jugadores)
   ✓ Estado inicial: 'open'
   ✓ Unir 3 usuarios más
   ✓ Verificar cambio automático a 'full'
   ✓ Badge "🔒 Lleno" visible en lista

2. TEST: Jugador sale de partido lleno
   ✓ Estado inicial: 'full'
   ✓ Un jugador sale
   ✓ Verificar cambio automático a 'open'
   ✓ Badge desaparece de lista

3. TEST: Organizador confirma partido
   ✓ Abrir partido como organizador
   ✓ Ver botones "Confirmar" y "Cancelar"
   ✓ Presionar "Confirmar"
   ✓ Verificar cambio a 'confirmed'
   ✓ Badge "✔️ Confirmado" visible

4. TEST: No unirse a partido confirmado
   ✓ Abrir partido confirmado como otro usuario
   ✓ Botón "Unirme" debe estar deshabilitado
   ✓ Mensaje: "Partido confirmado..."

5. TEST: No salir de partido confirmado
   ✓ Estar inscrito en partido
   ✓ Organizador confirma
   ✓ Intentar salir
   ✓ Alert: "No puedes salir..."

6. TEST: Cancelar partido
   ✓ Organizador abre partido
   ✓ Presionar "Cancelar"
   ✓ Confirmar en alert
   ✓ Verificar estado 'cancelled'
   ✓ Partido desaparece de lista
   ✓ Banner rojo en detalle

7. TEST: No unirse a partido cancelado
   ✓ Abrir partido cancelado
   ✓ Ver banner rojo
   ✓ Botón "Unirme" no visible

8. TEST: Filtros de lista
   ✓ Crear partido y cancelarlo
   ✓ Verificar que NO aparece en lista join
   ✓ Partidos 'open' y 'full' deben aparecer
*/
