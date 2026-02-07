# 🏟️ Estructura de Ubicación: Complejo → Canchas

## Concepto

El sistema está diseñado con la siguiente lógica:

```
Administrador (admin_users)
    ├── Complejo Deportivo (dirección física única)
    │   ├── address: "Av. Libertador 123, Santiago"
    │   ├── city_id, region_id, country_id
    │   └── latitude, longitude
    │
    └── Canchas (courts)
        ├── Cancha 1: "Fútbol 7 - Norte"
        ├── Cancha 2: "Fútbol 7 - Sur"
        ├── Cancha 3: "Fútbol 11 - Principal"
        └── Cancha 4: "Tenis - Court 1"

Todas las canchas están en la misma ubicación física
```

## Razones del Diseño

### ✅ Por qué la ubicación está en `admin_users`:

1. **Realidad física**: Un complejo deportivo tiene una sola dirección
2. **Duplicación innecesaria**: Evita repetir la misma dirección en cada cancha
3. **Simplicidad**: Un solo lugar para gestionar la ubicación
4. **Coherencia**: Todas las canchas del mismo admin están en el mismo lugar
5. **Mantenimiento**: Si cambias de sede, actualizas un solo registro

### ❌ Por qué NO está en `courts`:

1. Cada cancha tendría la misma dirección (redundante)
2. Mayor probabilidad de errores al ingresar datos
3. Difícil de mantener si hay cambios
4. No refleja la realidad de un complejo deportivo

## Estructura de Datos

### Tabla `admin_users`

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT,              -- "Complejo Deportivo Los Robles"
  phone TEXT,                       -- "+56912345678"
  address TEXT,                     -- "Av. Libertador 123, Santiago" ⭐
  country_id INTEGER,               -- 1 (Chile) ⭐
  region_id INTEGER,                -- 13 (Metropolitana) ⭐
  city_id INTEGER,                  -- 100 (Santiago) ⭐
  latitude DECIMAL(10, 8),          -- -33.4489 ⭐
  longitude DECIMAL(11, 8),         -- -70.6693 ⭐
  is_verified BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**⭐ = Ubicación del complejo deportivo**

### Tabla `courts`

```sql
CREATE TABLE courts (
  id UUID PRIMARY KEY,
  name TEXT,                        -- "Cancha Fútbol 7 - Norte" ⭐
  description TEXT,                 -- "Cancha con césped sintético..." ⭐
  surface_type TEXT,                -- "cesped_sintetico" ⭐
  has_lighting BOOLEAN,             -- true ⭐
  has_parking BOOLEAN,              -- true ⭐
  has_changing_rooms BOOLEAN,       -- true ⭐
  price_per_hour DECIMAL(10, 2),   -- 25000 ⭐
  capacity INTEGER,                 -- 14 jugadores ⭐
  admin_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
  
  -- ❌ NO tiene: address, city_id, latitude, longitude
);
```

**⭐ = Características propias de la cancha**

## Flujo de Trabajo

### 1. Crear Administrador (Tú, como Super Admin)

```sql
-- Consultar ciudades disponibles
SELECT c.id, c.name as city, r.name as region, co.name as country
FROM cities c
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
WHERE co.code = 'CL'
ORDER BY r.name, c.name;

-- Crear admin con ubicación del complejo
INSERT INTO admin_users (
  user_id, 
  business_name, 
  phone, 
  address,
  country_id, 
  region_id, 
  city_id,
  latitude,
  longitude,
  is_verified
) VALUES (
  'uuid-del-usuario',
  'Complejo Deportivo Los Robles',
  '+56912345678',
  'Av. Libertador 123, Santiago',
  1,        -- Chile
  13,       -- Metropolitana
  100,      -- Santiago
  -33.4489, -- Latitud
  -70.6693, -- Longitud
  true
);
```

### 2. Administrador Gestiona su Complejo

En **Configuración**, el administrador puede:
- ✅ Ver su ubicación asignada (solo lectura)
- ✅ Editar nombre del negocio
- ✅ Editar teléfono
- ✅ Editar dirección del complejo

