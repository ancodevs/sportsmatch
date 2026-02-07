# 🏟️ Tipos de Deportes y Superficies

## Descripción

El sistema ahora incluye clasificación de canchas por tipo de deporte y tipo de superficie. Esto permite a los jugadores encontrar fácilmente el tipo de cancha que necesitan.

## Campo `sport_type`

### Valores en Base de Datos (en inglés)

Los valores se almacenan en inglés para mantener consistencia y facilitar integraciones futuras:

```sql
sport_type TEXT
```

### Tipos de Deporte Disponibles

| Valor (DB) | Nombre (UI) | Emoji |
|------------|-------------|-------|
| `football` | Fútbol | ⚽ |
| `futsal` | Fútbol Sala / Futsal | ⚽ |
| `tennis` | Tenis | 🎾 |
| `paddle` | Pádel | 🎾 |
| `basketball` | Básquetbol | 🏀 |
| `volleyball` | Vóleibol | 🏐 |
| `handball` | Handball | 🤾 |
| `rugby` | Rugby | 🏉 |
| `hockey` | Hockey | 🏑 |
| `cricket` | Cricket | 🏏 |
| `baseball` | Béisbol | ⚾ |
| `softball` | Softball | 🥎 |
| `athletics` | Atletismo | 🏃 |
| `swimming` | Natación | 🏊 |
| `other` | Otro | 🏟️ |

### Ejemplos de Uso

```sql
-- Insertar cancha de fútbol
INSERT INTO courts (name, sport_type, price_per_hour, admin_id)
VALUES ('Cancha Norte', 'football', 25000, 'uuid');

-- Buscar canchas de tenis
SELECT * FROM courts WHERE sport_type = 'tennis';

-- Contar canchas por deporte
SELECT sport_type, COUNT(*) as total
FROM courts
GROUP BY sport_type
ORDER BY total DESC;
```

## Campo `surface_type`

### Valores en Base de Datos (en inglés)

```sql
surface_type TEXT
```

### Tipos de Superficie Disponibles

| Valor (DB) | Nombre (UI) | Descripción |
|------------|-------------|-------------|
| `natural_grass` | Césped Natural | Césped natural, ideal para fútbol |
| `synthetic_grass` | Césped Sintético | Césped artificial de última generación |
| `concrete` | Cemento | Superficie de cemento |
| `parquet` | Parquet | Madera laminada para interiores |
| `clay` | Tierra / Arcilla | Superficie de arcilla, típica en tenis |
| `hardwood` | Madera Dura | Madera maciza para deportes de interior |
| `rubber` | Caucho | Superficie de caucho, común en atletismo |
| `sand` | Arena | Superficie de arena, voleibol de playa |
| `asphalt` | Asfalto | Superficie asfáltica |
| `carpet` | Alfombra / Carpet | Superficie de carpet para tenis |
| `other` | Otro | Otro tipo de superficie |

## Implementación en el Código

### Archivo de Utilidades

**`lib/court-utils.ts`**

Contiene todas las definiciones y funciones de utilidad:

```typescript
// Obtener nombre con emoji
getSportName('football') // "⚽ Fútbol"

// Obtener solo el label
getSportLabel('football') // "Fútbol"

// Obtener nombre de superficie
getSurfaceName('synthetic_grass') // "Césped Sintético"

// Arrays para usar en selects
sportOptions // [{ value: 'football', label: 'Fútbol' }, ...]
surfaceOptions // [{ value: 'natural_grass', label: 'Césped Natural' }, ...]
```

### En Formularios

```tsx
import { sportOptions, surfaceOptions } from '@/lib/court-utils';

<select name="sport_type">
  <option value="">Selecciona un deporte</option>
  {sportOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

### En Componentes de Visualización

```tsx
import { getSportName, getSurfaceName } from '@/lib/court-utils';

<span>{getSportName(court.sport_type)}</span>
<span>{getSurfaceName(court.surface_type)}</span>
```

## Migración SQL

### Para Bases de Datos Nuevas

Ya está incluido en `001_create_admin_tables.sql`:

```sql
CREATE TABLE courts (
  ...
  sport_type TEXT,
  surface_type TEXT,
  ...
);
```

### Para Bases de Datos Existentes

Ejecuta `004_add_sport_type_to_courts.sql`:

```sql
-- Añadir columna
ALTER TABLE courts
ADD COLUMN IF NOT EXISTS sport_type TEXT;

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_courts_sport_type ON courts(sport_type);
```

### Migración de Datos Existentes (Opcional)

Si ya tienes canchas y puedes inferir el deporte del nombre:

```sql
-- Actualizar automáticamente basándose en el nombre
UPDATE courts SET sport_type = 'football' 
WHERE name ILIKE '%fútbol%' OR name ILIKE '%futbol%' OR name ILIKE '%soccer%';

UPDATE courts SET sport_type = 'tennis' 
WHERE name ILIKE '%tenis%' OR name ILIKE '%tennis%';

UPDATE courts SET sport_type = 'basketball' 
WHERE name ILIKE '%básquet%' OR name ILIKE '%basket%';

UPDATE courts SET sport_type = 'volleyball' 
WHERE name ILIKE '%vólei%' OR name ILIKE '%voley%' OR name ILIKE '%volleyball%';

UPDATE courts SET sport_type = 'paddle' 
WHERE name ILIKE '%pádel%' OR name ILIKE '%paddle%';

