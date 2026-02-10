# 🏗️ Arquitectura del Sistema SportMatch

## Visión General

SportMatch es un ecosistema completo para la gestión de canchas deportivas que consta de dos aplicaciones principales:

1. **App Móvil** (React Native + Expo) - Para jugadores
2. **Panel Web Admin** (Next.js) - Para administradores de canchas

Ambas aplicaciones se conectan a la misma base de datos de Supabase, permitiendo sincronización en tiempo real.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
├──────────────────────────┬──────────────────────────────────┤
│   App Móvil (Jugadores)  │   Panel Web (Administradores)    │
│   - React Native/Expo    │   - Next.js 15                   │
│   - iOS / Android        │   - Server Components            │
│   - Autenticación        │   - Tailwind CSS                 │
│   - Reservas             │   - TypeScript                   │
│   - Perfil               │                                  │
└──────────────────────────┴──────────────────────────────────┘
                           │
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (Backend as a Service)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Auth      │  │   Database   │  │   Realtime   │       │
│  │             │  │  (PostgreSQL)│  │  (WebSocket) │       │
│  │ - JWT       │  │  - RLS       │  │  - Pub/Sub   │       │
│  │ - OAuth     │  │  - Triggers  │  │  - Changes   │       │
│  │ - Sessions  │  │  - Functions │  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │   Storage   │  │   Functions  │                          │
│  │  (Avatars)  │  │  (Edge)      │                          │
│  └─────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Datos: Reserva en Tiempo Real

```
┌──────────────────────────────────────────────────────────────┐
│                    1. JUGADOR CREA RESERVA                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ INSERT en tabla bookings
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               2. SUPABASE POSTGRES (Database)                 │
│   - Valida RLS (jugador puede insertar su reserva)           │
│   - Inserta registro en tabla 'bookings'                     │
│   - Ejecuta trigger de updated_at                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Postgres NOTIFY
                              ▼
┌──────────────────────────────────────────────────────────────┐
│             3. SUPABASE REALTIME (Broadcasting)               │
│   - Detecta INSERT en tabla 'bookings'                       │
│   - Emite evento a todos los clientes suscritos              │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket Event
                              ▼
┌──────────────────────────────────────────────────────────────┐
│        4. PANEL WEB ADMIN (Cliente suscrito)                  │
│   - Recibe evento en RealtimeBookings component              │
│   - Verifica que la cancha pertenece al admin                │
│   - Muestra notificación toast                               │
│   - Actualiza lista de reservas (router.refresh())           │
│   - Reproduce sonido de notificación (opcional)              │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ < 1 segundo ⚡
                              ▼
           ✅ ADMINISTRADOR VE LA RESERVA INSTANTÁNEAMENTE
```

## Base de Datos

### Esquema de Tablas

#### Tablas Compartidas (Existentes)
```
profiles (Jugadores y Usuarios)
├── id (UUID, PK)
├── email
├── first_name
├── last_name
├── avatar_url
└── ... (más campos)

cities (Ubicaciones)
├── id (SERIAL, PK)
├── name
├── region_id (FK)
└── created_at

regions (Regiones)
├── id (SERIAL, PK)
├── name
├── country_id (FK)
└── created_at
```

#### Nuevas Tablas (Admin Panel)
```
admin_users (Administradores)
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── business_name
├── phone
├── is_verified
└── timestamps

courts (Canchas Deportivas)
├── id (UUID, PK)
├── name
├── description
├── address
├── city_id (FK → cities)
├── latitude, longitude
├── surface_type
├── has_lighting
├── has_parking
├── has_changing_rooms
├── price_per_hour
├── capacity
├── admin_id (FK → admin_users.user_id)
├── is_active
└── timestamps

bookings (Reservas)
├── id (UUID, PK)
├── court_id (FK → courts)
├── player_id (FK → profiles)
├── booking_date
├── start_time
├── end_time
├── status (pending|confirmed|cancelled|completed)
├── total_price
├── payment_status (pending|paid|refunded)
├── notes
└── timestamps
```

### Row Level Security (RLS)

#### admin_users
```sql
SELECT: auth.uid() = user_id
UPDATE: auth.uid() = user_id
```

#### courts
```sql
SELECT: is_active = true OR auth.uid() = admin_id
INSERT: auth.uid() = admin_id
UPDATE: auth.uid() = admin_id
DELETE: auth.uid() = admin_id
```

#### bookings
```sql
SELECT: auth.uid() = player_id OR auth.uid() IN (
  SELECT admin_id FROM courts WHERE id = bookings.court_id
)
INSERT: auth.uid() = player_id
UPDATE: auth.uid() = player_id OR auth.uid() IN (
  SELECT admin_id FROM courts WHERE id = bookings.court_id
)
```

## Autenticación y Autorización

### Flujo de Autenticación

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Usuario   │   1     │   Supabase   │   2     │   Next.js   │
│  (Browser)  │────────>│     Auth     │────────>│ Middleware  │
└─────────────┘  Login  └──────────────┘  JWT    └─────────────┘
                                                        │
                                                        │ 3. Verifica
                                                        │ admin_users
                                                        ▼
                                                  ┌─────────────┐
                                                  │  Dashboard  │
                                                  │  (Acceso)   │
                                                  └─────────────┘
