-- Crear bucket para avatares si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Los usuarios autenticados pueden subir sus propios avatares
-- Los archivos tienen el formato: userId-timestamp.ext
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

-- Política: Los usuarios pueden actualizar sus propios avatares
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

-- Política: Los usuarios pueden eliminar sus propios avatares
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND name LIKE auth.uid()::text || '-%'
);

-- Política: Todos pueden ver los avatares (lectura pública)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