```tsx
// Página de Configuración
<SettingsForm>
  <input name="business_name" />
  <input name="phone" />
  <input name="address" />  {/* ⭐ Dirección del complejo */}
  
  <div>Ubicación Asignada (solo lectura):</div>
  <div>País: {adminData.cities.regions.countries.name}</div>
  <div>Región: {adminData.cities.regions.name}</div>
  <div>Ciudad: {adminData.cities.name}</div>
</SettingsForm>
```

### 3. Administrador Crea Canchas

En **Nueva Cancha**, el administrador:
- ✅ Ve la ubicación de su complejo (automática)
- ✅ Solo ingresa datos específicos de la cancha
- ❌ NO ingresa dirección (ya está en su perfil)

```tsx
// Formulario de Cancha
<CourtForm>
  <InfoBox>
    📍 Ubicación: {adminData.address}
    {adminData.cities.name}, {adminData.cities.regions.name}
  </InfoBox>
  
  <input name="name" />          {/* Ej: "Cancha Fútbol 7 - Norte" */}
  <textarea name="description" /> {/* Ej: "Césped sintético de última generación..." */}
  <select name="surface_type" />  {/* cesped_sintetico */}
  <input name="price_per_hour" /> {/* 25000 */}
  <input name="capacity" />       {/* 14 */}
  <checkbox name="has_lighting" />
  <checkbox name="has_parking" />
  <checkbox name="has_changing_rooms" />
</CourtForm>
```

## Consultas Útiles

### Ver complejo con sus canchas

```sql
SELECT 
  au.business_name,
  au.address,
  c.name as city,
  r.name as region,
  COUNT(co.id) as total_canchas
FROM admin_users au
LEFT JOIN cities c ON au.city_id = c.id
LEFT JOIN regions r ON c.region_id = r.id
LEFT JOIN courts co ON co.admin_id = au.user_id
GROUP BY au.business_name, au.address, c.name, r.name
ORDER BY au.business_name;
```

### Ver todas las canchas con la ubicación de su complejo

```sql
SELECT 
  au.business_name as complejo,
  au.address as direccion_complejo,
  c.name as ciudad,
  co.name as cancha,
  co.surface_type,
  co.price_per_hour
FROM courts co
JOIN admin_users au ON co.admin_id = au.user_id
JOIN cities c ON au.city_id = c.id
ORDER BY au.business_name, co.name;
```

### Buscar canchas cerca de una ubicación

```sql
-- Usando la ubicación del complejo (latitude/longitude en admin_users)
SELECT 
  au.business_name,
  au.address,
  co.name as cancha,
  co.price_per_hour,
  (
    6371 * acos(
      cos(radians(-33.4489)) * 
      cos(radians(au.latitude)) * 
      cos(radians(au.longitude) - radians(-70.6693)) + 
      sin(radians(-33.4489)) * 
      sin(radians(au.latitude))
    )
  ) AS distance_km
FROM courts co
JOIN admin_users au ON co.admin_id = au.user_id
WHERE au.latitude IS NOT NULL AND au.longitude IS NOT NULL
ORDER BY distance_km
LIMIT 10;
```

## Casos de Uso

### Caso 1: Complejo con múltiples canchas

**Complejo Deportivo Los Robles**
- Dirección: Av. Libertador 123, Santiago
- Canchas:
  - Fútbol 7 - Norte (césped sintético, $25.000/hr)
  - Fútbol 7 - Sur (césped sintético, $25.000/hr)
  - Fútbol 11 - Principal (césped natural, $40.000/hr)
  - Tenis - Court 1 (cemento, $15.000/hr)

**Ventaja**: Una sola dirección, fácil de gestionar

### Caso 2: Administrador cambia de sede

Si el administrador se muda a un nuevo local:

```sql
-- Actualizar la dirección del complejo
UPDATE admin_users
SET 
  address = 'Nueva Av. Principal 456, Santiago',
  latitude = -33.5123,
  longitude = -70.7456
WHERE user_id = 'uuid-del-admin';

-- Todas las canchas ahora están en la nueva ubicación
-- No necesitas actualizar cada cancha individualmente
```

