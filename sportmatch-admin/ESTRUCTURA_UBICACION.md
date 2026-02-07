# 📍 Estructura de Ubicación en SportMatch

## Resumen

La tabla `courts` **SÍ considera country, regions y cities** a través de un sistema de **relaciones de base de datos** optimizado.

## 🗄️ Estructura de Tablas

### Jerarquía de Ubicación

```
countries (Países)
    ↓
regions (Regiones)
    ↓
cities (Ciudades)
    ↓
courts (Canchas)
```

### Relaciones Completas

```sql
-- Tabla de países
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL
);

-- Tabla de regiones (conectada a países)
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id INTEGER REFERENCES countries(id)  -- 🔗 Relación con país
);

-- Tabla de ciudades (conectada a regiones)
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region_id INTEGER REFERENCES regions(id)  -- 🔗 Relación con región
);

-- Tabla de canchas (conectada a ciudades)
CREATE TABLE courts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city_id INTEGER REFERENCES cities(id),  -- 🔗 Relación con ciudad
  ...
);
```

## ✅ Ventajas de Esta Estructura

### 1. **Normalización de Datos**
- ❌ No duplica nombres de países, regiones o ciudades
- ✅ Un solo lugar para actualizar información
- ✅ Integridad referencial garantizada

### 2. **Eficiencia en Consultas**
- ✅ Un solo JOIN obtiene toda la información
- ✅ Índices optimizados en llaves foráneas
- ✅ Queries rápidos incluso con miles de canchas

### 3. **Escalabilidad**
- ✅ Fácil agregar nuevos países/regiones/ciudades
- ✅ Cambios se reflejan en todas las canchas automáticamente
- ✅ No hay datos huérfanos

## 🔍 Cómo Obtener la Información Completa

### Consulta Básica (Solo Ciudad)

```typescript
const { data } = await supabase
  .from('courts')
  .select('*, cities(name)')
  .eq('admin_id', userId);

// Resultado:
// court.cities.name → "Santiago"
```

### Consulta con Región

```typescript
const { data } = await supabase
  .from('courts')
  .select('*, cities(name, regions(name))')
  .eq('admin_id', userId);

// Resultado:
// court.cities.name → "Santiago"
// court.cities.regions.name → "Metropolitana de Santiago"
```

### Consulta Completa (Ciudad + Región + País) ⭐

```typescript
const { data } = await supabase
  .from('courts')
  .select('*, cities(name, regions(name, countries(name)))')
  .eq('admin_id', userId);

// Resultado:
// court.cities.name → "Santiago"
// court.cities.regions.name → "Metropolitana de Santiago"
// court.cities.regions.countries.name → "Chile"
```

## 💻 Implementación en el Panel Admin

### 1. Formulario de Creación/Edición

**Flujo UX:**
```
1. Usuario selecciona REGIÓN
   ↓
2. Se filtran y muestran solo las CIUDADES de esa región
   ↓
3. Usuario selecciona CIUDAD
   ↓
4. Se guarda solo city_id en la BD
```

**Código (CourtForm.tsx):**
```typescript
// Estado para región seleccionada (no se guarda en BD)
const [selectedRegion, setSelectedRegion] = useState('');

// Filtrar ciudades por región
const cities = selectedRegion
  ? regions.find(r => r.id === Number(selectedRegion))?.cities || []
  : [];

// Select de Región (solo para UX)
<select 
  id="region"
  value={selectedRegion}
  onChange={(e) => setSelectedRegion(e.target.value)}
>
  {regions.map(region => (
    <option key={region.id} value={region.id}>
      {region.name}
    </option>
  ))}
</select>

// Select de Ciudad (se guarda como city_id)
<select 
  name="city_id"
  disabled={!selectedRegion}
>
  {cities.map(city => (
    <option key={city.id} value={city.id}>
      {city.name}
    </option>
  ))}
</select>
```

### 2. Visualización en Tarjetas

**CourtCard.tsx:**
```typescript
<div className="flex items-center text-sm text-gray-600">
  <MapPin className="h-4 w-4 mr-1" />
  {court.cities?.name}, {court.cities?.regions?.name}
  {court.cities?.regions?.countries?.name && 
    `, ${court.cities.regions.countries.name}`
  }
</div>

// Muestra: "Santiago, Metropolitana de Santiago, Chile"
```

### 3. Queries en Páginas

**Lista de Canchas (courts/page.tsx):**
```typescript
const { data: courts } = await supabase
  .from('courts')
  .select('*, cities(name, regions(name, countries(name)))')
  .eq('admin_id', user.id)
  .order('created_at', { ascending: false });
```

**Editar Cancha (courts/[id]/edit/page.tsx):**
```typescript
const { data: court } = await supabase
  .from('courts')
  .select('*, cities(id, name, region_id, regions(name, countries(name)))')
  .eq('id', id)
  .single();
```

## 🔄 Flujo Completo

### Crear Nueva Cancha

