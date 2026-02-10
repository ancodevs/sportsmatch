# 🔄 Actualización: Sistema de Partidos con Canchas

## 📝 Cambios Realizados

Se ha actualizado el sistema de partidos para usar **canchas (courts)** en lugar de ubicación manual.

---

## ✨ Nuevas Características

### 1. Selección de Canchas por Región

El formulario ahora permite:
- ✅ Seleccionar el tipo de deporte primero
- ✅ Seleccionar la región del usuario
- ✅ Ver solo canchas disponibles en esa región
- ✅ Filtrado automático por tipo de deporte
- ✅ Vista previa completa de la cancha seleccionada

### 2. Información de Cancha Integrada

Cada cancha muestra:
- ✅ Nombre de la cancha
- ✅ Complejo deportivo
- ✅ Dirección completa
- ✅ Ciudad
- ✅ Tipo de superficie
- ✅ Características (iluminación, estacionamiento)

### 3. Pre-selección Inteligente

- ✅ La región del usuario se carga automáticamente
- ✅ Se marca visualmente como "Tu región"
- ✅ Mejora la experiencia del usuario

---

## 🗄️ Cambios en la Base de Datos

### Tabla `matches` - Campos Modificados

**ANTES:**
```sql
address TEXT NULL,
country_id INTEGER NULL,
region_id INTEGER NULL,
city_id INTEGER NULL,
```

**AHORA:**
```sql
court_id UUID NULL REFERENCES courts(id),
```

### Beneficios del Cambio

1. **Datos Centralizados**: La ubicación está en `admin_users`, no duplicada
2. **Integridad**: FK garantiza que la cancha existe y está activa
3. **Información Rica**: Una cancha incluye toda su info (superficie, características, etc.)
4. **Filtrado Eficiente**: Fácil buscar partidos por tipo de cancha o región

---

## 🎯 Flujo de Usuario Actualizado

### Crear un Partido

1. **Título y Descripción**
   - Usuario ingresa título obligatorio
   - Descripción opcional

2. **Tipo de Deporte**
   - Selecciona: Fútbol, Basketball, Volleyball, Tenis, Pádel, Otro
   - Este campo filtra las canchas disponibles

3. **Región**
   - Se pre-carga con la región del usuario
   - Puede cambiarla si desea crear en otra región
   - Sistema carga canchas de esa región

4. **Cancha**
   - Lista solo canchas del tipo de deporte seleccionado
   - Muestra nombre + complejo deportivo
   - Al seleccionar, muestra tarjeta con info completa:
     - Ubicación exacta
     - Características
     - Tipo de superficie

5. **Fecha y Hora**
   - Date/Time pickers nativos
   - Validación de fecha futura

6. **Detalles Finales**
   - Modo de juego (mixto, masculino, femenino)
   - Número máximo de jugadores
   - Precio de entrada

7. **Crear**
   - Validación completa
   - Creación en BD
   - Usuario se agrega como capitán automáticamente

---

## 🔍 Query de Ejemplo

### Obtener Partidos con Info de Cancha

```sql
SELECT 
  m.id,
  m.title,
  m.datetime,
  m.match_type,
  c.name as cancha_nombre,
  c.sport_type,
  c.surface_type,
  au.business_name as complejo,
  au.address as direccion,
  ci.name as ciudad,
  r.name as region
FROM matches m
JOIN courts c ON m.court_id = c.id
JOIN admin_users au ON c.admin_id = au.user_id
JOIN cities ci ON au.city_id = ci.id
JOIN regions r ON ci.region_id = r.id
WHERE m.status = 'pending'
ORDER BY m.datetime;
```

---

## 📱 Componentes del Formulario

### Estados Visuales

#### 1. Cargando Canchas
```
[ActivityIndicator]
Cargando canchas disponibles...
```

#### 2. Sin Canchas Disponibles
```
[Icono de Alerta]
No hay canchas de [tipo] disponibles en esta región
Intenta seleccionar otra región u otro tipo de deporte
```

#### 3. Cancha Seleccionada
```
┌─────────────────────────────────────┐
│ 📍 Cancha Fútbol 7 - Central        │
├─────────────────────────────────────┤
│ Complejo:    Complejo Los Andes     │
│ Dirección:   Av. Libertador 1234    │
│ Ciudad:      Santiago               │
│ Superficie:  Césped sintético       │
│                                     │
│ [💡 Iluminación] [🚗 Estacionamiento]│
└─────────────────────────────────────┘
```

---

## ⚙️ Lógica de Filtrado

### Paso 1: Filtrar por Región
```typescript
// Obtener ciudades de la región
const cities = await supabase
  .from('cities')
  .select('id')
  .eq('region_id', selectedRegionId);

// Obtener canchas de admin_users en esas ciudades
const courts = await supabase
  .from('courts')
  .select(`*, admin_users!courts_admin_id_fkey(...)`)
  .in('admin_users.city_id', cityIds);
```

