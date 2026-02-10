# 🚀 Inicio Rápido - SportMatch Admin

Guía rápida para poner en marcha el panel de administración.

## ⚡ Instalación Express (5 minutos)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

El archivo `.env.local` ya está configurado con las credenciales de Supabase del proyecto SportMatch.

### 3. Ejecutar el SQL en Supabase

1. Abre [tu proyecto de Supabase](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Copia el contenido de `supabase/migrations/001_create_admin_tables.sql`
4. Pégalo en el editor y ejecuta

### 4. Crear tu usuario administrador

**Opción A: Usando la interfaz de Supabase**

1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user** → **Create new user**
3. Ingresa tu email y contraseña
4. Copia el UUID del usuario creado
5. Ve a **Table Editor** → `admin_users`
6. Haz clic en **Insert** → **Insert row**
7. Completa:
   - `user_id`: El UUID que copiaste
   - `business_name`: Nombre de tu complejo deportivo
   - `phone`: Tu teléfono
   - `address`: Dirección completa del complejo (ej: Av. Libertador 123, Santiago)
   - `country_id`: ID del país (ej: 1 para Chile)
   - `region_id`: ID de la región (ej: 13 para Metropolitana)
   - `city_id`: ID de la ciudad (ej: 100 para Santiago)
   - `latitude`: Latitud (opcional, ej: -33.4489)
   - `longitude`: Longitud (opcional, ej: -70.6693)
   - `is_verified`: ✅ (actívalo)

**⚠️ Importante**: 
- La dirección y ubicación son del **complejo deportivo**, no de cada cancha
- **Todas las canchas** de este administrador estarán en esta ubicación
- La ubicación **no se puede cambiar** desde la interfaz por motivos de seguridad

**Opción B: Usando SQL**

```sql
-- Primero, crea el usuario en Authentication (o usa uno existente)
-- Luego, ejecuta este SQL (reemplaza con tu UUID real y los IDs de ubicación):

-- Ver las ciudades disponibles:
SELECT c.id as city_id, c.name as city, r.name as region, co.name as country
FROM cities c
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
ORDER BY co.name, r.name, c.name;

-- Insertar el usuario administrador con ubicación del complejo:
INSERT INTO admin_users (
  user_id, 
  business_name, 
  phone, 
  address,
  country_id, 
  region_id, 
  city_id, 
  latitude,
  longitude,
  is_verified
)
VALUES (
  'TU-UUID-AQUI', 
  'Mi Complejo Deportivo', 
  '+56912345678',
  'Av. Libertador 123, Santiago',  -- Dirección del complejo
  1,                                -- Chile
  13,                               -- Metropolitana
  100,                              -- Santiago
  -33.4489,                         -- Latitud (opcional)
  -70.6693,                         -- Longitud (opcional)
  true
);
```

### 5. Habilitar Realtime

1. En Supabase, ve a **Database** → **Replication**
2. Busca la tabla `bookings`
3. Activa el switch de **Realtime** ✅

### 6. Iniciar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Primeros Pasos

### 1. Iniciar sesión

Usa el email y contraseña del usuario administrador que creaste.

### 2. Crear tu primera cancha

1. Ve a **Canchas** en el menú lateral
2. Haz clic en **Nueva Cancha**
3. Verás un mensaje con la ubicación de tu complejo deportivo
4. Completa el formulario:
   - Nombre de la cancha (ej: "Cancha Fútbol 7 - Norte")
   - Descripción
   - **Tipo de deporte** (fútbol, tenis, básquetbol, etc.) *
   - Tipo de superficie (césped sintético, cemento, etc.)
   - Precio por hora
   - Capacidad
   - Amenidades (iluminación, estacionamiento, camarines)
5. Haz clic en **Crear Cancha**

**Nota**: 
- La cancha se creará en la ubicación de tu complejo deportivo
- No necesitas ingresar dirección para cada cancha
- Todas tus canchas comparten la misma dirección
- El tipo de deporte es obligatorio para ayudar a los jugadores a encontrar tu cancha

### 3. Ver el Dashboard

Ve a **Dashboard** para ver:
- Total de canchas registradas
- Reservas del día
- Reservas pendientes
- Total de reservas

### 4. Gestionar Reservas

Ve a **Reservas** para:
- Ver todas las reservas
- Confirmar reservas pendientes
- Cancelar reservas
- Ver información de los clientes

## 🔔 Probar las Notificaciones en Tiempo Real

### Desde la app móvil SportMatch:

1. Un jugador crea una reserva en la app móvil
2. Inmediatamente verás una notificación en el panel web
3. La lista de reservas se actualiza automáticamente

### Para probar sin la app móvil:

Ejecuta este SQL en Supabase (reemplaza los UUIDs):

```sql
-- Primero, obtén el ID de tu cancha:
SELECT id, name FROM courts;

-- Obtén el ID de un jugador (cualquier usuario en profiles):
SELECT id, email FROM profiles LIMIT 1;

-- Inserta una reserva de prueba:
INSERT INTO bookings (
  court_id,
  player_id,
  booking_date,
  start_time,
  end_time,
  total_price,
  status
) VALUES (
  'ID-DE-TU-CANCHA',
  'ID-DEL-JUGADOR',
  CURRENT_DATE + INTERVAL '1 day',
  '18:00',
  '19:00',
  25000,
  'pending'
);
```

¡Deberías ver la notificación aparecer instantáneamente en el panel! 🎉

## 📊 Estructura de URLs

- `/` → Redirige al dashboard o login
- `/login` → Página de inicio de sesión
- `/dashboard` → Dashboard principal con estadísticas
- `/dashboard/courts` → Lista de canchas
- `/dashboard/courts/new` → Crear nueva cancha
- `/dashboard/courts/[id]/edit` → Editar cancha
- `/dashboard/bookings` → Lista de reservas
- `/dashboard/settings` → Configuración del administrador

## 🔐 Seguridad

- ✅ Solo usuarios con registro en `admin_users` pueden acceder
- ✅ Los administradores solo ven sus propias canchas y reservas
- ✅ Los administradores solo pueden crear canchas en su ciudad asignada
- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Middleware protege todas las rutas del dashboard

## 🆘 Problemas Comunes

### "No tienes permisos de administrador"

**Solución**: Verifica que tu usuario tenga un registro en la tabla `admin_users` con `is_verified = true`.

```sql
-- Verifica tu registro:
SELECT * FROM admin_users WHERE user_id = 'TU-UUID';

-- Si no existe, créalo:
INSERT INTO admin_users (user_id, is_verified)
VALUES ('TU-UUID', true);
```

### "No veo mis canchas"

**Solución**: Verifica que el `admin_id` de tus canchas coincida con tu `user_id`:

```sql
-- Verifica tus canchas:
SELECT id, name, admin_id FROM courts WHERE admin_id = 'TU-UUID';
```

### "No puedo crear canchas" o "Error de permisos al crear cancha"

**Solución**: Verifica que tengas una ciudad asignada:

1. Ve a **Configuración** en el menú lateral
2. En la sección "Ubicación Asignada", verifica que tengas una ciudad configurada
3. Si dice "No asignado", contacta al administrador del sistema para que te asigne una ciudad

**Nota**: Solo puedes crear canchas en la ciudad que se te haya asignado al crear tu cuenta. La ubicación no se puede cambiar desde la interfaz por motivos de seguridad. Esto garantiza que cada administrador gestione canchas solo en su ubicación geográfica.

### "No recibo notificaciones en tiempo real"

**Solución**:

1. Verifica que Realtime esté habilitado en la tabla `bookings`
2. Revisa la consola del navegador (F12)
3. Busca el mensaje: "Conectado a notificaciones en tiempo real"

## 🎨 Personalización

### Cambiar colores

Edita `tailwind.config.ts` y `app/globals.css` para personalizar:
- Color principal (actualmente verde)
- Tipografía
- Espaciados

### Agregar campos personalizados

1. Agrega la columna en Supabase
2. Actualiza `types/database.types.ts`
3. Modifica el formulario en `components/CourtForm.tsx`

## 📱 Próximos Pasos

1. **Conectar con la app móvil**: Asegúrate de que ambas apps usen la misma base de datos de Supabase
2. **Configurar dominios**: Si vas a producción, configura tu dominio personalizado
3. **Agregar más administradores**: Crea más usuarios en `admin_users`
4. **Personalizar**: Ajusta colores, textos y funcionalidades según tus necesidades

## 🚀 Desplegar a Producción

### Opción 1: Vercel (Recomendado)

1. Sube el código a GitHub
2. Importa el repositorio en [Vercel](https://vercel.com)
3. Configura las variables de entorno
4. Despliega

### Opción 2: Otras plataformas

Compatible con:
- Netlify
- Railway
- Digital Ocean App Platform
- AWS Amplify

## 💡 Consejos

- 💾 **Haz backup**: Exporta tu base de datos regularmente
- 🔒 **Contraseñas fuertes**: Usa contraseñas seguras para administradores
- 📧 **Email de verificación**: Configura Supabase para enviar emails de verificación
- 📊 **Monitorea**: Revisa las estadísticas de uso en Supabase

## 🎉 ¡Listo!

Ya tienes tu panel de administración funcionando. Ahora puedes:
- ✅ Gestionar tus canchas
- ✅ Recibir reservas en tiempo real
- ✅ Administrar tu negocio deportivo

---

**¿Necesitas ayuda?** Revisa el `README.md` completo para más detalles.