```
1. Admin abre formulario
   ↓
2. Server Component carga:
   - Todas las regiones
   - Todas las ciudades (agrupadas por región)
   ↓
3. Admin selecciona: "Metropolitana de Santiago" (región)
   ↓
4. Frontend filtra y muestra solo ciudades de esa región
   ↓
5. Admin selecciona: "Santiago" (ciudad)
   ↓
6. Se envía a BD: { ..., city_id: 7 }
   ↓
7. BD almacena solo: city_id = 7
   ↓
8. Al consultar, JOIN automático obtiene:
   - Ciudad: "Santiago"
   - Región: "Metropolitana de Santiago"  
   - País: "Chile"
```

## 📊 Ejemplo con Datos Reales

### Datos en BD

```sql
-- Tabla countries
id | name  | code
1  | Chile | CL

-- Tabla regions  
id | name                          | country_id
7  | Metropolitana de Santiago     | 1
11 | Biobío                        | 1

-- Tabla cities
id | name         | region_id
23 | Santiago     | 7
24 | Providencia  | 7
43 | Concepción   | 11

-- Tabla courts
id                  | name              | city_id | ...
a1b2c3d4-...       | Cancha Central    | 23      | ...
e5f6g7h8-...       | Cancha Norte      | 43      | ...
```

### Query

```typescript
const { data } = await supabase
  .from('courts')
  .select('*, cities(name, regions(name, countries(name)))');
```

### Resultado

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Cancha Central",
    "city_id": 23,
    "cities": {
      "name": "Santiago",
      "regions": {
        "name": "Metropolitana de Santiago",
        "countries": {
          "name": "Chile"
        }
      }
    }
  },
  {
    "id": "e5f6g7h8-...",
    "name": "Cancha Norte",
    "city_id": 43,
    "cities": {
      "name": "Concepción",
      "regions": {
        "name": "Biobío",
        "countries": {
          "name": "Chile"
        }
      }
    }
  }
]
```

## 🎯 Casos de Uso

### 1. Filtrar por Región

```typescript
// En la app móvil: mostrar todas las canchas de una región
const { data } = await supabase
  .from('courts')
  .select('*, cities!inner(name, regions!inner(*))')
  .eq('cities.regions.id', regionId)
  .eq('is_active', true);
```

### 2. Buscar por Ciudad

```typescript
// Canchas en Santiago
const { data } = await supabase
  .from('courts')
  .select('*')
  .eq('city_id', 23)
  .eq('is_active', true);
```

### 3. Estadísticas por País/Región

```sql
-- Total de canchas por región
SELECT 
  r.name as region,
  COUNT(c.id) as total_canchas
FROM courts c
JOIN cities ci ON c.city_id = ci.id
JOIN regions r ON ci.region_id = r.id
GROUP BY r.name
ORDER BY total_canchas DESC;
```

## ⚠️ Consideraciones Importantes

### ❌ NO Hacer

```typescript
// NO guardar nombres directamente en courts
const data = {
  name: "Cancha Central",
  country: "Chile",        // ❌ MAL
  region: "Metropolitana", // ❌ MAL
  city: "Santiago"         // ❌ MAL
};
```

**Problemas:**
- Duplicación de datos
- Difícil de actualizar
- Inconsistencias
- Más espacio en BD

### ✅ SÍ Hacer

```typescript
// SÍ guardar solo el ID de la ciudad
const data = {
  name: "Cancha Central",
  city_id: 23  // ✅ BIEN
};

// Luego obtener la info completa con JOIN
const { data } = await supabase
  .from('courts')
  .select('*, cities(name, regions(name, countries(name)))')
  .eq('id', courtId);
```

## 🔧 Agregar Nuevos Países/Regiones/Ciudades

### Agregar País

```sql
INSERT INTO countries (name, code)
VALUES ('Argentina', 'AR');
```

### Agregar Región

```sql
INSERT INTO regions (name, country_id)
VALUES ('Buenos Aires', 
  (SELECT id FROM countries WHERE code = 'AR')
);
```

### Agregar Ciudad

```sql
INSERT INTO cities (name, region_id)
VALUES ('Buenos Aires', 
  (SELECT id FROM regions WHERE name = 'Buenos Aires' AND country_id = 
    (SELECT id FROM countries WHERE code = 'AR')
  )
);
```

## 📈 Performance

### Índices Actuales

```sql
CREATE INDEX idx_courts_city_id ON courts(city_id);
CREATE INDEX idx_cities_region_id ON cities(region_id);
CREATE INDEX idx_regions_country_id ON regions(country_id);
```

**Beneficios:**
- ✅ Queries rápidos en JOINS
- ✅ Búsquedas eficientes por ubicación
- ✅ Escalabilidad para miles de canchas

## 🎓 Resumen

### ¿La tabla `courts` considera country, regions y cities?

**✅ SÍ, a través de relaciones:**

```
courts.city_id 
  → cities.id
    → cities.region_id 
      → regions.id
        → regions.country_id
          → countries.id
```

### Ventajas

- ✅ **Normalizado** - Sin duplicación
- ✅ **Eficiente** - Queries optimizados
- ✅ **Escalable** - Fácil de extender
- ✅ **Consistente** - Integridad referencial
- ✅ **Flexible** - Fácil de consultar

### Implementado en el Panel

- ✅ Formulario con selección Región → Ciudad
- ✅ Visualización completa en tarjetas
- ✅ Queries con JOINS anidados
- ✅ Tipos TypeScript actualizados

---

**El sistema de ubicación está completo y optimizado. 🎯**
