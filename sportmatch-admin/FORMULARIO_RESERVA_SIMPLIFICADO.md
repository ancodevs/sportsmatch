# 🎯 Sistema de Reservas Manuales (Clientes Externos)

## 📋 Resumen

Se ha implementado un sistema que permite crear reservas para **clientes externos** que NO son usuarios de la app móvil `@sportmatch/`. Estas son reservas manuales ingresadas por el administrador desde el panel web para personas que reservan por teléfono, en persona, o por otros medios.

## 🔄 Cambios Implementados

### 1. **Migración de Base de Datos**

#### Archivo: `016_support_manual_bookings.sql`

La tabla `bookings` ahora soporta dos tipos de reservas:

**Cambios en la estructura:**
- `player_id` ahora es **nullable** (puede ser NULL para reservas manuales)
- Nuevas columnas para datos del cliente externo:
  - `customer_run`: RUN del cliente
  - `customer_first_name`: Nombre del cliente
  - `customer_last_name`: Apellido del cliente  
  - `customer_phone`: Teléfono del cliente
- Nueva columna `booking_type`: `'app'` o `'manual'`

**Constraint de validación:**
```sql
-- Las reservas tipo 'app' DEBEN tener player_id
-- Las reservas tipo 'manual' DEBEN tener customer_* completos
CHECK (
  (booking_type = 'app' AND player_id IS NOT NULL)
  OR
  (booking_type = 'manual' AND customer_run IS NOT NULL 
   AND customer_first_name IS NOT NULL 
   AND customer_last_name IS NOT NULL 
   AND customer_phone IS NOT NULL)
)
```

### 2. **Interfaces y Tipos Actualizados**

#### `lib/bookingUtils.ts`

```typescript
export interface Booking {
  // ... campos existentes ...
  player_id: string | null; // Ahora nullable
  booking_type: 'app' | 'manual';
  // Datos del cliente externo (solo para reservas manuales)
  customer_run?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
}

export interface BookingFormData {
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  // Para reservas desde la app
  player_id?: string | null;
  // Para reservas manuales
  booking_type?: 'app' | 'manual';
  customer_run?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
}
```

#### Función `createBooking` actualizada:

Ahora detecta el tipo de reserva y construye el payload apropiado:

```typescript
const bookingPayload: any = {
  // ... campos comunes ...
  booking_type: data.booking_type || 'manual',
};

if (data.booking_type === 'manual') {
  bookingPayload.player_id = null;
  bookingPayload.customer_run = data.customer_run;
  bookingPayload.customer_first_name = data.customer_first_name;
  bookingPayload.customer_last_name = data.customer_last_name;
  bookingPayload.customer_phone = data.customer_phone;
} else {
  bookingPayload.player_id = data.player_id;
}
```

### 3. **Formulario BookingForm.tsx Simplificado**

#### Campo "Jugador" Oculto
El selector de jugador está comentado. Los datos se ingresan manualmente:
- **RUN** (obligatorio)
- **Nombre** (obligatorio)
- **Apellido** (obligatorio)
- **Teléfono** (8 dígitos, obligatorio)

#### Lógica de Creación Simplificada

```typescript
const data: BookingFormData = {
  court_id: courtId,
  booking_date: bookingDate,
  start_time: startTime,
  end_time: endTime,
  status,
  // Reserva manual con datos del cliente externo
  booking_type: 'manual',
  customer_run: run.trim(),
  customer_first_name: firstName.trim(),
  customer_last_name: lastName.trim(),
  customer_phone: `${PHONE_PREFIX}${phoneDigits}`,
};
```

**NO** se crea ningún perfil en la tabla `profiles`. Los datos del cliente se almacenan directamente en `bookings`.

#### Modo Edición Actualizado

Detecta el tipo de reserva al cargar:
- Si es `manual` → carga desde `customer_*`
- Si es `app` → carga desde `profiles`

