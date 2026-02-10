# 📱 Integración con la App Móvil SportMatch

Guía completa para integrar el Panel Web Admin con la aplicación móvil de SportMatch.

## 🔗 Conexión a la Misma Base de Datos

Ambas aplicaciones ya están configuradas para conectarse a la misma base de datos de Supabase:

**App Móvil** (`sportmatch/.env.example`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://wvjcgbretoqjpzjnpunn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Panel Web** (`sportmatch-admin/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://wvjcgbretoqjpzjnpunn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Las credenciales son las mismas** → Conexión exitosa garantizada.

## 🚀 Flujo Completo de Reserva

### 1. Jugador en App Móvil

El jugador navega por la app y hace una reserva:

```typescript
// En la app móvil (React Native)
const { data, error } = await supabase
  .from('bookings')
  .insert([{
    court_id: selectedCourt.id,
    player_id: user.id,
    booking_date: '2026-02-10',
    start_time: '18:00',
    end_time: '19:00',
    total_price: 25000,
    status: 'pending'
  }]);
```

### 2. Supabase Procesa

- ✅ Valida RLS (el jugador puede insertar su propia reserva)
- ✅ Inserta el registro en la tabla `bookings`
- ✅ Ejecuta triggers automáticos
- ✅ Emite evento de Realtime

### 3. Panel Web Recibe Notificación

```typescript
// En el panel web (Next.js)
supabase
  .channel('bookings-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings'
  }, async (payload) => {
    // Verifica que es del admin
    const { data: court } = await supabase
      .from('courts')
      .select('admin_id, name')
      .eq('id', payload.new.court_id)
      .single();
    
    if (court?.admin_id === currentUserId) {
      // 🔔 Mostrar notificación
      toast.success(`¡Nueva reserva en ${court.name}!`);
      
      // 🔄 Actualizar la UI
      router.refresh();
    }
  })
  .subscribe();
```

### 4. Administrador Ve la Reserva

- 🔔 Notificación visual en pantalla
- 📊 Dashboard actualizado con las nuevas estadísticas
- 📋 Reserva visible en la tabla
- ✅ Puede confirmar o rechazar desde el panel

## 🔄 Sincronización Bidireccional

### Admin Confirma Reserva en Panel Web

```typescript
// Panel web
await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId);
```

### Jugador Ve Confirmación en App Móvil

La app móvil puede suscribirse también:

```typescript
// App móvil (agregar esta funcionalidad)
supabase
  .channel('my-bookings')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'bookings',
    filter: `player_id=eq.${user.id}`
  }, (payload) => {
    if (payload.new.status === 'confirmed') {
      // Mostrar notificación al jugador
      Alert.alert(
        '¡Reserva confirmada!',
        'Tu reserva ha sido confirmada por el administrador'
      );
    }
  })
  .subscribe();
```

## 📝 Modificaciones Recomendadas en la App Móvil

### 1. Crear Pantalla de Reserva de Canchas

Agrega esta pantalla en la app móvil:

```typescript
// sportmatch/app/(tabs)/courts/index.tsx
import { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { supabase } from '@/services/supabase';

export default function CourtsScreen() {
  const [courts, setCourts] = useState([]);
  
  useEffect(() => {
    loadCourts();
  }, []);
  
  const loadCourts = async () => {
    const { data } = await supabase
      .from('courts')
      .select('*, cities(name, regions(name))')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    setCourts(data || []);
  };
  
  return (
    <View>
      <FlatList
        data={courts}
        renderItem={({ item }) => <CourtCard court={item} />}
      />
    </View>
  );
}
```

### 2. Crear Funcionalidad de Reserva

```typescript
// sportmatch/services/booking.service.ts
import { supabase } from './supabase';

export const createBooking = async (bookingData: {
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No autenticado');
  
  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      player_id: user.id,
      status: 'pending',
      currency: 'CLP',
      payment_status: 'pending'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

### 3. Agregar Notificaciones de Estado de Reserva

```typescript
// sportmatch/components/BookingStatusListener.tsx
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Alert } from 'react-native';

