# 🎯 Refactorización del Sistema de Precios - SportMatch Admin

**Fecha:** 10-11 Febrero 2026  
**Autor:** Feature Carlos  
**Versión:** 2.0

---

## 📋 Resumen Ejecutivo

Se implementó un sistema de precios **diurno/nocturno** simplificado para las canchas deportivas, reemplazando el sistema anterior de precios por horario específico. Esta solución es más intuitiva, fácil de gestionar y se alinea mejor con las necesidades del negocio.

---

## 🎨 Concepto del Sistema

### Precio Diurno vs Nocturno

```
┌─────────────────────────────────────┐
│  Horario Diurno: 10:00 - 17:59     │
│  ✅ Precio: day_price               │
│  📅 Slots: 10:00-11:00, ..., 17:00-18:00  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Horario Nocturno: 18:00 - 09:59   │
│  🌙 Precio: night_price             │
│  📅 Slots: 18:00-19:00, ..., 09:00-10:00  │
└─────────────────────────────────────┘
```

### Lógica de Rangos Semi-Abiertos

Los horarios se interpretan como **[inicio, fin)** (semi-abiertos):

- `13:00 - 14:00` = desde 13:00:00 hasta 13:59:59
- `14:00 - 15:00` = desde 14:00:00 hasta 14:59:59
- ✅ **NO hay conflicto** entre slots consecutivos

**Ejemplos:**
```typescript
// ✅ Sin conflicto
Reserva 1: 13:00 - 14:00
Reserva 2: 14:00 - 15:00  // 14:00 es límite exacto

// ❌ Con conflicto  
Reserva 1: 13:00 - 14:00
Reserva 2: 13:30 - 14:30  // 13:30 está dentro del primer rango
```

---

## 🗂️ Archivos Modificados

### 1. Base de Datos

#### `/supabase/migrations/009_refactor_pricing_day_night.sql`
**Propósito:** Migración para añadir campos diurno/nocturno

```sql
-- Añade day_price y night_price a courts
ALTER TABLE courts ADD COLUMN day_price DECIMAL(10, 2);
ALTER TABLE courts ADD COLUMN night_price DECIMAL(10, 2);

-- Migra datos existentes
UPDATE courts 
SET day_price = COALESCE(price_per_hour, 0),
    night_price = COALESCE(price_per_hour, 0);

-- Elimina campos obsoletos
ALTER TABLE courts DROP COLUMN price_per_hour;
ALTER TABLE schedules DROP COLUMN price_per_hour;
ALTER TABLE schedules DROP COLUMN lighting_price;
```

#### `/supabase_unified_schema.sql` (raíz del proyecto)
**Propósito:** Schema unificado actualizado

Cambios en tabla `courts`:
```sql
CREATE TABLE IF NOT EXISTS courts (
  -- ... otros campos ...
  day_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  night_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- ... otros campos ...
);
```

Cambios en tabla `schedules`:
```sql
CREATE TABLE IF NOT EXISTS schedules (
  -- ... campos sin pricing ...
  -- Eliminados: lighting_price, price_per_hour
);
```

### 2. Backend (Lógica de Negocio)

#### `/lib/bookingUtils.ts`
**Propósito:** Lógica de cálculo de precios para reservas

**Cambios principales:**
```typescript
// Función para verificar solapamiento de slots
function slotsOverlap(a1: string, a2: string, b1: string, b2: string): boolean {
  // Rangos semi-abiertos [start, end)
  const a1Min = parseTimeToMinutes(a1);
  const a2Min = parseTimeToMinutes(a2);
  const b1Min = parseTimeToMinutes(b1);
  const b2Min = parseTimeToMinutes(b2);
  
  // Usamos < (no <=) para evitar conflictos en límites
  return a1Min < b2Min && b1Min < a2Min;
}

// Lógica de precio diurno/nocturno
const startMinutes = parseTimeToMinutes(data.start_time);
const dayStartMinutes = 10 * 60;  // 10:00
const nightStartMinutes = 18 * 60; // 18:00
const isNightTime = startMinutes >= nightStartMinutes || startMinutes < dayStartMinutes;

const pricePerHour = isNightTime 
  ? Number(court.night_price) 
  : Number(court.day_price);
```

**Funciones actualizadas:**
- `createBooking()` - Calcula precio según hora de inicio
- `updateBooking()` - Recalcula precio al cambiar horario
- `slotsOverlap()` - Documentada para rangos semi-abiertos

#### `/lib/scheduleUtils.ts`
**Propósito:** Utilidades para gestión de horarios

**Cambios principales:**
- Eliminados parámetros `lightingPrice` y `pricePerHour` de `createWeekSchedules()`
- Actualizada interfaz `Schedule` (sin campos de pricing)

### 3. Frontend (Componentes)

#### `/components/CourtForm.tsx`
**Propósito:** Formulario para crear/editar canchas

