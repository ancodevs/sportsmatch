# Guía para Replicar la Gestión de Horarios en SportMatch

Este documento explica cómo añadir el sistema de gestión de horarios dinámicos al proyecto SportMatch, basado en la implementación de CanchApp. **Solo los admin_users pueden gestionar horarios.**

---

## 1. RESUMEN DEL SISTEMA

La gestión de horarios permite:
- Definir por cada cancha qué días y franjas horarias están disponibles para reservas
- Generar dinámicamente los slots disponibles (ej: 08:00-09:00, 09:00-10:00...) según la configuración
- Marcar como ocupados los slots que ya tienen reservas

**Flujo:**
```
Configuración (admin) → schedules (BD)
                              ↓
Formulario de reserva → getAvailableTimeSlots(courtId, date)
                              ↓
                       Horarios configurados - Reservas existentes = Slots disponibles
```

---

## 2. TABLAS NECESARIAS

### 2.1 Tabla que YA tienes (compatible)

| Tabla      | Estado  | Relación con horarios                    |
|------------|---------|------------------------------------------|
| `courts`   | ✅ Existe | Cada cancha tendrá 7 filas en schedules  |
| `bookings` | ✅ Existe | Las reservas ocupan slots (start_time, end_time, booking_date) |

### 2.2 Nueva tabla: `schedules`

Añade esta migración SQL a tu base de datos:

```sql
-- ============================================
-- GESTIÓN DE HORARIOS - SOLO ADMIN_USERS
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER DEFAULT 60,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_schedules_court_id ON schedules(court_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_court_day ON schedules(court_id, day_of_week);

-- RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Solo admin_users pueden gestionar horarios de sus propias canchas
DROP POLICY IF EXISTS "Admin pueden gestionar horarios de sus canchas" ON schedules;
CREATE POLICY "Admin pueden gestionar horarios de sus canchas"
  ON schedules FOR ALL TO authenticated
  USING (
    court_id IN (
      SELECT id FROM courts WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    court_id IN (
      SELECT id FROM courts WHERE admin_id = auth.uid()
    )
  );

-- Lectura pública para mostrar slots disponibles al reservar (players y admin)
DROP POLICY IF EXISTS "Todos pueden leer horarios" ON schedules;
CREATE POLICY "Todos pueden leer horarios"
  ON schedules FOR SELECT USING (true);
```

**Campos:**
- `court_id`: cancha a la que aplica
- `day_of_week`: 0=Domingo, 1=Lunes, ..., 6=Sábado
- `start_time`, `end_time`: ventana horaria (ej: 08:00 - 22:00)
- `interval_minutes`: duración de cada slot (60 = bloques de 1 hora)
- `is_blocked`: si es true, ese día no hay slots disponibles

---

## 3. ESTRUCTURA DE DATOS

### 3.1 Regla: 7 filas por cancha

Cada cancha debe tener 7 filas en `schedules` (una por día). Para bloquear un día se usa `is_blocked = true`.

Ejemplo para cancha "Cancha 1":
| court_id | day_of_week | start_time | end_time | interval_minutes | is_blocked |
|----------|-------------|------------|----------|------------------|------------|
| xxx      | 0           | 08:00      | 22:00    | 60               | true       |
| xxx      | 1           | 08:00      | 22:00    | 60               | false      |
| ...      | ...         | ...        | ...      | ...              | ...        |

### 3.2 Fórmula de solapamiento (conflictos)

Dos rangos [A1, A2] y [B1, B2] se solapan si:

```
A1 < B2  AND  B1 < A2
```

En código:
```javascript
const overlap = slotStart < bookingEnd && bookingStart < slotEnd;
```

---

## 4. CÓDIGO FRONTEND A REPLICAR

### 4.1 Utilidades (`src/lib/scheduleUtils.ts`)

```typescript
import { supabase } from './supabase';  // o tu cliente Supabase

export interface TimeSlot {
  start: string;   // "08:00"
  end: string;     // "09:00"
  label: string;   // "08:00 - 09:00"
}

export async function getAvailableTimeSlots(
  courtId: string,
  date: string
): Promise<TimeSlot[]> {
  if (!courtId || !date) return [];

  const dayOfWeek = new Date(date).getDay();

  const { data: schedule, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('court_id', courtId)
    .eq('day_of_week', dayOfWeek)
    .single();

  if (error || !schedule || schedule.is_blocked) return [];

  const slots: TimeSlot[] = [];
  const [startHour, startMin] = String(schedule.start_time).substring(0, 5).split(':').map(Number);
  const [endHour, endMin] = String(schedule.end_time).substring(0, 5).split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const interval = schedule.interval_minutes || 60;

  let current = startMinutes;
  while (current < endMinutes) {
    const next = current + interval;
    if (next <= endMinutes) {
      const startStr = formatMinutesToTime(current);
      const endStr = formatMinutesToTime(next);
      slots.push({ start: startStr, end: endStr, label: `${startStr} - ${endStr}` });
    }
    current = next;
  }

  return slots;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function getCourtSchedules(courtId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('court_id', courtId)
    .order('day_of_week');
  if (error) throw error;
  return data || [];
}

export function getShortDayName(dayOfWeek: number): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[dayOfWeek] || 'N/A';
}
```

