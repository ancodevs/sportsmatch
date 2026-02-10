-- ============================================
-- MIGRACIÓN: Fix RLS para Finalizar Partidos
-- ============================================
-- Permite al organizador actualizar el estado a 'finished'
-- ============================================

-- 1. Eliminar política restrictiva anterior si existe
DROP POLICY IF EXISTS "Organizador puede cambiar estado" ON matches;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus partidos" ON matches;
DROP POLICY IF EXISTS "Solo creador puede actualizar partido" ON matches;

-- 2. Crear política actualizada que permita todos los cambios de estado
CREATE POLICY "Organizador puede actualizar su partido"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    -- Permitir todos los estados válidos
    status IN ('draft', 'open', 'full', 'confirmed', 'finished', 'cancelled')
  );

-- 3. Verificar política de SELECT (debe permitir ver partidos finished)
DROP POLICY IF EXISTS "Usuarios pueden ver partidos disponibles" ON matches;
CREATE POLICY "Usuarios pueden ver partidos disponibles"
  ON matches
  FOR SELECT
  TO authenticated
  USING (
    status IN ('open', 'full', 'confirmed', 'finished') OR
    created_by = auth.uid()
  );

-- 4. Crear política específica para INSERT (crear partidos)
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear partidos" ON matches;
CREATE POLICY "Usuarios autenticados pueden crear partidos"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open')
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver políticas actuales
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
WHERE tablename = 'matches'
ORDER BY policyname;

-- ============================================
-- NOTAS
-- ============================================

/*
Políticas RLS para matches:

1. SELECT (Ver partidos):
   - Puede ver: open, full, confirmed, finished
   - O si es el creador (cualquier estado)

2. INSERT (Crear partidos):
   - Solo puede crear con status 'draft' o 'open'
   - Debe ser el creador

3. UPDATE (Actualizar partidos):
   - Solo el creador puede actualizar
   - Puede cambiar a cualquier estado válido:
     * draft, open, full, confirmed, finished, cancelled

Esto permite:
✓ Organizador crea partido (open)
✓ Sistema actualiza a full (automático via trigger)
✓ Organizador confirma (confirmed)
✓ Organizador finaliza (finished) ← FIX PRINCIPAL
✓ Organizador cancela (cancelled)
*/
