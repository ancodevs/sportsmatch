-- ============================================
-- TABLA DE USUARIOS ADMINISTRADORES
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

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Los admin pueden ver su propio perfil"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los admin pueden actualizar su propio perfil"
  ON admin_users FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- TABLA DE CANCHAS DEPORTIVAS
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
  price_per_hour DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  capacity INTEGER,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para courts
CREATE POLICY "Todos pueden ver canchas activas"
  ON courts FOR SELECT
  USING (is_active = true OR auth.uid() = admin_id);

CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden actualizar sus propias canchas"
  ON courts FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden eliminar sus propias canchas"
  ON courts FOR DELETE
  USING (auth.uid() = admin_id);

-- ============================================
-- TABLA DE RESERVAS
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

-- Habilitar RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para bookings
CREATE POLICY "Los usuarios pueden ver sus propias reservas"
  ON bookings FOR SELECT
  USING (
    auth.uid() = player_id 
    OR auth.uid() IN (
      SELECT admin_id FROM courts WHERE id = bookings.court_id
    )
  );

CREATE POLICY "Los usuarios pueden insertar sus propias reservas"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Los usuarios y admins pueden actualizar reservas"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = player_id 
    OR auth.uid() IN (
      SELECT admin_id FROM courts WHERE id = bookings.court_id
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at en admin_users
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Trigger para actualizar updated_at en courts
CREATE OR REPLACE FUNCTION update_courts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW
  EXECUTE FUNCTION update_courts_updated_at();

-- Trigger para actualizar updated_at en bookings
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- ============================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_country_id ON admin_users(country_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_region_id ON admin_users(region_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_city_id ON admin_users(city_id);
CREATE INDEX IF NOT EXISTS idx_courts_admin_id ON courts(admin_id);
CREATE INDEX IF NOT EXISTS idx_courts_is_active ON courts(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_player_id ON bookings(player_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ============================================
-- HABILITAR REALTIME PARA NOTIFICACIONES
-- ============================================

-- Habilitar realtime en la tabla de reservas
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Nota: Si la publicación no existe, créala primero:
-- CREATE PUBLICATION supabase_realtime;
