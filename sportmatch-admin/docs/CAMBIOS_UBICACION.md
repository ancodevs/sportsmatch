# 📝 Cambios en el Sistema de Ubicación

## Resumen de Cambios

Se ha implementado un sistema de ubicación automatizado que simplifica la creación de canchas y mejora la seguridad.

## Antes vs Después

### ❌ ANTES (Método Manual)

**Crear cancha:**
```
1. Ir a Nueva Cancha
2. Seleccionar región manualmente
3. Seleccionar ciudad manualmente
4. Llenar resto del formulario
5. Crear cancha

⚠️ Problema: El admin podía intentar crear canchas en cualquier ciudad
```

**Editar cancha:**
```
1. Ir a Editar Cancha
2. Cambiar región/ciudad
3. Actualizar

⚠️ Problema: Podían mover canchas entre ciudades
```

### ✅ DESPUÉS (Método Automatizado)

**Crear cancha:**
```
1. Ir a Nueva Cancha
2. Ver ubicación asignada automáticamente
3. Llenar resto del formulario
4. Crear cancha (automáticamente en tu ciudad)

✅ Ventaja: No hay posibilidad de error, más rápido
```

**Editar cancha:**
```
1. Ir a Editar Cancha
2. Ver ubicación asignada (solo lectura)
3. Actualizar otros datos

✅ Ventaja: La ubicación no puede cambiar
```

## Flujo de Trabajo Actualizado

### 1. Asignación de Administrador (Por el Super Admin)

```sql
-- Primero: Ver ciudades disponibles
SELECT c.id as city_id, c.name as city, r.name as region, co.name as country
FROM cities c
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
ORDER BY co.name, r.name, c.name;

-- Segundo: Crear admin con ubicación
INSERT INTO admin_users (user_id, business_name, phone, country_id, region_id, city_id, is_verified)
VALUES (
  'uuid-del-usuario',
  'Complejo Deportivo Los Robles',
  '+56912345678',
  1,    -- Chile
  13,   -- Metropolitana
  100,  -- Santiago
  true
);
```

### 2. Verificación por el Administrador

El admin inicia sesión y va a **Configuración**:

```
┌─────────────────────────────────────┐
│ Configuración                       │
├─────────────────────────────────────┤
│                                     │
│ Email: admin@example.com            │
│ Negocio: Complejo Los Robles        │
│ Teléfono: +56912345678              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Ubicación Asignada              │ │
│ ├─────────────────────────────────┤ │
│ │ País:    Chile                  │ │
│ │ Región:  Metropolitana          │ │
│ │ Ciudad:  Santiago               │ │
│ │                                 │ │
│ │ ℹ️ Solo puedes crear canchas    │ │
│ │   en la ciudad asignada         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. Crear Nueva Cancha

El admin va a **Canchas** → **Nueva Cancha**:

```
┌─────────────────────────────────────┐
│ Nueva Cancha                        │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📍 Ubicación de la cancha       │ │
│ │                                 │ │
│ │ Esta cancha se creará en tu     │ │
│ │ ubicación asignada:             │ │
│ │                                 │ │
│ │ Santiago, Metropolitana, Chile  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Nombre: ______________________      │
│ Dirección: ___________________      │
│ Precio/hora: ______________         │
│                                     │
│ ☑ Iluminación                       │
│ ☑ Estacionamiento                   │
│ ☑ Camarines                         │
│                                     │
│         [Cancelar] [Crear Cancha]   │
└─────────────────────────────────────┘
```

### 4. Sin Ubicación Asignada

Si un admin intenta crear una cancha sin tener ubicación:

```
┌─────────────────────────────────────┐
│ Configuración                       │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ❌ No puedes crear canchas      │ │
│ │                                 │ │
│ │ No tienes una ubicación         │ │
│ │ asignada. Contacta al           │ │
│ │ administrador del sistema.      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Ubicación Asignada              │ │
│ ├─────────────────────────────────┤ │
│ │ ⚠️ No asignado                  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Beneficios del Nuevo Sistema

### 🎯 Para el Super Admin (Tú)

✅ **Control total**: Solo tú asignas ubicaciones por SQL
✅ **Seguridad**: Los admins no pueden crear canchas fuera de su ciudad
✅ **Trazabilidad**: Sabes exactamente qué admin opera en qué ciudad
✅ **Escalable**: Puedes tener múltiples admins por ciudad