**Cambios:**
```tsx
// Antes: Un solo campo
<input name="price_per_hour" />

// Ahora: Dos campos
<input name="day_price" placeholder="25000" />
<p>Desde 10:00 hasta 17:59 hrs</p>

<input name="night_price" placeholder="30000" />
<p>Desde 18:00 hasta 09:59 hrs</p>
```

#### `/components/CourtCard.tsx`
**Propósito:** Tarjeta de visualización de cancha

**Cambios:**
```tsx
// Muestra ambos precios
<div>
  <span>Diurno: ${court.day_price?.toLocaleString('es-CL')}/h</span>
  <span>Nocturno: ${court.night_price?.toLocaleString('es-CL')}/h</span>
</div>
```

#### `/components/CourtScheduleCard.tsx`
**Propósito:** Card de cancha en gestión de horarios

**Cambios:**
- Interfaz actualizada (`day_price`, `night_price`)
- Muestra ambos precios: "Diurno: $XX • Nocturno: $YY"

#### `/components/BookingForm.tsx`
**Propósito:** Formulario de creación/edición de reservas

**Cambios principales:**
```typescript
// Cálculo de precio según hora del slot
const startMinutes = startTime ? parseTimeToMinutes(startTime) : 0;
const dayStartMinutes = 10 * 60;
const nightStartMinutes = 18 * 60;
const isNightTime = startMinutes >= nightStartMinutes || startMinutes < dayStartMinutes;

const pricePerHour = isNightTime 
  ? Number(selectedCourt?.night_price ?? 0) 
  : Number(selectedCourt?.day_price ?? 0);
```

**UI actualizada:**
```tsx
<div>
  <span>Tarifa: {isNightTime ? 'Nocturna' : 'Diurna'}</span>
  <span>({isNightTime ? '18:00 - 09:59' : '10:00 - 17:59'})</span>
  <span>Precio por hora: ${pricePerHour.toLocaleString('es-CL')}</span>
</div>
```

**Removido:**
- Estado `useLighting` y `setUseLighting`
- Campo `use_lighting` del form data
- Checkbox de "Usar iluminación"

#### `/components/ScheduleConfigModal.tsx`
**Propósito:** Modal para configurar horarios de cancha

**Cambios:**
- Eliminados campos de precio específico y iluminación
- Simplificado a solo: horario inicio, fin, intervalo, días bloqueados
- Removido parámetro `courtPrice` de la interfaz

#### `/app/dashboard/schedules/page.tsx`
**Propósito:** Página de gestión de horarios

**Cambios:**
```typescript
// Query actualizado
.select('id, name, sport_type, surface_type, day_price, night_price')
```

#### `/app/dashboard/schedules/SchedulesClient.tsx`
**Propósito:** Componente cliente de gestión de horarios

**Cambios:**
- Interfaz `Court` actualizada
- Removido prop `courtPrice` al pasar a `ScheduleConfigModal`

#### `/app/dashboard/bookings/page.tsx` y `/BookingsManager.tsx`
**Propósito:** Gestión de reservas

**Cambios:**
```typescript
// Query actualizado
.select('id, name, sport_type, day_price, night_price')

// Interfaces actualizadas
interface Court {
  day_price?: number;
  night_price?: number;
}
```

### 4. App Móvil (Compatibilidad)

#### `/sportmatch/services/schedule.service.ts`
**Propósito:** Servicio de horarios para app móvil

**Cambios:**
- Documentada función `slotsOverlap()` con lógica de rangos semi-abiertos
- Mantiene compatibilidad con sistema de reservas del admin

#### `/sportmatch/app/(tabs)/match/create.tsx`
**Propósito:** Pantalla de crear partido en app móvil

**Cambios:**
- Interfaz `Court` actualizada (`day_price`, `night_price`)
- Removido estado y UI de iluminación
- Simplificado cálculo de precio

---

## 🔄 Flujo de Datos

### Crear Reserva

```
1. Usuario selecciona slot (ej: 15:00 - 16:00)
   ↓
2. BookingForm calcula si es diurno/nocturno
   - startMinutes = 15 * 60 = 900
   - dayStart = 600, nightStart = 1080
   - 900 < 1080 → ES DIURNO ✅
   ↓
3. Obtiene precio de la cancha
   - pricePerHour = court.day_price
   ↓
4. Calcula total
   - duration = 1 hora
   - total = day_price * 1
   ↓
5. bookingUtils.createBooking()
   - Verifica disponibilidad (sin conflictos)
   - Inserta con total_price calculado
```

### Verificar Disponibilidad

```
1. Obtener reservas existentes para cancha/fecha
   ↓
2. Para cada reserva existente:
   - Verificar si se solapa con nuevo slot
   - slotsOverlap(nuevo.start, nuevo.end, exist.start, exist.end)
   ↓
3. Si NO hay solapamiento → DISPONIBLE ✅
   Si SÍ hay solapamiento → NO DISPONIBLE ❌
```

