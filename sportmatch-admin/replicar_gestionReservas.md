# Guía para Replicar la Gestión de Reservas en SportMatch

Este documento explica cómo implementar el sistema de gestión de reservas en el panel admin de SportMatch, basado en CanchApp. **Solo los admin_users gestionan reservas** (crear, editar, confirmar, cancelar).

---

## 1. RESUMEN DEL SISTEMA

La gestión de reservas permite al admin:
- **Listar** todas las reservas de sus canchas
- **Crear** reservas (en nombre de un jugador/player)
- **Editar** reservas existentes
- **Cambiar estado**: pendiente → confirmada → cancelada
- **Eliminar** reservas
- **Ver disponibilidad** antes de crear/editar (slots libres vs ocupados)

**Flujo:**
```
Admin → Lista reservas (filtradas por sus canchas)
      → Crear/Editar: selecciona cancha, jugador, fecha, slot disponible
      → Verifica conflictos con reservas existentes
      → Calcula total_price desde court.price_per_hour
```

---

## 2. TABLAS Y ESQUEMA ACTUAL (SPORTMATCH)

### 2.1 Tablas que YA tienes

**`courts`**
- `admin_id` → dueño (auth.users)
- `price_per_hour`, `has_lighting`, `is_active`, etc.

**`bookings`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| court_id | uuid | FK courts |
| player_id | uuid | FK profiles (quien reserva) |
| booking_date | date | Fecha |
| start_time | time | Inicio |
| end_time | time | Fin |
| status | text | pending, confirmed, cancelled, completed |
| total_price | decimal | Monto total |
| currency | text | CLP |
| payment_status | text | pending, paid, refunded |
| notes | text | Notas opcionales |

**`profiles`**
- Jugadores de la app móvil (first_name, last_name, email, telefono, etc.)

### 2.2 Políticas RLS actuales en bookings

Tu esquema actual:
- **SELECT**: player_id = auth.uid() OR admin de la cancha ✓
- **INSERT**: solo player_id = auth.uid() ❌ (el admin no puede crear reservas)
- **UPDATE**: player_id = auth.uid() OR admin de la cancha ✓
- **DELETE**: No hay política explícita → normalmente falla para todos ❌

Para que el admin gestione todo, necesitas añadir/ajustar políticas.

---

## 3. MIGRACIÓN SQL NECESARIA

Ejecuta en el SQL Editor de Supabase:

```sql
-- ============================================
-- GESTIÓN DE RESERVAS - ADMIN PUEDE CREAR Y ELIMINAR
-- ============================================

-- Permitir que el admin cree reservas en nombre de jugadores
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias reservas" ON bookings;
CREATE POLICY "Jugadores pueden insertar sus propias reservas"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Admin pueden insertar reservas en sus canchas"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- Permitir que el admin elimine reservas de sus canchas
DROP POLICY IF EXISTS "Admin pueden eliminar reservas de sus canchas" ON bookings;
CREATE POLICY "Admin pueden eliminar reservas de sus canchas"
  ON bookings FOR DELETE TO authenticated
  USING (
    court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

-- El jugador también puede eliminar su propia reserva (opcional, si lo deseas)
CREATE POLICY "Jugadores pueden eliminar sus propias reservas"
  ON bookings FOR DELETE TO authenticated
  USING (auth.uid() = player_id);
```

**Nota:** Si Supabase no permite dos políticas INSERT separadas para la misma tabla con diferentes WITH CHECK, usa una sola política que combine ambas condiciones:

```sql
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias reservas" ON bookings;
DROP POLICY IF EXISTS "Jugadores pueden insertar sus propias reservas" ON bookings;
DROP POLICY IF EXISTS "Admin pueden insertar reservas en sus canchas" ON bookings;

CREATE POLICY "Insertar reservas: jugador o admin"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );

CREATE POLICY "Eliminar reservas: jugador o admin de la cancha"
  ON bookings FOR DELETE TO authenticated
  USING (
    auth.uid() = player_id
    OR court_id IN (SELECT id FROM courts WHERE admin_id = auth.uid())
  );
```