-- Revisar canchas sin tipo
SELECT id, name, sport_type FROM courts WHERE sport_type IS NULL;
```

## Búsquedas y Filtros

### Buscar por Deporte

```sql
-- Todas las canchas de fútbol
SELECT * FROM courts WHERE sport_type = 'football';

-- Canchas de fútbol o futsal
SELECT * FROM courts WHERE sport_type IN ('football', 'futsal');

-- Canchas de deportes de raqueta
SELECT * FROM courts WHERE sport_type IN ('tennis', 'paddle');
```

### Estadísticas por Deporte

```sql
-- Contar canchas por deporte
SELECT 
  sport_type,
  COUNT(*) as total,
  AVG(price_per_hour) as precio_promedio
FROM courts
WHERE is_active = true
GROUP BY sport_type
ORDER BY total DESC;

-- Deportes más populares por ciudad
SELECT 
  c.name as ciudad,
  co.sport_type,
  COUNT(*) as total_canchas
FROM courts co
JOIN admin_users au ON co.admin_id = au.user_id
JOIN cities c ON au.city_id = c.id
WHERE co.is_active = true
GROUP BY c.name, co.sport_type
ORDER BY total_canchas DESC;
```

### Búsqueda Combinada

```sql
-- Canchas de fútbol con césped sintético
SELECT * FROM courts 
WHERE sport_type = 'football' 
  AND surface_type = 'synthetic_grass'
  AND is_active = true;

-- Canchas de tenis con arcilla en una ciudad específica
SELECT co.*, au.address, ci.name as city
FROM courts co
JOIN admin_users au ON co.admin_id = au.user_id
JOIN cities ci ON au.city_id = ci.id
WHERE co.sport_type = 'tennis'
  AND co.surface_type = 'clay'
  AND ci.id = 100;
```

## Validaciones y Restricciones

### Validación en Formulario

El campo `sport_type` es **obligatorio** en el formulario:

```tsx
<select name="sport_type" required>
```

### Validación en Base de Datos (Opcional)

Si quieres restringir los valores permitidos:

```sql
ALTER TABLE courts
ADD CONSTRAINT check_sport_type CHECK (
  sport_type IN (
    'football', 'futsal', 'tennis', 'paddle', 
    'basketball', 'volleyball', 'handball', 'rugby',
    'hockey', 'cricket', 'baseball', 'softball',
    'athletics', 'swimming', 'other'
  ) OR sport_type IS NULL
);
```

## Añadir Nuevos Deportes

Si necesitas añadir un nuevo deporte:

### 1. Actualizar `lib/court-utils.ts`

```typescript
export const sportTypes = {
  // ... deportes existentes
  badminton: { label: 'Bádminton', emoji: '🏸' },
  squash: { label: 'Squash', emoji: '🎾' },
  // ... etc
} as const;
```

### 2. Actualizar la Restricción SQL (si existe)

```sql
ALTER TABLE courts
DROP CONSTRAINT IF EXISTS check_sport_type;

ALTER TABLE courts
ADD CONSTRAINT check_sport_type CHECK (
  sport_type IN (
    -- ... valores existentes
    'badminton', 'squash'
  ) OR sport_type IS NULL
);
```

### 3. Los formularios se actualizarán automáticamente

El selector de deportes usa `sportOptions` que se genera automáticamente desde `sportTypes`.

## Integración con App Móvil

Cuando expongas las canchas a la app móvil, los valores están en inglés para facilitar la internacionalización:

```json
{
  "court": {
    "name": "Cancha Norte",
    "sport_type": "football",
    "surface_type": "synthetic_grass"
  }
}
```

La app móvil puede traducir estos valores según el idioma del usuario:

```typescript
// En la app móvil
const sportTranslations = {
  en: { football: 'Football', tennis: 'Tennis', ... },
  es: { football: 'Fútbol', tennis: 'Tenis', ... },
  pt: { football: 'Futebol', tennis: 'Tênis', ... },
};

const displaySport = sportTranslations[userLanguage][court.sport_type];
```

## Recomendaciones

1. **Consistencia**: Siempre usa los valores en inglés en la base de datos
2. **Traducciones**: Maneja las traducciones en el código, no en la BD
3. **Validación**: Valida los valores en el frontend antes de guardar
4. **Índices**: Mantén el índice en `sport_type` para búsquedas rápidas
5. **Documentación**: Actualiza esta lista cuando añadas nuevos deportes

## Preguntas Frecuentes

### ¿Por qué los valores están en inglés?

- **Estándar internacional**: Facilita integraciones y APIs
- **Internacionalización**: Más fácil añadir nuevos idiomas
- **Consistencia**: Evita problemas con acentos y codificación

### ¿Puedo cambiar los valores a español?

Sí, pero no es recomendable. Si lo haces:
1. Actualiza `court-utils.ts`
2. Migra todos los datos existentes
3. Actualiza cualquier integración externa

### ¿Qué pasa si no especifico el deporte?

El campo es opcional en la base de datos pero requerido en el formulario. Las canchas antiguas pueden no tener deporte asignado.

### ¿Cómo busco canchas sin tipo de deporte?

```sql
SELECT * FROM courts WHERE sport_type IS NULL;
```

### ¿Puedo tener múltiples deportes en una cancha?

Actualmente no. Si necesitas esto:
1. Crea una tabla `court_sports` de relación muchos a muchos
2. O crea canchas separadas para cada deporte
