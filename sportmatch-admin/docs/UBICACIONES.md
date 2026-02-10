# 🌍 Sistema de Ubicaciones para Administradores

## Descripción

El sistema de ubicaciones permite que cada administrador tenga asignada una ciudad específica donde puede crear y gestionar sus canchas deportivas. Esto garantiza que cada administrador solo pueda crear canchas en su propia ubicación geográfica.

## Estructura de Datos

### Tablas de Ubicación

El sistema utiliza una estructura jerárquica de ubicaciones compartida con el proyecto principal `sportmatch`:

```
países (countries)
  └── regiones (regions)
      └── ciudades (cities)
```

### Campos en `admin_users`

```sql
country_id INTEGER REFERENCES countries(id)
region_id INTEGER REFERENCES regions(id)
city_id INTEGER REFERENCES cities(id)
```

Todos los campos son opcionales (`NULL`) para permitir flexibilidad, pero son **requeridos** para poder crear canchas.

## Flujo de Uso

### 1. Asignación de Ubicación (Solo Administrador del Sistema)

Cuando creas un nuevo administrador, **DEBES** asignarle su ubicación en el momento de crear la cuenta. La ubicación **no se puede cambiar** desde la interfaz por motivos de seguridad.

**Método A: Usando la interfaz de Supabase**

1. Ve a **Authentication** → **Users** y crea el usuario
2. Copia el UUID del usuario creado
3. Ve a **Table Editor** → `cities` para ver las ciudades disponibles
4. Ve a **Table Editor** → `admin_users` → **Insert row**
5. Asigna:
   - `user_id`: UUID del usuario
   - `business_name`: Nombre del negocio
   - `phone`: Teléfono
   - `country_id`, `region_id`, `city_id`: Ubicación donde operará
   - `is_verified`: true

**Método B: Usando SQL**

```sql
-- Ver ciudades disponibles:
SELECT c.id as city_id, c.name as city, r.name as region, co.name as country
FROM cities c
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
WHERE co.code = 'CL'  -- Filtrar por país
ORDER BY co.name, r.name, c.name;

-- Crear administrador con ubicación:
INSERT INTO admin_users (user_id, business_name, phone, country_id, region_id, city_id, is_verified)
VALUES ('TU-UUID', 'Mi Complejo Deportivo', '+56912345678', 1, 13, 100, true);
```

### 2. Verificación por el Administrador

El administrador puede ver su ubicación asignada:

1. Inicia sesión en el panel
2. Ve a **Configuración**
3. En la sección "Ubicación Asignada" verá:
   - País
   - Región
   - Ciudad

**⚠️ Los campos de ubicación son de SOLO LECTURA**. No se pueden cambiar desde la interfaz.

### 3. Creación de Canchas

Con la ubicación ya asignada, el administrador:

1. Ve a **Canchas** → **Nueva Cancha**
2. Verá un mensaje informativo mostrando su ubicación asignada:
   ```
   📍 Esta cancha se creará en tu ubicación asignada:
   Santiago, Metropolitana, Chile
   ```
3. Completa el formulario (sin poder cambiar la ubicación)
4. La cancha se crea automáticamente con el `city_id` del administrador

**Importante**: 
- Los campos de región/ciudad ya **no aparecen** en el formulario
- La ubicación se asigna automáticamente
- Si el administrador no tiene ubicación asignada, será redirigido a Configuración con un mensaje de error

**Validación a nivel de base de datos:**

```sql
-- Política RLS en la tabla courts:
CREATE POLICY "Los admin pueden insertar sus propias canchas"
  ON courts FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id 
    AND city_id IN (
      SELECT city_id FROM admin_users WHERE user_id = auth.uid()
    )
  );
```

## Restricciones y Validaciones

### 1. Validación en INSERT

Al intentar crear una cancha, el sistema verifica:
- ✅ El usuario está autenticado
- ✅ El `admin_id` coincide con el usuario autenticado
- ✅ El `city_id` de la cancha coincide con el `city_id` del administrador

### 2. Validación en UPDATE

Al actualizar una cancha, el sistema verifica:
- ✅ El usuario es el propietario de la cancha
- ✅ Si cambia el `city_id`, debe ser el mismo que el del administrador

### 3. Error común

Si intentas crear una cancha sin haber configurado tu ubicación:

```
Error: new row violates row-level security policy for table "courts"
```

**Solución**: Configura tu ubicación en **Configuración** → **Ubicación**

## Casos de Uso

### Caso 1: Administrador con un solo complejo deportivo

**Escenario**: Un administrador tiene un complejo deportivo en Santiago.

**Configuración**:
- `country_id`: 1 (Chile)
- `region_id`: 13 (Metropolitana)
- `city_id`: 100 (Santiago)

**Resultado**: Solo puede crear canchas en Santiago.

### Caso 2: Cambio de ciudad (caso especial)