---

## 4. CÁLCULO DE PRECIO

En SportMatch:
- `courts.price_per_hour` → precio base
- Duración = `end_time - start_time` (en horas)

```javascript
// Ejemplo: slot 1 hora
const durationHours = 1; // o calcular desde start_time/end_time
const totalPrice = court.price_per_hour * durationHours;
```

Si en el futuro añades `lighting_cost` en courts (como CanchApp), suma:
```javascript
totalPrice = court.price_per_hour * durationHours + (usesLighting ? court.lighting_cost : 0);
```

---

## 5. VERIFICACIÓN DE DISPONIBILIDAD

### 5.1 Fórmula de solapamiento

Dos rangos [A1, A2] y [B1, B2] se solapan si:
```
A1 < B2  AND  B1 < A2
```

### 5.2 Código

```typescript
async function checkAvailability(
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
) {
  let query = supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled');

  if (excludeBookingId) query = query.neq('id', excludeBookingId);
  const { data: existingBookings } = await query;

  const conflicting = (existingBookings || []).filter(b => {
    const a1 = startTime.substring(0, 5);
    const a2 = endTime.substring(0, 5);
    const b1 = b.start_time.substring(0, 5);
    const b2 = b.end_time.substring(0, 5);
    return a1 < b2 && b1 < a2;
  });

  return { isAvailable: conflicting.length === 0, conflictingBookings: conflicting };
}
```

Excluir `status = 'cancelled'` y `excludeBookingId` al editar.

---

## 6. HOOK useBookings (ADAPTADO PARA SPORTMATCH)

En CanchApp se filtra por `courts.profile_id`. En SportMatch debes filtrar por `courts.admin_id`:

```typescript
// useBookings.ts - fetchBookings
const fetchBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      courts!inner (name, sport_type, admin_id),
      profiles (id, first_name, last_name, email, telefono)
    `)
    .eq('courts.admin_id', auth.uid())  // Solo canchas del admin
    .order('booking_date', { ascending: false });

  if (error) throw error;
  setBookings(data || []);
};
```

**Alternativa** si el join con `courts.admin_id` no filtra bien en Supabase:

```typescript
// Obtener IDs de canchas del admin primero
const { data: myCourts } = await supabase
  .from('courts')
  .select('id')
  .eq('admin_id', auth.uid());

const courtIds = (myCourts || []).map(c => c.id);
if (courtIds.length === 0) {
  setBookings([]);
  return;
}

const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    courts (name, sport_type),
    profiles (first_name, last_name, email, telefono)
  `)
  .in('court_id', courtIds)
  .order('booking_date', { ascending: false });
```

Funciones del hook:
- `fetchBookings()`
- `createBooking(data)`
- `updateBooking(id, data)`
- `deleteBooking(id)`
- `updateBookingStatus(id, 'pending'|'confirmed'|'cancelled')`
- `checkAvailability(courtId, date, start, end, excludeId?)`
- `checkMultipleAvailability(courtId, date, slots, excludeId?)`

---

## 7. FLUJO createBooking

```typescript
const createBooking = async (bookingData) => {
  // 1. Verificar disponibilidad
  const availability = await checkAvailability(
    bookingData.court_id,
    bookingData.booking_date,
    bookingData.start_time,
    bookingData.end_time
  );
  if (!availability.isAvailable) {
    return { error: 'Ya existe una reserva en este horario' };
  }

  // 2. Obtener precio de la cancha
  const { data: court } = await supabase
    .from('courts')
    .select('price_per_hour')
    .eq('id', bookingData.court_id)
    .single();

  const durationHours = 1; // o calcular desde start/end
  const totalPrice = Number(court.price_per_hour) * durationHours;

  // 3. Insertar
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...bookingData,
      total_price: totalPrice,
      status: 'pending',
      payment_status: 'pending',
    })
    .select('*, courts(name, sport_type), profiles(first_name, last_name)')
    .single();

  return { data, error };
};
```

