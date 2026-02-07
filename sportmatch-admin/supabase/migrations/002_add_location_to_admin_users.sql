-- ============================================
-- MOVER UBICACIÓN DE COURTS A ADMIN_USERS
-- ============================================
-- Esta migración reorganiza los campos de ubicación para que estén
-- en admin_users en lugar de courts, ya que todas las canchas de un
-- administrador están en el mismo complejo deportivo.

-- 1. Añadir columnas de ubicación a admin_users
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id),
ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_users_country_id ON admin_users(country_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_region_id ON admin_users(region_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_city_id ON admin_users(city_id);

-- 3. Migrar datos existentes de courts a admin_users (opcional)
-- Si tienes canchas existentes, puedes migrar la ubicación de la primera cancha:
-- UPDATE admin_users au
-- SET 
--   address = c.address,
--   city_id = c.city_id,
--   latitude = c.latitude,
--   longitude = c.longitude
-- FROM (
--   SELECT DISTINCT ON (admin_id) admin_id, address, city_id, latitude, longitude
--   FROM courts
--   ORDER BY admin_id, created_at
-- ) c
-- WHERE au.user_id = c.admin_id;

-- 4. Eliminar columnas de ubicación de courts (CUIDADO: esto elimina los datos)
-- Solo ejecuta esto si ya migraste los datos o si no tienes datos importantes
-- ALTER TABLE courts
-- DROP COLUMN IF EXISTS address,
-- DROP COLUMN IF EXISTS city_id,
-- DROP COLUMN IF EXISTS latitude,
-- DROP COLUMN IF EXISTS longitude;

-- 5. Eliminar índice antiguo de city_id en courts
DROP INDEX IF EXISTS idx_courts_city_id;

-- 6. Simplificar políticas de courts (ya no necesitan validar city_id)
DROP POLICY IF EXISTS "Los admin pueden insertar sus propias canchas" ON courts;
DROP POLICY IF EXISTS "Los admin pueden actualizar sus propias canchas" ON courts;

CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden actualizar sus propias canchas"
  ON courts FOR UPDATE
  USING (auth.uid() = admin_id);

-- Nota: Los administradores existentes deben configurar su ubicación
-- antes de poder crear nuevas canchas. Puedes hacerlo con:
-- UPDATE admin_users 
-- SET address = 'Dirección', country_id = 1, region_id = 13, city_id = 100,
--     latitude = -33.4489, longitude = -70.6693
-- WHERE user_id = 'UUID';