---

## 📊 Comparativa: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Campos en courts** | `price_per_hour` | `day_price`, `night_price` |
| **Campos en schedules** | `price_per_hour`, `lighting_price` | Ninguno (eliminados) |
| **Configuración** | Por horario específico | Por cancha (global) |
| **Lógica de precio** | Override en schedule | Automático según hora |
| **Complejidad** | Alta (configurar cada horario) | Baja (configurar una vez) |
| **UI Editar Cancha** | 1 campo de precio | 2 campos (diurno/nocturno) |
| **UI Reserva** | Checkbox iluminación | Tarifa automática |
| **Mantenimiento** | Complejo | Simple |

---

## ✅ Testing Realizado

### Casos de Prueba - Sistema de Precios

1. **Slot Diurno (10:00 - 11:00)**
   - ✅ Aplica `day_price`
   - ✅ Muestra "Tarifa: Diurna (10:00 - 17:59)"

2. **Slot Nocturno (20:00 - 21:00)**
   - ✅ Aplica `night_price`
   - ✅ Muestra "Tarifa: Nocturna (18:00 - 09:59)"

3. **Slot Límite (17:00 - 18:00)**
   - ✅ Aplica `day_price` (inicia antes de 18:00)

4. **Slot Límite (18:00 - 19:00)**
   - ✅ Aplica `night_price` (inicia a las 18:00)

### Casos de Prueba - Detección de Conflictos

1. **Slots Consecutivos**
   ```
   Reserva A: 13:00 - 14:00
   Reserva B: 14:00 - 15:00
   Resultado: ✅ SIN CONFLICTO
   ```

2. **Slots Solapados**
   ```
   Reserva A: 13:00 - 14:00
   Reserva B: 13:30 - 14:30
   Resultado: ❌ CON CONFLICTO
   ```

3. **Slots Idénticos**
   ```
   Reserva A: 14:00 - 15:00
   Reserva B: 14:00 - 15:00
   Resultado: ❌ CON CONFLICTO
   ```

---

## 🚀 Instrucciones de Despliegue

### 1. Ejecutar Migración de Base de Datos

```bash
cd sportmatch-admin
psql -h [host] -U [user] -d [database] -f supabase/migrations/009_refactor_pricing_day_night.sql
```

O desde Supabase Dashboard:
1. Ir a SQL Editor
2. Copiar contenido de `009_refactor_pricing_day_night.sql`
3. Ejecutar

### 2. Actualizar Schema Unificado (Opcional)

Si usas el schema unificado para recrear la BD desde cero:

```bash
psql -h [host] -U [user] -d [database] -f supabase_unified_schema.sql
```

### 3. Verificar Datos

```sql
-- Verificar que todas las canchas tienen precios
SELECT id, name, day_price, night_price 
FROM courts 
WHERE day_price IS NULL OR night_price IS NULL;

-- Debería devolver 0 filas
```

### 4. Desplegar Código

```bash
cd sportmatch-admin
npm install
npm run build
# Desplegar según tu infraestructura
```

---

## 📝 Notas Adicionales

### Horarios Edge Cases

- **Reservas que cruzan medianoche:** No soportado actualmente (requiere lógica adicional)
- **Reservas que cruzan el límite 18:00:** Se usa el precio basado en hora de **inicio**
- **Horarios antes de 10:00:** Se consideran nocturnos

### Futuras Mejoras Sugeridas

1. **Precios Escalonados por Duración**
   - Descuento para reservas de 2+ horas
   - Implementar: Añadir lógica en `bookingUtils.calculatePrice()`

2. **Precios Especiales por Día**
   - Fines de semana más caros
   - Implementar: Añadir campo `weekend_multiplier` a courts

3. **Precios Dinámicos**
   - Ajuste automático según demanda
   - Implementar: Sistema de ML para predicción

4. **Gestión de Impuestos**
   - IVA incluido/excluido
   - Implementar: Campo `tax_rate` y toggle en UI

---

## 🐛 Errores Comunes y Soluciones

### Error: "price_per_hour is undefined"

**Causa:** Código antiguo intentando acceder al campo eliminado

**Solución:**
```typescript
// ❌ Incorrecto
court.price_per_hour

// ✅ Correcto
court.day_price  // o court.night_price
```

### Error: "setUseLighting is not defined"

**Causa:** Referencias al estado eliminado de iluminación

**Solución:** Eliminar todas las referencias a `useLighting`

### Conflictos de Reserva en Límites

**Causa:** Uso de `<=` en lugar de `<` en `slotsOverlap()`

**Solución:** Verificar que se usa `<` para comparaciones

---

## 📞 Contacto

Para dudas o problemas con esta implementación:
- **Feature Branch:** `feature_carlos`
- **Documentación relacionada:** Ver `/docs/` en el proyecto

---

**Última actualización:** 11 Febrero 2026
