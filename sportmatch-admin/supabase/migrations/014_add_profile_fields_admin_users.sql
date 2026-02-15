-- ============================================
-- MIGRACIÓN: Añadir campos de perfil a admin_users
-- ============================================
-- Agrega logo_url y sports_offered para completar
-- el perfil del recinto deportivo
-- ============================================

-- 1. Añadir columna para logo del recinto
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- 2. Añadir columna para deportes ofrecidos (array de texto)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS sports_offered TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Comentarios descriptivos
COMMENT ON COLUMN admin_users.logo_url IS 'URL del logo del recinto en Supabase Storage';
COMMENT ON COLUMN admin_users.sports_offered IS 'Array de deportes que ofrece el recinto (ej: ["Fútbol", "Tenis", "Padel"])';

-- ============================================
-- STORAGE: Crear bucket para logos de recintos
-- ============================================

-- Crear bucket para logos de administradores
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-logos', 'admin-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Los usuarios autenticados pueden subir su propio logo
DROP POLICY IF EXISTS "Admin can upload own logo" ON storage.objects;
CREATE POLICY "Admin can upload own logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-logos' 
  AND name LIKE 'profiles/' || auth.uid()::text || '_%'
);

-- Política: Los usuarios pueden actualizar su propio logo
DROP POLICY IF EXISTS "Admin can update own logo" ON storage.objects;
CREATE POLICY "Admin can update own logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-logos' 
  AND name LIKE 'profiles/' || auth.uid()::text || '_%'
)
WITH CHECK (
  bucket_id = 'admin-logos' 
  AND name LIKE 'profiles/' || auth.uid()::text || '_%'
);

-- Política: Los usuarios pueden eliminar su propio logo
DROP POLICY IF EXISTS "Admin can delete own logo" ON storage.objects;
CREATE POLICY "Admin can delete own logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-logos' 
  AND name LIKE 'profiles/' || auth.uid()::text || '_%'
);

-- Política: Todos pueden ver los logos (lectura pública)
DROP POLICY IF EXISTS "Anyone can view admin logos" ON storage.objects;
CREATE POLICY "Anyone can view admin logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'admin-logos');

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar columnas agregadas
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'admin_users' 
AND column_name IN ('logo_url', 'sports_offered')
ORDER BY column_name;

-- Verificar bucket creado
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'admin-logos';

-- Verificar políticas de storage
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%admin%logo%'
ORDER BY policyname;

SELECT 'Migración completada exitosamente' as resultado;
