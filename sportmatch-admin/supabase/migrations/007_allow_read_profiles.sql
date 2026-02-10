-- ============================================
-- MIGRACIÓN: Permitir a todos los usuarios ver perfiles
-- ============================================
-- Esta migración permite que los usuarios autenticados
-- puedan ver los perfiles de otros usuarios para mostrar
-- nombres y detalles en los partidos
-- ============================================

-- 1. Eliminar política restrictiva existente si existe
DROP POLICY IF EXISTS "Users can only view their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede ver su perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON profiles;

-- 2. Crear política que permite a TODOS los usuarios autenticados ver TODOS los perfiles
CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Mantener política de actualización: solo tu propio perfil
DROP POLICY IF EXISTS "Users can only update their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede actualizar su perfil" ON profiles;

CREATE POLICY "Usuarios solo pueden actualizar su propio perfil"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Política de inserción: solo al registrarse
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Solo el usuario puede crear su perfil" ON profiles;

CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VERIFICAR POLÍTICAS
-- ============================================

-- Ver todas las políticas activas de profiles
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
WHERE tablename = 'profiles';

-- ============================================
-- NOTAS
-- ============================================

-- ✅ Ahora todos los usuarios autenticados pueden ver:
--    - Nombres (first_name, last_name)
--    - Email
--    - Avatar
--    - Información pública de otros usuarios

-- ✅ La privacidad se mantiene:
--    - Solo puedes EDITAR tu propio perfil
--    - No puedes ver datos sensibles (los usuarios solo ven lo que está en profiles)
--    - Los datos de autenticación (contraseñas) están en auth.users (inaccesibles)

-- ✅ Casos de uso habilitados:
--    - Ver nombres de jugadores en partidos
--    - Ver organizador del partido
--    - Lista de jugadores con nombres reales
--    - Perfiles de usuario en la app
