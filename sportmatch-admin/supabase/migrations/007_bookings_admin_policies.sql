-- ============================================
-- GESTIÓN DE RESERVAS - SPORTMATCH
-- Permite a admin crear y eliminar reservas
-- ============================================

-- Eliminar política antigua de INSERT
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias reservas" ON bookings;

-- INSERT: jugador puede crear su propia reserva O admin puede crear en sus canchas
CREATE POLICY "Insertar reservas: jugador o admin"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- DELETE: jugador puede eliminar la suya O admin puede eliminar en sus canchas
CREATE POLICY "Eliminar reservas: jugador o admin"
  ON bookings FOR DELETE TO authenticated
  USING (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- Permitir que admins lean perfiles para crear reservas en nombre de jugadores
DROP POLICY IF EXISTS "Admin pueden ver perfiles para reservas" ON profiles;
CREATE POLICY "Admin pueden ver perfiles para reservas"
  ON profiles FOR SELECT TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