---

## 8. FORMULARIO DE RESERVA (BookingForm)

### 8.1 Campos necesarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| court_id | select | Canchas del admin |
| player_id | select/search | Jugador (profiles) – búsqueda por nombre/email |
| booking_date | date | Fecha |
| start_time / end_time | select | Slot (desde getAvailableTimeSlots + checkMultipleAvailability) |
| notes | text | Opcional |

### 8.2 Integración con horarios (schedules)

Si ya implementaste la gestión de horarios:
1. `getAvailableTimeSlots(courtId, date)` → slots teóricos
2. `checkMultipleAvailability(courtId, date, slots)` → slots realmente libres
3. Mostrar solo los libres en el select de hora

### 8.3 Selector de jugador

Opciones:
- **Dropdown** con lista de profiles (limitado si hay muchos)
- **Búsqueda/autocomplete** por first_name, last_name, email
- **Input manual** si añades soporte para "cliente sin cuenta" (requiere schema: player_id nullable + customer_name, customer_phone)

Para MVP, un select que cargue profiles (puedes filtrar por ciudad/región si lo tienes).

---

## 9. UI: BookingsManager

### 9.1 Estructura

- **Header**: "Gestión de Reservas" + botón "Nueva Reserva"
- **Resumen**: total, pendientes, confirmadas, canceladas
- **Filtros**: estado (pending/confirmed/cancelled), fecha, hora
- **Tabla**: cliente (nombre del player), cancha, fecha, hora, precio, estado, acciones

### 9.2 Acciones por fila

- Confirmar (pending → confirmed)
- Cancelar (→ cancelled)
- Marcar pendiente (→ pending)
- Editar (abre BookingForm con datos cargados)

### 9.3 Datos del cliente

En SportMatch el cliente viene de `profiles` vía `player_id`:
```
booking.profiles?.first_name, booking.profiles?.last_name
booking.profiles?.email, booking.profiles?.telefono
```

---

## 10. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar migración SQL: políticas INSERT y DELETE para admin
- [ ] Crear o adaptar `useBookings` (filtrar por courts.admin_id)
- [ ] Implementar `checkAvailability` y `checkMultipleAvailability`
- [ ] Crear `BookingForm`: cancha, jugador, fecha, slot, notas
- [ ] Integrar con `getAvailableTimeSlots` si tienes schedules
- [ ] Crear `BookingsManager`: lista, filtros, resumen, acciones
- [ ] Proteger ruta: solo accesible para admin (verificar auth + admin_users)
- [ ] Hook `useCourts` para listar canchas del admin (admin_id = auth.uid())

---

## 11. DIFERENCIAS CANCHAPP vs SPORTMATCH

| Aspecto | CanchApp | SportMatch |
|---------|----------|------------|
| Cliente | first_name, last_name, run, customer_phone (manual) | player_id → profiles |
| Dueño cancha | courts.profile_id | courts.admin_id |
| Precio | hourly_rate + lighting_cost → total_amount | price_per_hour → total_price |
| Pago | No | payment_status (pending, paid, refunded) |
| Estados | pending, confirmed, cancelled | + completed |

---

## 12. MIGRACIÓN SQL COMPLETA (COPIAR Y PEGAR)

```sql
-- ============================================
-- GESTIÓN DE RESERVAS - SPORTMATCH
-- Permite a admin crear y eliminar reservas
-- ============================================

-- Eliminar políticas antiguas de INSERT si existen
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
```

---

## 13. TIPOS TYPESCRIPT (opcional)

```typescript
export type Booking = {
  id: string;
  court_id: string;
  player_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string | null;
  created_at: string;
  updated_at: string;
  courts?: { name: string; sport_type: string } | null;
  profiles?: { first_name: string; last_name: string; email?: string; telefono?: string } | null;
};
```

---

*Documento generado a partir de la implementación de CanchApp. Adaptado para SportMatch con restricción admin_users y modelo player_id.*