export default function BookingStatusListener({ userId }: { userId: string }) {
  useEffect(() => {
    const channel = supabase
      .channel('my-bookings-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `player_id=eq.${userId}`
      }, (payload) => {
        const newStatus = payload.new.status;
        
        if (newStatus === 'confirmed') {
          Alert.alert(
            '✅ Reserva Confirmada',
            'Tu reserva ha sido confirmada por el administrador.'
          );
        } else if (newStatus === 'cancelled') {
          Alert.alert(
            '❌ Reserva Cancelada',
            'Tu reserva ha sido cancelada. Contacta al administrador para más información.'
          );
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  
  return null;
}
```

### 4. Agregar Tab de Canchas

```typescript
// sportmatch/app/(tabs)/_layout.tsx
// Agregar un nuevo tab para canchas

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs>
      {/* Tabs existentes... */}
      
      <Tabs.Screen
        name="courts"
        options={{
          title: 'Canchas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'football' : 'football-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

## 🎯 Casos de Uso Completos

### Caso 1: Reserva Simple

```
1. Jugador busca canchas disponibles en app móvil
2. Jugador selecciona fecha, hora y cancha
3. Jugador confirma reserva
4. INSERT en tabla bookings
5. Admin recibe notificación instantánea en panel web
6. Admin revisa detalles de la reserva
7. Admin confirma reserva
8. UPDATE en tabla bookings
9. Jugador recibe notificación de confirmación en app móvil
```

### Caso 2: Admin Gestiona Disponibilidad

```
1. Admin desactiva una cancha (mantenimiento)
2. UPDATE en tabla courts (is_active = false)
3. App móvil deja de mostrar esa cancha
4. Jugadores no pueden reservar
5. Admin reactiva la cancha
6. UPDATE en tabla courts (is_active = true)
7. Cancha vuelve a estar disponible en app móvil
```

### Caso 3: Admin Crea Nueva Cancha

```
1. Admin crea nueva cancha en panel web
2. INSERT en tabla courts
3. Inmediatamente visible en app móvil
4. Jugadores pueden reservar sin reinicar la app
```

## 🔧 Testing de la Integración

### Prueba 1: Crear Reserva desde SQL

```sql
-- En Supabase SQL Editor
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  total_price,
  status
) VALUES (
  (SELECT id FROM courts LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  '18:00',
  '19:00',
  25000,
  'pending'
);
```

✅ Verifica que aparece notificación en el panel web.

### Prueba 2: Confirmar Reserva desde Panel

1. En panel web, ve a Reservas
2. Busca una reserva pendiente
3. Haz clic en el botón de confirmar ✅
4. Verifica que el estado cambia a "Confirmada"

### Prueba 3: Crear Cancha desde Panel

1. En panel web, ve a Canchas
2. Crea una nueva cancha
3. En app móvil (o SQL), verifica que aparece:

```sql
SELECT * FROM courts ORDER BY created_at DESC LIMIT 1;
```

## 📊 Métricas de Integración

### Latencia Esperada

- **Notificación de reserva**: < 1 segundo
- **Actualización de UI**: < 2 segundos
- **Sincronización completa**: < 3 segundos

### Conexiones Simultáneas

- **Supabase Free**: 2 conexiones realtime
- **Supabase Pro**: 200 conexiones realtime
- **Recomendado**: Upgrade si > 50 administradores activos

## 🚨 Troubleshooting

### No llegan notificaciones

1. Verifica que Realtime esté habilitado en Supabase
2. Revisa la consola del navegador
3. Confirma que la suscripción esté activa:
   ```typescript
   .subscribe((status) => {
     console.log('Status:', status); // Debe ser 'SUBSCRIBED'
   });
   ```

### Reservas no aparecen en panel

1. Verifica que `admin_id` de la cancha coincida con tu usuario
2. Revisa las políticas RLS
3. Confirma que la query incluye el JOIN correcto:
   ```sql
   SELECT b.*, c.*
   FROM bookings b
   INNER JOIN courts c ON b.court_id = c.id
   WHERE c.admin_id = '<tu-uuid>';
   ```

### Errores de permisos

1. Verifica que el usuario tenga registro en `admin_users`
2. Confirma que `is_verified = true`
3. Revisa que las políticas RLS estén correctas

## 🎉 Conclusión

La integración está **lista para usar**. Ambas aplicaciones comparten:

- ✅ La misma base de datos
- ✅ Las mismas tablas
- ✅ Las mismas credenciales
- ✅ Sincronización en tiempo real
- ✅ Seguridad con RLS

Solo necesitas:
1. Ejecutar el SQL de migraciones
2. Crear un usuario administrador
3. Empezar a usar ambas aplicaciones

---

**¿Necesitas más ayuda?** Consulta `README.md` y `ARQUITECTURA.md`.