```

### Verificación de Permisos

1. **Middleware** (`middleware.ts`):
   - Verifica sesión JWT de Supabase
   - Redirige a `/login` si no hay sesión

2. **Layout de Dashboard** (`app/dashboard/layout.tsx`):
   - Verifica que el usuario existe en `admin_users`
   - Verifica `is_verified = true`
   - Redirige a `/login` si no es admin

3. **Componentes y APIs**:
   - Queries filtran por `admin_id` del usuario actual
   - RLS valida permisos en cada operación

## Componentes Clave

### Panel Web Admin

#### Server Components
```
app/
├── page.tsx                 # Redirige a dashboard o login
├── login/
│   └── page.tsx            # ❌ Client Component (formulario)
└── dashboard/
    ├── layout.tsx          # ✅ Server - Verifica auth
    ├── page.tsx            # ✅ Server - Dashboard con stats
    ├── courts/
    │   ├── page.tsx        # ✅ Server - Lista canchas
    │   ├── new/page.tsx    # ✅ Server - Formulario nuevo
    │   └── [id]/edit/
    │       └── page.tsx    # ✅ Server - Formulario edición
    └── bookings/
        └── page.tsx        # ✅ Server - Lista reservas
```

#### Client Components
```
components/
├── Header.tsx              # ❌ Client - Logout, estado
├── Sidebar.tsx             # ❌ Client - Navegación activa
├── CourtCard.tsx           # ❌ Client - Acciones de cancha
├── CourtForm.tsx           # ❌ Client - Formulario cancha
├── BookingsTable.tsx       # ❌ Client - Tabla con acciones
├── RealtimeBookings.tsx    # ❌ Client - Suscripción realtime
└── SettingsForm.tsx        # ❌ Client - Formulario settings
```

### Realtime Component Pattern

```typescript
// RealtimeBookings.tsx
export default function RealtimeBookings({ userId, children }) {
  useEffect(() => {
    const supabase = createClient();
    
    // Suscribirse a cambios
    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings'
      }, async (payload) => {
        // Verificar si es del admin
        const { data: court } = await supabase
          .from('courts')
          .select('admin_id, name')
          .eq('id', payload.new.court_id)
          .single();
        
        if (court?.admin_id === userId) {
          // Mostrar notificación
          toast.success(`¡Nueva reserva en ${court.name}!`);
          router.refresh();
        }
      })
      .subscribe();
    
    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  
  return <>{children}</>;
}
```

## Seguridad

### Capas de Seguridad

1. **Autenticación**:
   - JWT tokens de Supabase
   - Cookies seguras (HttpOnly)
   - Refresh token automático

2. **Autorización**:
   - RLS en todas las tablas
   - Verificación de admin en middleware
   - Validación en cada query

3. **Protección de Datos**:
   - Variables de entorno para secrets
   - HTTPS en producción
   - Encriptación de passwords (Supabase)

4. **Validación**:
   - Client-side: Formularios
   - Server-side: Supabase RLS
   - Database: Constraints y triggers

## Performance

### Optimizaciones

1. **Server Components**:
   - Rendering en servidor
   - Menos JavaScript al cliente
   - Caché automático de Next.js

2. **Índices de Base de Datos**:
   ```sql
   CREATE INDEX idx_courts_admin_id ON courts(admin_id);
   CREATE INDEX idx_bookings_court_id ON bookings(court_id);
   CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
   ```

3. **Query Optimization**:
   - Seleccionar solo campos necesarios
   - Usar joins en lugar de queries separadas
   - Filtrar por RLS automáticamente

4. **Realtime Efficiency**:
   - Suscripciones específicas por tabla
   - Filtrado en cliente antes de actualizar
   - Debouncing de actualizaciones

## Escalabilidad

### Horizontal Scaling

- **Frontend**: Vercel Edge Functions
- **Backend**: Supabase (auto-scaling PostgreSQL)
- **Realtime**: Supabase multiplexing de conexiones

### Límites Actuales

- Supabase Free Tier:
  - 500 MB database
  - 2 GB bandwidth/mes
  - 2 concurrent realtime connections

### Para Producción

- Supabase Pro:
  - 8 GB database
  - 50 GB bandwidth/mes
  - 200 concurrent realtime connections
  - Backups diarios automáticos

## Monitoreo

### Métricas Clave

1. **Supabase Dashboard**:
   - Queries por segundo
   - Latencia de DB
   - Conexiones activas
   - Uso de realtime

2. **Vercel Analytics** (Producción):
   - Visitas
   - Tiempo de carga
   - Core Web Vitals

3. **Logs**:
   - Errores de autenticación
   - Queries lentas
   - Errores de realtime

## Próximas Mejoras

- [ ] Caché con Redis para queries frecuentes
- [ ] Queue de trabajos con pg_cron
- [ ] Webhooks para integraciones externas
- [ ] API REST para terceros
- [ ] GraphQL endpoint
- [ ] Notificaciones push web
- [ ] Modo offline
- [ ] Multi-tenancy mejorado

---

**Última actualización**: Febrero 2026
