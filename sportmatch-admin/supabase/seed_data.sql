-- ============================================
-- DATOS DE PRUEBA PARA SPORTMATCH ADMIN
-- ============================================

-- Nota: Ejecuta este SQL DESPUÉS de crear al menos un usuario administrador

-- ============================================
-- 1. CREAR USUARIO ADMINISTRADOR DE PRUEBA
-- ============================================

-- Primero, crea un usuario en Authentication (email: admin@sportmatch.cl, password: Admin123!)
-- Luego ejecuta esto (reemplaza el UUID con el del usuario que creaste):

/*
INSERT INTO admin_users (user_id, business_name, phone, is_verified)
VALUES (
  'REEMPLAZA-CON-TU-UUID',
  'Complejo Deportivo Los Andes',
  '+56912345678',
  true
);
*/

-- ============================================
-- 2. CREAR CANCHAS DE PRUEBA
-- ============================================

-- Nota: Reemplaza 'ADMIN-UUID' con tu UUID de administrador

/*
-- Cancha 1: Fútbol 7
INSERT INTO courts (
  name,
  description,
  address,
  city_id,
  surface_type,
  has_lighting,
  has_parking,
  has_changing_rooms,
  price_per_hour,
  capacity,
  admin_id,
  is_active
) VALUES (
  'Cancha Fútbol 7 - Central',
  'Cancha de fútbol 7 con pasto sintético de última generación. Incluye iluminación LED para partidos nocturnos.',
  'Av. Libertador 1234',
  (SELECT id FROM cities WHERE name = 'Santiago' LIMIT 1),
  'cesped_sintetico',
  true,
  true,
  true,
  25000,
  14,
  'ADMIN-UUID',
  true
);

-- Cancha 2: Fútbol 5
INSERT INTO courts (
  name,
  description,
  address,
  city_id,
  surface_type,
  has_lighting,
  has_parking,
  has_changing_rooms,
  price_per_hour,
  capacity,
  admin_id,
  is_active
) VALUES (
  'Cancha Fútbol 5 - Norte',
  'Cancha techada de fútbol 5, ideal para todo clima. Superficie de pasto sintético premium.',
  'Av. Santa Rosa 567',
  (SELECT id FROM cities WHERE name = 'Santiago' LIMIT 1),
  'cesped_sintetico',
  true,
  false,
  true,
  18000,
  10,
  'ADMIN-UUID',
  true
);

-- Cancha 3: Tenis
INSERT INTO courts (
  name,
  description,
  address,
  city_id,
  surface_type,
  has_lighting,
  has_parking,
  has_changing_rooms,
  price_per_hour,
  capacity,
  admin_id,
  is_active
) VALUES (
  'Cancha de Tenis - Premium',
  'Cancha de tenis profesional con superficie de arcilla. Ideal para entrenamientos y torneos.',
  'Av. Providencia 890',
  (SELECT id FROM cities WHERE name = 'Santiago' LIMIT 1),
  'tierra',
  true,
  true,
  true,
  15000,
  4,
  'ADMIN-UUID',
  true
);
*/

-- ============================================
-- 3. CREAR RESERVAS DE PRUEBA
-- ============================================

-- Nota: Necesitas un usuario jugador (de la tabla profiles) para crear reservas
-- Si no tienes, crea uno en la app móvil o usa un UUID existente

/*
-- Obtener IDs necesarios:
-- SELECT id FROM courts WHERE admin_id = 'ADMIN-UUID';
-- SELECT id FROM profiles LIMIT 1;

-- Reserva 1: Pendiente para hoy
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  status,
  total_price,
  payment_status,
  notes
) VALUES (
  'COURT-UUID-1',
  'PLAYER-UUID',
  CURRENT_DATE,
  '18:00',
  '19:00',
  'pending',
  25000,
  'pending',
  'Reserva para partido amistoso'
);

-- Reserva 2: Confirmada para mañana
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  status,
  total_price,
  payment_status
) VALUES (
  'COURT-UUID-1',
  'PLAYER-UUID',
  CURRENT_DATE + INTERVAL '1 day',
  '20:00',
  '21:00',
  'confirmed',
  25000,
  'paid'
);

-- Reserva 3: Pendiente para pasado mañana
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  status,
  total_price,
  payment_status
) VALUES (
  'COURT-UUID-2',
  'PLAYER-UUID',
  CURRENT_DATE + INTERVAL '2 days',
  '19:00',
  '20:00',
  'pending',
  18000,
  'pending'
);

-- Reserva 4: Completada (ayer)
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  status,
  total_price,
  payment_status
) VALUES (
  'COURT-UUID-1',
  'PLAYER-UUID',
  CURRENT_DATE - INTERVAL '1 day',
  '18:00',
  '19:00',
  'completed',
  25000,
  'paid'
);
*/

-- ============================================
-- 4. VERIFICAR LOS DATOS
-- ============================================

-- Ver administradores
SELECT * FROM admin_users;

-- Ver canchas
SELECT 
  c.id,
  c.name,
  c.address,
  ci.name as city,
  c.price_per_hour,
  c.is_active
FROM courts c
LEFT JOIN cities ci ON c.city_id = ci.id;

-- Ver reservas
SELECT 
  b.id,
  c.name as court,
  p.email as player,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.total_price
FROM bookings b
LEFT JOIN courts c ON b.court_id = c.id
LEFT JOIN profiles p ON b.player_id = p.id
ORDER BY b.booking_date DESC, b.start_time DESC;

-- ============================================
-- 5. FUNCIÓN ÚTIL: CREAR RESERVA DE PRUEBA
-- ============================================

-- Esta función crea una reserva de prueba automáticamente
CREATE OR REPLACE FUNCTION create_test_booking(
  p_admin_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_court_id UUID;
  v_player_id UUID;
  v_booking_id UUID;
BEGIN
  -- Obtener la primera cancha del admin
  SELECT id INTO v_court_id
  FROM courts
  WHERE admin_id = p_admin_id
  LIMIT 1;
  
  IF v_court_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna cancha para el administrador';
  END IF;
  
  -- Obtener un jugador cualquiera
  SELECT id INTO v_player_id
  FROM profiles
  LIMIT 1;
  
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún jugador en la base de datos';
  END IF;
  
  -- Crear la reserva
  INSERT INTO bookings (
    court_id,
    player_id,
    booking_date,
    start_time,
    end_time,
    status,
    total_price,
    payment_status
  ) VALUES (
    v_court_id,
    v_player_id,
    CURRENT_DATE + INTERVAL '1 day',
    '18:00',
    '19:00',
    'pending',
    25000,
    'pending'
  ) RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Uso: SELECT create_test_booking('TU-ADMIN-UUID');