### 4. **Tabla BookingsTable.tsx Actualizada**

La columna "Cliente" ahora muestra datos según el tipo:

```typescript
{booking.booking_type === 'manual' ? (
  // Mostrar customer_*
  <>
    <div>{booking.customer_first_name} {booking.customer_last_name}</div>
    <span className="badge">Cliente externo</span>
    <div>{booking.customer_phone}</div>
  </>
) : (
  // Mostrar profiles
  <>
    <div>{booking.profiles?.first_name} {booking.profiles?.last_name}</div>
    <div>{booking.profiles?.email}</div>
  </>
)}
```

## 📊 Flujo de Trabajo

### Crear Nueva Reserva Manual

1. Admin abre "Nueva Reserva"
2. Selecciona **Cancha**, **Fecha**, **Horario**
3. Ingresa datos del cliente:
   - RUN: `19283325-6`
   - Nombre: `Juan`
   - Apellido: `Pérez`
   - Teléfono: `87654321`
4. Al guardar:
   - Se crea la reserva con `booking_type = 'manual'`
   - `player_id` queda en NULL
   - Datos se guardan en `customer_*`
   - **NO** se crea perfil en `profiles`

### Reservas desde la App Móvil

Las reservas creadas desde `@sportmatch/` (app móvil) siguen funcionando igual:
- `booking_type = 'app'`
- `player_id` apunta a un usuario en `profiles`
- `customer_*` quedan en NULL

## 🎨 Interfaz de Usuario

### Formulario de Reserva
- ✅ Cancha *
- ⬜ ~~Jugador *~~ (oculto)
- ✅ RUN *
- ✅ Nombre * y Apellido *
- ✅ Teléfono *
- ✅ Fecha y Horario *
- ✅ Estado
- ✅ Notas (opcional)

### Tabla de Reservas
- Columna "Cliente" muestra:
  - **Reservas manuales**: Nombre + badge "Cliente externo" + teléfono
  - **Reservas desde app**: Nombre + email + teléfono

## 🚨 Migración Requerida

**Debes ejecutar la migración en Supabase:**

```bash
# Desde el SQL Editor de Supabase
# Ejecuta el contenido de:
sportmatch-admin/supabase/migrations/016_support_manual_bookings.sql
```

O con Supabase CLI:
```bash
supabase db push
```

## ✅ Ventajas de Esta Solución

1. **Separación clara**: Usuarios de la app vs. clientes externos
2. **No contamina `profiles`**: La tabla de usuarios solo contiene usuarios reales de la app
3. **Datos autónomos**: La reserva manual tiene todos sus datos propios
4. **Flexible**: Permite ambos tipos de reservas en el mismo sistema
5. **Auditoría**: El campo `booking_type` permite distinguir el origen de cada reserva

## 🔮 Consideraciones

### Validación de RUN
Actualmente no se valida el formato del RUN chileno. Considera agregar validación si es necesario.

### Migración de Datos Existentes
Las reservas existentes se marcarán automáticamente como tipo `'app'` si tienen `player_id`:

```sql
UPDATE bookings SET booking_type = 'app' WHERE player_id IS NOT NULL;
```

### Reportes y Estadísticas
Al generar reportes, puedes filtrar por `booking_type` para analizar:
- Reservas desde la app móvil
- Reservas manuales del recinto

## 📁 Archivos Modificados

```
sportmatch-admin/
├── supabase/
│   └── migrations/
│       └── 016_support_manual_bookings.sql        # Nueva migración
├── lib/
│   └── bookingUtils.ts                            # Interfaces actualizadas
├── components/
│   ├── BookingForm.tsx                            # Formulario simplificado
│   └── BookingsTable.tsx                          # Tabla actualizada
└── FORMULARIO_RESERVA_SIMPLIFICADO.md            # Esta documentación
```

---

**Fecha de actualización**: Febrero 2026  
**Versión**: 2.0 (Solución correcta con clientes externos)