### 4.2 Hook `useSchedules` (`src/hooks/useSchedules.ts`)

Responsabilidades:
- Cargar horarios de una cancha
- Crear horarios para toda la semana (`createWeekSchedules`)
- Actualizar / eliminar horarios individuales

```typescript
// Resumen de funciones principales:
// - fetchSchedules(): cargar schedules por court_id
// - createWeekSchedules(startTime, endTime, intervalMinutes, blockedDays): 
//   Borra horarios existentes y crea 7 filas (días 0-6)
// - updateSchedule(id, data): actualizar un horario
// - deleteSchedule(id): eliminar un horario
```

Estructura de `createWeekSchedules`:
```javascript
// 1. DELETE FROM schedules WHERE court_id = ?
// 2. INSERT 7 filas (day_of_week 0..6), is_blocked = blockedDays.includes(day)
```

### 4.3 Verificación de disponibilidad vs reservas

En tu hook de reservas (ej. `useBookings` o similar), necesitas una función que reciba los slots generados y filtre los ocupados:

```typescript
async function checkMultipleAvailability(
  courtId: string,
  date: string,
  timeSlots: { start: string; end: string }[],
  excludeBookingId?: string
) {
  let query = supabase
    .from('bookings')
    .select('start_time, end_time, id')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  if (excludeBookingId) query = query.neq('id', excludeBookingId);
  const { data: existingBookings } = await query;

  const availableSlots: string[] = [];
  for (const slot of timeSlots) {
    const hasConflict = (existingBookings || []).some(b => {
      const slotStart = slot.start.substring(0, 5);
      const slotEnd = slot.end.substring(0, 5);
      const bStart = b.start_time.substring(0, 5);
      const bEnd = b.end_time.substring(0, 5);
      return slotStart < bEnd && bStart < slotEnd;
    });
    if (!hasConflict) availableSlots.push(slot.start);
  }

  return { availableSlots, existingBookings };
}
```

### 4.4 Flujo en el formulario de reserva

1. Usuario elige cancha y fecha.
2. Llamar `getAvailableTimeSlots(courtId, date)` → slots teóricos según `schedules`.
3. Llamar `checkMultipleAvailability(courtId, date, slots)` → slots realmente libres.
4. Mostrar solo los slots de `availableSlots` como seleccionables.

---

## 5. UI PARA ADMIN (GESTIÓN DE HORARIOS)

La UI debe estar en el panel de admin, accesible solo para `admin_users`.

### 5.1 Pantalla principal

- Lista de canchas del admin (filtrar por `courts.admin_id = auth.uid()`).
- Al seleccionar una cancha → abrir formulario de horarios.

### 5.2 Formulario de horarios

**Opción rápida:**
- `start_time`, `end_time`, `interval_minutes`
- Checkboxes para días bloqueados
- Un botón "Aplicar a toda la semana"

**Opción avanzada (opcional):**
- Configurar cada día por separado.

Al guardar se llama `createWeekSchedules(startTime, endTime, intervalMinutes, blockedDays)`.

---

## 6. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar migración SQL: crear tabla `schedules` + políticas RLS
- [ ] Crear `scheduleUtils.ts` con `getAvailableTimeSlots`, `getCourtSchedules`
- [ ] Crear hook `useSchedules` con `createWeekSchedules`, `updateSchedule`, etc.
- [ ] Añadir `checkMultipleAvailability` al hook de reservas
- [ ] Modificar formulario de reserva: obtener slots con `getAvailableTimeSlots` y filtrar con `checkMultipleAvailability`
- [ ] Crear pantalla de gestión de horarios en el panel admin (solo para admin_users)
- [ ] Proteger ruta de gestión de horarios: verificar que el usuario sea admin

---

## 7. DIFERENCIAS CANCHAPP vs SPORTMATCH

| Aspecto        | CanchApp                | SportMatch                    |
|----------------|-------------------------|-------------------------------|
| Dueño de cancha| `profile_id` → profiles | `admin_id` → auth.users       |
| Quien gestiona | Usuario del perfil      | admin_users (user_id = auth)  |
| Política RLS   | profile en courts       | courts.admin_id = auth.uid()  |

Tu política RLS para schedules debe usar:

```sql
court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
```

---

## 8. MIGRACIÓN SQL COMPLETA (COPIAR Y PEGAR)

Ejecuta esto en el SQL Editor de Supabase:

```sql
-- ============================================
-- GESTIÓN DE HORARIOS - SPORTMATCH
-- Solo admin_users pueden gestionar
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER DEFAULT 60,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_court_id ON schedules(court_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_court_day ON schedules(court_id, day_of_week);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pueden gestionar horarios de sus canchas" ON schedules;
CREATE POLICY "Admin pueden gestionar horarios de sus canchas"
  ON schedules FOR ALL TO authenticated
  USING (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "Todos pueden leer horarios" ON schedules;
CREATE POLICY "Todos pueden leer horarios"
  ON schedules FOR SELECT USING (true);
```

---

## 9. TIPOS TYPESCRIPT (opcional)

```typescript
// Para Supabase types
export type Schedule = {
  id: string;
  court_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  is_blocked: boolean;
  created_at: string;
};
```

---

*Documento generado a partir de la implementación de CanchApp feature-carlos. Adaptado para SportMatch con restricción admin_users.*