### Paso 2: Filtrar por Tipo de Deporte
```typescript
const filtered = courts.filter(court => {
  if (!court.sport_type) return true; // Mostrar si no tiene tipo
  return court.sport_type === matchType;
});
```

---

## 🐛 Consideraciones

### 1. Canchas sin `sport_type`
Las canchas sin tipo de deporte asignado se mostrarán para todos los tipos. Esto permite flexibilidad para canchas multiuso.

### 2. Región sin Canchas
Si una región no tiene canchas registradas, se muestra mensaje amigable y se sugiere cambiar de región.

### 3. Performance
- Se usan JOINs eficientes
- Índices en `court_id`, `match_type`
- Carga lazy de canchas (solo al seleccionar región)

---

## 📦 Archivos Modificados

### Base de Datos
```
✅ sportmatch-admin/supabase/migrations/005_create_matches_tables.sql
   - Campo court_id reemplaza address, country_id, region_id, city_id
   - Índice en court_id
   - FK a courts(id)

✅ sportmatch-admin/supabase/seed_matches_example.sql
   - Actualizado para usar court_id
   - Busca canchas por sport_type
   - Muestra info completa con JOINs
```

### Aplicación
```
✅ sportmatch/app/(tabs)/match/create.tsx
   - Nuevo: loadUserRegion() - Pre-carga región del usuario
   - Nuevo: loadCourtsByRegion() - Carga canchas por región
   - Nuevo: Filtrado por tipo de deporte
   - Nuevo: Tarjeta de info de cancha
   - Nuevo: Estados de carga y vacío
   - Eliminado: Campos de dirección, país, región, ciudad manuales
```

### Documentación
```
✅ INSTRUCCIONES_MATCHES.md
   - Actualizada estructura de tablas
   - Nuevo flujo de usuario
   - Explicación de selección de canchas

✅ ACTUALIZACION_CANCHAS.md (este archivo)
   - Documentación completa de cambios
```

---

## 🚀 Migración de Datos Existentes

Si ya tenías partidos creados con el sistema anterior:

```sql
-- SCRIPT DE MIGRACIÓN (EJECUTAR CON PRECAUCIÓN)

-- 1. Backup de datos existentes
CREATE TABLE matches_backup AS SELECT * FROM matches;

-- 2. Eliminar columnas antiguas (después de asignar canchas manualmente)
ALTER TABLE matches DROP COLUMN IF EXISTS address;
ALTER TABLE matches DROP COLUMN IF EXISTS country_id;
ALTER TABLE matches DROP COLUMN IF EXISTS region_id;
ALTER TABLE matches DROP COLUMN IF EXISTS city_id;

-- 3. Agregar nueva columna
ALTER TABLE matches ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES courts(id);

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_matches_court_id ON matches(court_id);

-- Nota: Deberás asignar manualmente court_id a partidos existentes
-- UPDATE matches SET court_id = 'UUID-DE-CANCHA' WHERE id = 'UUID-PARTIDO';
```

---

## ✅ Testing

### 1. Crear Admin y Cancha
```
1. Registra un usuario admin en sportmatch-admin
2. Crea al menos una cancha en el admin panel
3. Asigna ubicación (región, ciudad) al admin
4. Asigna sport_type a la cancha
```

### 2. Crear Usuario Jugador
```
1. Registra un usuario en la app móvil
2. Completa su perfil incluyendo región
```

### 3. Crear Partido
```
1. Ve a Match → Crear Partido
2. Verifica que tu región esté pre-seleccionada
3. Selecciona tipo de deporte
4. Verifica que aparezcan canchas
5. Selecciona una cancha
6. Verifica que se muestre su información
7. Completa el formulario
8. Crea el partido
9. Verifica en Supabase que court_id esté asignado
```

---

## 🎉 Ventajas del Nuevo Sistema

✅ **Datos Estructurados**: Toda la info de ubicación en un solo lugar
✅ **Fácil Búsqueda**: Buscar partidos por cancha, región, tipo
✅ **Info Rica**: Los usuarios ven todos los detalles de la cancha
✅ **Escalable**: Fácil agregar nuevas características a canchas
✅ **Integridad**: FK garantiza consistencia de datos
✅ **UX Mejorada**: Selección visual con preview de cancha

---

## 📞 Próximos Pasos Sugeridos

1. **Vista de Lista**: Mostrar partidos con info de cancha
2. **Filtros Avanzados**: Por región, tipo de cancha, superficie
3. **Mapa**: Mostrar ubicación de la cancha en mapa
4. **Disponibilidad**: Verificar horarios disponibles de la cancha
5. **Reserva Automática**: Crear reserva al crear partido
6. **Fotos de Canchas**: Mostrar imágenes de las canchas

---

**Actualizado:** 6 de febrero de 2026  
**Versión:** 2.0.0 (Con Canchas)