### Caso 3: Múltiples complejos del mismo dueño

Si una persona tiene dos complejos en diferentes ciudades:

**Solución**: Crear dos usuarios administradores

```
Usuario 1 (admin@complejo-stgo.cl)
  └── Complejo Santiago (Av. Libertador 123, Santiago)
      ├── Cancha 1
      └── Cancha 2

Usuario 2 (admin@complejo-valpo.cl)
  └── Complejo Valparaíso (Calle Mar 789, Valparaíso)
      ├── Cancha 1
      └── Cancha 2
```

## Migración desde el Sistema Antiguo

Si tenías `address`, `city_id`, `latitude`, `longitude` en `courts`:

```sql
-- Paso 1: Migrar ubicación de la primera cancha a admin_users
UPDATE admin_users au
SET 
  address = c.address,
  city_id = c.city_id,
  latitude = c.latitude,
  longitude = c.longitude
FROM (
  SELECT DISTINCT ON (admin_id) 
    admin_id, address, city_id, latitude, longitude
  FROM courts
  ORDER BY admin_id, created_at
) c
WHERE au.user_id = c.admin_id
  AND au.address IS NULL;  -- Solo si no tiene dirección

-- Paso 2: Verificar que todos los admins tienen ubicación
SELECT 
  au.business_name,
  au.address,
  c.name as city
FROM admin_users au
LEFT JOIN cities c ON au.city_id = c.id
ORDER BY au.business_name;

-- Paso 3: Eliminar campos de ubicación de courts
-- (Solo después de verificar que la migración fue exitosa)
ALTER TABLE courts
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS city_id,
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;
```

## Preguntas Frecuentes

### ¿Qué pasa si un admin tiene canchas en diferentes direcciones?

Esto no debería ocurrir en un modelo de complejo deportivo. Si realmente tiene canchas en diferentes ubicaciones físicas, la solución es crear un usuario administrador para cada ubicación.

### ¿Puedo tener canchas sin dirección del complejo?

Sí, el campo `address` en `admin_users` es opcional. Sin embargo, es recomendable configurarlo para que los jugadores sepan dónde está el complejo.

### ¿Cómo muestro la ubicación de una cancha en la app móvil?

Haces JOIN con `admin_users` para obtener la ubicación:

```sql
SELECT 
  co.*,
  au.address,
  au.latitude,
  au.longitude,
  c.name as city
FROM courts co
JOIN admin_users au ON co.admin_id = au.user_id
JOIN cities c ON au.city_id = c.id
WHERE co.is_active = true;
```

### ¿Qué campos son obligatorios?

**En `admin_users`:**
- ✅ Obligatorios: `user_id`, `is_verified`
- ✅ Recomendados: `business_name`, `phone`, `address`, `city_id`
- ⚠️ Opcionales: `latitude`, `longitude`, `region_id`, `country_id`

**En `courts`:**
- ✅ Obligatorios: `name`, `price_per_hour`, `admin_id`
- ⚠️ Opcionales: Todos los demás

## Beneficios del Nuevo Sistema

| Aspecto | Antes (ubicación en courts) | Ahora (ubicación en admin_users) |
|---------|----------------------------|-----------------------------------|
| **Duplicación** | Alta (misma dirección en cada cancha) | Ninguna (una sola dirección) |
| **Mantenimiento** | Difícil (actualizar cada cancha) | Fácil (actualizar un solo lugar) |
| **Errores** | Probable (inconsistencias) | Improbable (single source of truth) |
| **Rendimiento** | Más datos en DB | Menos datos en DB |
| **Coherencia** | Difícil de mantener | Garantizada por diseño |
| **Escalabilidad** | Limitada | Excelente |

## Conclusión

Este diseño refleja la realidad de un complejo deportivo:
- Un complejo = Una ubicación
- Múltiples canchas = Misma ubicación
- Simple, eficiente y fácil de mantener
