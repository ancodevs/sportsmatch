-- ============================================
-- DATOS DE EJEMPLO: Matches
-- ============================================
-- Este archivo contiene datos de ejemplo para probar
-- el sistema de partidos con canchas (courts)
-- ============================================

-- IMPORTANTE: Necesitas tener canchas creadas primero
-- Ejecuta seed_data.sql del proyecto sportmatch-admin primero

DO $$
DECLARE
  user_id_1 UUID;
  user_id_2 UUID;
  user_id_3 UUID;
  user_id_4 UUID;
  match_id_1 UUID;
  match_id_2 UUID;
  match_id_3 UUID;
  court_futbol_id UUID;
  court_basketball_id UUID;
  court_volleyball_id UUID;
BEGIN
  -- Obtener algunos usuarios reales de la base de datos
  SELECT id INTO user_id_1 FROM profiles ORDER BY created_at DESC LIMIT 1 OFFSET 0;
  SELECT id INTO user_id_2 FROM profiles ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  SELECT id INTO user_id_3 FROM profiles ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  SELECT id INTO user_id_4 FROM profiles ORDER BY created_at DESC LIMIT 1 OFFSET 3;
  
  -- Verificar que tenemos al menos un usuario
  IF user_id_1 IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en la base de datos. Crea al menos un usuario primero.';
  END IF;

  -- Obtener canchas por tipo de deporte
  SELECT id INTO court_futbol_id 
  FROM courts 
  WHERE sport_type = 'futbol' OR sport_type = 'football' OR sport_type IS NULL
  LIMIT 1;
  
  SELECT id INTO court_basketball_id 
  FROM courts 
  WHERE sport_type = 'basketball'
  LIMIT 1;
  
  SELECT id INTO court_volleyball_id 
  FROM courts 
  WHERE sport_type = 'volleyball'
  LIMIT 1;

  -- Si no hay canchas específicas, usar cualquier cancha disponible
  IF court_futbol_id IS NULL THEN
    SELECT id INTO court_futbol_id FROM courts WHERE is_active = true LIMIT 1;
  END IF;
  
  IF court_basketball_id IS NULL THEN
    SELECT id INTO court_basketball_id FROM courts WHERE is_active = true LIMIT 1 OFFSET 1;
  END IF;
  
  IF court_volleyball_id IS NULL THEN
    SELECT id INTO court_volleyball_id FROM courts WHERE is_active = true LIMIT 1 OFFSET 2;
  END IF;

  -- Verificar que tenemos al menos una cancha
  IF court_futbol_id IS NULL THEN
    RAISE EXCEPTION 'No hay canchas en la base de datos. Crea al menos una cancha primero usando el panel de administración.';
  END IF;

  -- ============================================
  -- PARTIDO 1: Pichanga de los viernes
  -- ============================================
  INSERT INTO matches (
    title,
    description,
    datetime,
    court_id,
    max_players,
    match_type,
    game_mode,
    price,
    created_by,
    status
  ) VALUES (
    'Pichanga de los viernes',
    'Partido semanal de fútbol 7 en cancha sintética. Todos los niveles son bienvenidos. Ambiente relajado y competitivo.',
    NOW() + INTERVAL '7 days' + INTERVAL '19 hours',
    court_futbol_id,
    14,
    'futbol',
    'mixed',
    5000,
    user_id_1,
    'pending'
  ) RETURNING id INTO match_id_1;

  -- Agregar jugadores al partido 1
  INSERT INTO match_players (match_id, player_id, is_captain) 
  VALUES (match_id_1, user_id_1, true);
  
  IF user_id_2 IS NOT NULL THEN
    INSERT INTO match_players (match_id, player_id, team, position) 
    VALUES (match_id_1, user_id_2, 'team_a', 'MF');
  END IF;
  
  IF user_id_3 IS NOT NULL THEN
    INSERT INTO match_players (match_id, player_id, team, position) 
    VALUES (match_id_1, user_id_3, 'team_b', 'FW');
  END IF;

  -- ============================================
  -- PARTIDO 2: Basketball 3x3
  -- ============================================
  IF court_basketball_id IS NOT NULL THEN
    INSERT INTO matches (
      title,
      description,
      datetime,
      court_id,
      max_players,
      match_type,
      game_mode,
      price,
      created_by,
      status
    ) VALUES (
      'Basketball 3x3 - Torneo Relámpago',
      'Torneo relámpago de basketball 3x3. Primer equipo en llegar a 21 puntos gana.',
      NOW() + INTERVAL '3 days' + INTERVAL '16 hours',
      court_basketball_id,
      6,
      'basketball',
      'mixed',
      0,
      COALESCE(user_id_2, user_id_1),
      'pending'
    ) RETURNING id INTO match_id_2;

    -- Agregar jugadores al partido 2
    INSERT INTO match_players (match_id, player_id, is_captain) 
    VALUES (match_id_2, COALESCE(user_id_2, user_id_1), true);
  END IF;

  -- ============================================
  -- PARTIDO 3: Volleyball Mixto
  -- ============================================
  IF court_volleyball_id IS NOT NULL THEN
    INSERT INTO matches (
      title,
      description,
      datetime,
      court_id,
      max_players,
      match_type,
      game_mode,
      price,
      created_by,
      status
    ) VALUES (
      'Volleyball Mixto - Liga Local',
      'Partido amistoso de volleyball mixto. Nivel intermedio-avanzado.',
      NOW() + INTERVAL '5 days' + INTERVAL '18 hours',
      court_volleyball_id,
      12,
      'volleyball',
      'mixed',
      3000,
      COALESCE(user_id_3, user_id_1),
      'pending'
    ) RETURNING id INTO match_id_3;

    -- Agregar jugadores al partido 3
    INSERT INTO match_players (match_id, player_id, is_captain) 
    VALUES (match_id_3, COALESCE(user_id_3, user_id_1), true);
    
    IF user_id_4 IS NOT NULL THEN
      INSERT INTO match_players (match_id, player_id) 
      VALUES (match_id_3, user_id_4);
    END IF;
  END IF;

  -- ============================================
  -- PARTIDO COMPLETADO DE EJEMPLO
  -- ============================================
  INSERT INTO matches (
    title,
    description,
    datetime,
    court_id,
    max_players,
    match_type,
    game_mode,
    price,
    created_by,
    status,
    score_team_a,
    score_team_b,
    winning_team,
    mvp_player_id
  ) VALUES (
    'Pichanga del Sábado Pasado',
    'Partidazo de fútbol 11. Muy buen nivel y excelente ambiente.',
    NOW() - INTERVAL '2 days',
    court_futbol_id,
    22,
    'futbol',
    'mixed',
    10000,
    user_id_1,
    'completed',
    5,
    3,
    'team_a',
    user_id_1
  );

  RAISE NOTICE '✅ Datos de ejemplo creados exitosamente';
  RAISE NOTICE '   - % partidos creados', 4;
  RAISE NOTICE '   - Usuario principal: %', user_id_1;
  RAISE NOTICE '   - Cancha fútbol: %', court_futbol_id;
  
END $$;

-- ============================================
-- VERIFICAR DATOS CREADOS
-- ============================================

-- Ver todos los partidos con información de la cancha
SELECT 
  m.title,
  m.datetime,
  m.match_type,
  m.game_mode,
  m.max_players,
  m.status,
  c.name as cancha,
  au.business_name as complejo,
  ci.name as ciudad,
  COUNT(mp.id) as jugadores_actuales
FROM matches m
LEFT JOIN courts c ON m.court_id = c.id
LEFT JOIN admin_users au ON c.admin_id = au.user_id
LEFT JOIN cities ci ON au.city_id = ci.id
LEFT JOIN match_players mp ON mp.match_id = m.id
GROUP BY m.id, m.title, m.datetime, m.match_type, m.game_mode, m.max_players, m.status, c.name, au.business_name, ci.name
ORDER BY m.datetime DESC;

-- Ver jugadores por partido
SELECT 
  m.title as partido,
  p.first_name || ' ' || p.last_name as jugador,
  mp.team as equipo,
  mp.position as posicion,
  mp.is_captain as capitan
FROM match_players mp
JOIN matches m ON mp.match_id = m.id
JOIN profiles p ON mp.player_id = p.id
ORDER BY m.title, mp.team, mp.position;