### 👥 Para los Administradores

✅ **Simplicidad**: No necesitan seleccionar región/ciudad al crear canchas
✅ **Menos errores**: No pueden equivocarse de ubicación
✅ **Más rápido**: Un paso menos en el formulario
✅ **Claridad**: Siempre ven claramente su ubicación asignada

### 🔒 Seguridad

✅ **RLS en la BD**: Política que valida el city_id automáticamente
✅ **Validación en frontend**: Campos bloqueados
✅ **Validación en backend**: Redirect si no hay ubicación
✅ **No hay forma de burlar** la restricción geográfica

## Cambios Técnicos

### Archivos Modificados

1. **Base de datos**:
   - `001_create_admin_tables.sql` - Añadidos campos de ubicación
   - `002_add_location_to_admin_users.sql` - Migración para BDs existentes

2. **Páginas**:
   - `app/dashboard/courts/new/page.tsx` - Ahora obtiene adminData
   - `app/dashboard/courts/[id]/edit/page.tsx` - Ahora obtiene adminData
   - `app/dashboard/settings/page.tsx` - Muestra ubicación solo lectura

3. **Componentes**:
   - `components/CourtForm.tsx` - Simplificado, usa city_id del admin
   - `components/SettingsForm.tsx` - Ubicación solo lectura

4. **Tipos**:
   - `types/database.types.ts` - Añadidos country_id, region_id, city_id

### Políticas RLS Actualizadas

```sql
-- Validación automática en INSERT
CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id 
    AND city_id IN (
      SELECT city_id FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Validación automática en UPDATE
CREATE POLICY "Los admin pueden actualizar sus propias canchas"
  ON courts FOR UPDATE
  USING (auth.uid() = admin_id)
  WITH CHECK (
    auth.uid() = admin_id 
    AND city_id IN (
      SELECT city_id FROM admin_users WHERE user_id = auth.uid()
    )
  );
```

## Migración de Datos Existentes

Si ya tienes administradores sin ubicación:

```sql
-- 1. Ver admins sin ubicación
SELECT id, business_name, phone
FROM admin_users
WHERE city_id IS NULL;

-- 2. Asignar ubicación a cada uno
UPDATE admin_users
SET 
  country_id = 1,    -- Chile
  region_id = 13,    -- Metropolitana (o la que corresponda)
  city_id = 100      -- Santiago (o la que corresponda)
WHERE id = 'uuid-del-admin';

-- 3. Verificar que todos tengan ubicación
SELECT 
  business_name,
  c.name as city,
  r.name as region,
  co.name as country
FROM admin_users au
JOIN cities c ON au.city_id = c.id
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
ORDER BY business_name;
```

## Preguntas Frecuentes

### ¿Qué pasa si un admin intenta crear una cancha sin ubicación?

Es redirigido automáticamente a la página de Configuración con un mensaje de error.

### ¿Pueden los admins editar canchas existentes?

Sí, pero no pueden cambiar la ubicación de la cancha.

### ¿Qué pasa si actualizo la ubicación de un admin?

Las canchas existentes mantienen su ubicación actual. Las nuevas canchas se crearán en la nueva ubicación.

### ¿Puedo tener múltiples admins en la misma ciudad?

Sí, perfectamente. Cada uno gestionará sus propias canchas dentro de esa ciudad.

### ¿Puedo asignar múltiples ciudades a un admin?

No directamente con esta implementación. La solución es crear un usuario por ciudad, o modificar el sistema para soportar múltiples ubicaciones (requiere desarrollo adicional).

## Próximos Pasos Recomendados

1. ✅ **Migrar datos existentes**: Asignar ubicación a admins actuales
2. ✅ **Probar flujo completo**: Crear admin → Ver config → Crear cancha
3. ✅ **Documentar a tu equipo**: Compartir este documento
4. 📋 **Dashboard por ciudad**: (Futuro) Estadísticas por ubicación
5. 📋 **Soporte multi-ciudad**: (Futuro) Si lo necesitas

## Soporte

Si necesitas ayuda con:
- Asignar ubicaciones a admins existentes
- Cambiar la ubicación de un admin
- Entender las políticas RLS
- Extender el sistema

Consulta la documentación en `docs/UBICACIONES.md` o revisa el código de las migraciones.
