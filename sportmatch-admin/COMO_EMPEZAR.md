# 🚀 Cómo Empezar con SportMatch Admin

## ⚡ Inicio Rápido (10 minutos)

### Paso 1: Configurar la Base de Datos (5 min)

#### 1.1 Ejecutar SQL de Migración

1. Abre [tu proyecto de Supabase](https://app.supabase.com/project/wvjcgbretoqjpzjnpunn/editor)
2. Ve a **SQL Editor** (icono de terminal en el menú izquierdo)
3. Haz clic en **New Query**
4. Abre el archivo: `supabase/migrations/001_create_admin_tables.sql`
5. Copia TODO el contenido del archivo
6. Pégalo en el editor SQL de Supabase
7. Haz clic en **Run** (botón verde en la esquina inferior derecha)
8. Espera a que termine (debería decir "Success")

#### 1.2 Crear tu Usuario Administrador

**Opción A: Usar la Interfaz de Supabase (Recomendado)**

1. Ve a **Authentication** → **Users** en Supabase
2. Haz clic en **Add user** → **Create new user**
3. Completa:
   - Email: `admin@tuempresa.com` (usa tu email real)
   - Password: `TuPassword123!` (usa una contraseña segura)
   - Haz clic en **Auto Confirm User** (importante!)
4. Haz clic en **Create user**
5. **COPIA EL UUID** del usuario (aparece en la lista, algo como: `a1b2c3d4-...`)

6. Ve a **Table Editor** → `admin_users`
7. Haz clic en **Insert** → **Insert row**
8. Completa:
   - `user_id`: Pega el UUID que copiaste
   - `business_name`: "Mi Complejo Deportivo" (o el nombre de tu negocio)
   - `phone`: "+56912345678" (tu teléfono)
   - `is_verified`: ✅ **Activa el checkbox** (¡MUY IMPORTANTE!)
9. Haz clic en **Save**

**Opción B: Usar SQL**

Si ya tienes un usuario en Supabase, ejecuta este SQL (reemplaza los valores):

```sql
-- Inserta en admin_users usando el UUID de tu usuario existente
INSERT INTO admin_users (user_id, business_name, phone, is_verified)
VALUES (
  'REEMPLAZA-CON-TU-UUID',  -- El UUID de tu usuario en auth.users
  'Mi Complejo Deportivo',   -- Nombre de tu negocio
  '+56912345678',            -- Tu teléfono
  true                       -- IMPORTANTE: debe ser true
);
```

Para obtener tu UUID:
```sql
-- Ejecuta esto primero para ver tu UUID
SELECT id, email FROM auth.users;
```

#### 1.3 Habilitar Realtime

1. En Supabase, ve a **Database** → **Replication**
2. En la barra de búsqueda, escribe: `bookings`
3. Encuentra la tabla `bookings` en la lista
4. Activa el switch de **Realtime** (debe quedar en verde) ✅
5. ¡Listo!

### Paso 2: Iniciar la Aplicación (2 min)

#### 2.1 Abrir Terminal

```bash
# Navega al proyecto
cd C:\Users\luisf\Proyectos\sportmatch-admin

# Iniciar servidor de desarrollo
npm run dev
```

#### 2.2 Abrir en el Navegador

Abre tu navegador y ve a: **http://localhost:3000**

### Paso 3: Iniciar Sesión (30 segundos)

1. Te redirigirá automáticamente a `/login`
2. Ingresa:
   - **Email**: El que usaste al crear el usuario admin
   - **Password**: Tu contraseña
3. Haz clic en **Iniciar sesión**
4. ✅ ¡Deberías estar en el Dashboard!

## 🎯 Primeros Pasos Después de Login

### 1. Explorar el Dashboard (30 segundos)

Verás 4 tarjetas con estadísticas:
- Total Canchas: 0
- Reservas Hoy: 0
- Reservas Pendientes: 0
- Total Reservas: 0

(Todos en 0 porque es la primera vez)

### 2. Crear tu Primera Cancha (2 minutos)

1. Haz clic en **Canchas** en el menú lateral (o en la tarjeta "Total Canchas")
2. Haz clic en **Nueva Cancha** (botón verde arriba a la derecha)
3. Completa el formulario:

   **Información Básica:**
   - Nombre: `Cancha Fútbol 7 - Principal`
   - Descripción: `Cancha con pasto sintético, ideal para partidos`
   - Dirección: `Av. Libertador 1234`

   **Ubicación:**
   - Región: Selecciona tu región (ej: `Metropolitana de Santiago`)
   - Ciudad: Selecciona tu ciudad (ej: `Santiago`)

   **Características:**
   - Tipo de superficie: `Césped Sintético`
   - Precio por hora: `25000` (o el precio que prefieras)
   - Capacidad: `14` (jugadores)

   **Amenidades** (activa las que tenga tu cancha):
   - ✅ Tiene iluminación
   - ✅ Tiene estacionamiento
   - ✅ Tiene camarines
   - ✅ Cancha activa

4. Haz clic en **Crear Cancha**
5. ✅ Verás un mensaje de éxito y te redirigirá a la lista de canchas

### 3. Ver tu Cancha (10 segundos)

- Deberías ver una tarjeta con tu cancha
- Muestra: nombre, ubicación, precio, capacidad
- Tiene botones de **Editar** y **Eliminar**

### 4. Ver Estadísticas Actualizadas (10 segundos)

1. Haz clic en **Dashboard** en el menú lateral
2. Ahora verás:
   - Total Canchas: **1** ✅
   - Los demás siguen en 0 (porque no hay reservas aún)

## 🧪 Probar Notificaciones en Tiempo Real

### Método 1: Crear Reserva con SQL (1 minuto)

1. Ve a Supabase → **SQL Editor**
2. Ejecuta este SQL (reemplaza los UUIDs):

```sql
-- Primero, obtén el ID de tu cancha
SELECT id, name FROM courts;

-- Obtén el ID de un jugador (puedes usar cualquier usuario de profiles)
SELECT id, email FROM profiles LIMIT 1;

-- Ahora crea una reserva de prueba
INSERT INTO bookings (
  court_id,      -- Usa el ID de tu cancha
  player_id,     -- Usa el ID de un jugador
  booking_date,
  start_time,
  end_time,
  total_price,
  status
) VALUES (
  'ID-DE-TU-CANCHA',    -- Reemplaza con el UUID real
  'ID-DE-UN-JUGADOR',   -- Reemplaza con el UUID real
  CURRENT_DATE + INTERVAL '1 day',
  '18:00',
  '19:00',
  25000,
  'pending'
);
```

3. Ejecuta el SQL
4. **¡Mira tu panel web!** 🔔
   - Deberías ver una notificación verde arriba a la derecha
   - El dashboard se actualiza automáticamente
   - Las estadísticas cambian

### Método 2: Desde la App Móvil

Si tienes la app móvil SportMatch:
1. Crea una reserva desde la app
2. El panel web recibirá la notificación al instante
3. Verás la reserva en tiempo real

## 📊 Explorar Funcionalidades

### Gestionar Reservas

1. Haz clic en **Reservas** en el menú lateral
2. Verás una tabla con todas las reservas
3. Para reservas pendientes:
   - Haz clic en ✅ para confirmar
   - Haz clic en ❌ para cancelar
4. Verás la información del jugador:
   - Nombre
   - Email
   - Teléfono

### Editar una Cancha

1. Ve a **Canchas**
2. En la tarjeta de tu cancha, haz clic en **Editar**
3. Modifica lo que necesites
4. Haz clic en **Actualizar**

### Desactivar una Cancha

1. Ve a **Canchas** → **Editar**
2. Desactiva el checkbox **Cancha activa**
3. Guarda los cambios
4. La cancha no estará disponible para reservas en la app móvil

### Configuración

1. Haz clic en **Configuración** en el menú lateral
2. Puedes actualizar:
   - Nombre del negocio
   - Teléfono de contacto
3. El email no se puede cambiar (es el de tu cuenta)

## 🎯 Tips y Trucos

### 🔔 Notificaciones

- Las notificaciones aparecen arriba a la derecha
- Son verdes para éxito, rojas para errores
- Duran 5 segundos (10 para nuevas reservas)
- Puedes cerrarlas haciendo clic en la X

### 📱 Responsive

- El panel funciona en:
  - 💻 Computadora (mejor experiencia)
  - 📱 Tablet
  - 📱 Móvil
- El menú lateral se adapta automáticamente

### ⌨️ Atajos

- **ESC**: Cerrar notificación
- **Ctrl + R**: Recargar página
- **F5**: Recargar (Windows)

### 🎨 Navegación Rápida

Desde el Dashboard, haz clic en las tarjetas para ir directamente:
- **Total Canchas** → Lista de canchas
- **Reservas Hoy** → Lista de reservas
- **Reservas Pendientes** → Lista filtrada por pendientes
- **Total Reservas** → Lista completa de reservas

## ❗ Problemas Comunes

### "No tienes permisos de administrador"

**Causa**: No tienes registro en `admin_users` o `is_verified = false`

**Solución**:
```sql
-- Verifica tu registro
SELECT * FROM admin_users WHERE user_id = 'TU-UUID';

-- Si no existe o is_verified es false:
UPDATE admin_users 
SET is_verified = true 
WHERE user_id = 'TU-UUID';
```

### "No veo mis canchas"

**Causa**: El `admin_id` de la cancha no coincide con tu `user_id`

**Solución**:
```sql
-- Verifica tus canchas
SELECT * FROM courts WHERE admin_id = 'TU-UUID';

-- Si no hay resultados, verifica tu UUID:
SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com';
```

### "No recibo notificaciones"

**Causa**: Realtime no está habilitado

**Solución**:
1. Ve a Supabase → Database → Replication
2. Encuentra la tabla `bookings`
3. Activa el switch de Realtime
4. Recarga la página del panel

### Página en blanco

**Causa**: Error de JavaScript

**Solución**:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Copia el error
4. Busca el error en Google o revisa el código

## 📚 Siguientes Pasos

### 1. Personalizar

- Cambia los colores en `tailwind.config.ts`
- Modifica textos en los componentes
- Agrega tu logo

### 2. Agregar Más Admins

Para cada nuevo administrador:
1. Crea usuario en Supabase Auth
2. Inserta registro en `admin_users`
3. Da acceso al panel

### 3. Conectar con App Móvil

Lee `INTEGRACION_APP_MOVIL.md` para:
- Agregar pantalla de canchas en la app
- Implementar sistema de reservas
- Configurar notificaciones bidireccionales

### 4. Desplegar a Producción

Lee `README.md` sección de despliegue para:
- Configurar Vercel
- Configurar dominio personalizado
- Variables de entorno de producción

## 📖 Documentación Completa

- `README.md` - Documentación completa
- `INICIO_RAPIDO.md` - Guía rápida
- `ARQUITECTURA.md` - Arquitectura técnica
- `INTEGRACION_APP_MOVIL.md` - Integración con app móvil
- `RESUMEN_PROYECTO.md` - Resumen completo

## 💡 Necesitas Ayuda?

1. Revisa la documentación en los archivos MD
2. Verifica la consola del navegador (F12)
3. Revisa los logs de Supabase
4. Consulta la documentación oficial de Next.js/Supabase

## ✅ Checklist de Inicio

- [ ] Ejecuté el SQL de migración
- [ ] Creé mi usuario administrador
- [ ] Verifiqué que `is_verified = true`
- [ ] Habilité Realtime en tabla bookings
- [ ] Inicié la app con `npm run dev`
- [ ] Inicié sesión correctamente
- [ ] Creé mi primera cancha
- [ ] Probé las notificaciones en tiempo real
- [ ] Exploré todas las secciones

---

**¡Listo para empezar! 🚀**

Si completaste todos los pasos, tu panel de administración está **100% funcional** y listo para usar.