**Escenario**: Un administrador se muda o cambia su operación a otra ciudad.

**Solución**:
1. Solo el administrador del sistema puede cambiar la ubicación por SQL:
   ```sql
   UPDATE admin_users
   SET country_id = X, region_id = Y, city_id = Z
   WHERE user_id = 'UUID-DEL-ADMIN';
   ```
2. Las canchas antiguas permanecen en la ciudad anterior
3. Las nuevas canchas se crearán en la nueva ciudad

**Nota**: Este cambio NO se puede hacer desde la interfaz web por motivos de seguridad. Las canchas existentes NO se mueven automáticamente.

### Caso 3: Múltiples ciudades (no soportado directamente)

**Escenario**: Un administrador tiene complejos en múltiples ciudades.

**Solución recomendada**:
- Crear un usuario administrador separado para cada ciudad
- Cada usuario gestiona las canchas de su ciudad específica

**Alternativa avanzada** (requiere desarrollo adicional):
- Modificar la estructura para soportar múltiples ubicaciones por administrador
- Usar una tabla intermedia `admin_locations`

## Migraciones

### Para bases de datos nuevas

Ejecuta la migración principal:
```bash
supabase/migrations/001_create_admin_tables.sql
```

### Para bases de datos existentes

Ejecuta la migración adicional:
```bash
supabase/migrations/002_add_location_to_admin_users.sql
```

Esta migración:
1. Añade las columnas `country_id`, `region_id`, `city_id`
2. Crea índices para mejor rendimiento
3. Actualiza las políticas RLS con las nuevas validaciones

## Consultas Útiles

### Ver administradores con sus ubicaciones

```sql
SELECT 
  au.id,
  au.business_name,
  co.name as country,
  r.name as region,
  c.name as city,
  au.is_verified
FROM admin_users au
LEFT JOIN cities c ON au.city_id = c.id
LEFT JOIN regions r ON au.region_id = r.id
LEFT JOIN countries co ON au.country_id = co.id
ORDER BY au.business_name;
```

### Ver canchas por administrador y ciudad

```sql
SELECT 
  au.business_name,
  c.name as city,
  COUNT(co.id) as total_courts
FROM admin_users au
LEFT JOIN cities c ON au.city_id = c.id
LEFT JOIN courts co ON co.admin_id = au.user_id AND co.city_id = au.city_id
GROUP BY au.business_name, c.name
ORDER BY total_courts DESC;
```

### Verificar administradores sin ubicación configurada

```sql
SELECT 
  id,
  business_name,
  phone,
  is_verified
FROM admin_users
WHERE city_id IS NULL OR region_id IS NULL OR country_id IS NULL;
```

## Consideraciones de Rendimiento

### Índices creados

```sql
CREATE INDEX idx_admin_users_country_id ON admin_users(country_id);
CREATE INDEX idx_admin_users_region_id ON admin_users(region_id);
CREATE INDEX idx_admin_users_city_id ON admin_users(city_id);
```

Estos índices mejoran:
- ✅ Búsquedas de administradores por ubicación
- ✅ Validación de políticas RLS
- ✅ Consultas de estadísticas geográficas

## Preguntas Frecuentes

### ¿Puedo cambiar la ciudad de un administrador?

No desde la interfaz web. Por motivos de seguridad, la ubicación solo puede ser cambiada por el administrador del sistema mediante SQL:

```sql
UPDATE admin_users
SET country_id = X, region_id = Y, city_id = Z
WHERE user_id = 'UUID-DEL-ADMIN';
```

### ¿Por qué la ubicación no se puede cambiar desde la interfaz?

Por seguridad y control. Esto garantiza que:
- Los administradores no puedan cambiar arbitrariamente su ubicación
- Mantengas control sobre quién opera en cada ciudad
- Se eviten conflictos territoriales entre administradores

### ¿Qué pasa con las canchas antiguas si cambio de ciudad?

Las canchas antiguas permanecen en su ciudad original. Puedes:
1. Dejarlas en la ciudad antigua (recomendado)
2. Actualizarlas manualmente con SQL (si es necesario)
3. Asignarlas a otro administrador de esa ciudad

### ¿Puedo gestionar canchas en múltiples ciudades?

No directamente. La solución recomendada es crear un usuario administrador por cada ciudad.

### ¿Qué pasa si un administrador no tiene ubicación asignada?

No podrá crear canchas hasta que tú (el administrador del sistema) le asignes una ubicación por base de datos. En la página de Configuración verá una advertencia indicando que debe contactarte.

## Futuras Mejoras

- [ ] Soporte para múltiples ubicaciones por administrador
- [ ] Alertas cuando un administrador intenta crear una cancha en otra ciudad
- [ ] Dashboard con estadísticas por ubicación
- [ ] Filtros avanzados por región/ciudad en la lista de canchas
