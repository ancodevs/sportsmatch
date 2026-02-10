-- ============================================
-- ELIMINAR CAMPOS DE UBICACIÓN DE COURTS
-- ============================================
-- Esta migración complementaria elimina los campos de ubicación
-- de la tabla courts después de haberlos migrado a admin_users.
-- 
-- ⚠️ IMPORTANTE: Solo ejecuta esta migración después de:
-- 1. Haber ejecutado 002_add_location_to_admin_users.sql
-- 2. Haber migrado los datos existentes (si los hay)
-- 3. Haber verificado que admin_users tiene toda la información

-- 1. Eliminar columnas de ubicación de courts
ALTER TABLE courts
DROP COLUMN IF EXISTS address CASCADE,
DROP COLUMN IF EXISTS city_id CASCADE,
DROP COLUMN IF EXISTS latitude CASCADE,
DROP COLUMN IF EXISTS longitude CASCADE;

-- 2. Verificar que ya no hay referencias a estos campos
-- (Las políticas RLS ya fueron actualizadas en la migración 002)

-- Nota: Si tienes vistas o funciones que usan estos campos,
-- asegúrate de actualizarlas antes de ejecutar esta migración.
