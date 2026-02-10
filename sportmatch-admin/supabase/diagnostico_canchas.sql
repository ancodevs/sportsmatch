-- ============================================
-- SCRIPT DE DIAGNÓSTICO: Verificar Canchas
-- ============================================
-- Ejecuta este script para verificar por qué no se cargan las canchas

-- 1. Ver todas las canchas activas
SELECT 
  c.id,
  c.name,
  c.sport_type,
  c.is_active,
  c.admin_id
FROM courts c
WHERE c.is_active = true;

-- 2. Ver admin_users con sus ubicaciones
SELECT 
  au.id,
  au.user_id,
  au.business_name,
  au.city_id,
  ci.name as ciudad,
  ci.region_id,
  r.name as region
FROM admin_users au
LEFT JOIN cities ci ON au.city_id = ci.id
LEFT JOIN regions r ON ci.region_id = r.id;

-- 3. Ver canchas CON su admin y ubicación (el JOIN completo)
SELECT 
  c.id as court_id,
  c.name as cancha,
  c.sport_type,
  au.business_name as complejo,
  au.address,
  ci.name as ciudad,
  ci.region_id,
  r.name as region
FROM courts c
JOIN admin_users au ON c.admin_id = au.user_id
LEFT JOIN cities ci ON au.city_id = ci.id
LEFT JOIN regions r ON ci.region_id = r.id
WHERE c.is_active = true;

-- 4. Verificar políticas RLS en admin_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'admin_users';

-- 5. Verificar políticas RLS en courts
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'courts';

-- 6. Ver ciudades en la región O'Higgins (region_id = 8)
SELECT 
  id,
  name,
  region_id
FROM cities
WHERE region_id = 8;

-- 7. Probar el query completo que hace la app (ajusta region_id)
WITH region_cities AS (
  SELECT id FROM cities WHERE region_id = 8 -- O'Higgins
),
region_admins AS (
  SELECT 
    au.user_id,
    au.business_name,
    au.address,
    au.city_id,
    ci.name as city_name,
    ci.region_id
  FROM admin_users au
  JOIN cities ci ON au.city_id = ci.id
  WHERE au.city_id IN (SELECT id FROM region_cities)
)
SELECT 
  c.*,
  ra.business_name,
  ra.address,
  ra.city_name,
  ra.region_id
FROM courts c
JOIN region_admins ra ON c.admin_id = ra.user_id
WHERE c.is_active = true;

-- ============================================
-- POSIBLES SOLUCIONES
-- ============================================

-- Si las políticas RLS bloquean la lectura de admin_users:
DROP POLICY IF EXISTS "Todos pueden ver admin_users públicos" ON admin_users;
CREATE POLICY "Todos pueden ver admin_users públicos"
  ON admin_users FOR SELECT
  USING (true);

-- Si las políticas RLS bloquean la lectura de cities:
DROP POLICY IF EXISTS "Todos pueden ver ciudades" ON cities;
CREATE POLICY "Todos pueden ver ciudades"
  ON cities FOR SELECT
  USING (true);

-- Verificar que cities tiene RLS habilitado
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Verificar que admin_users tiene RLS habilitado
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
