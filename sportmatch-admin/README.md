# SportMatch Admin - Panel de Administración

Panel web de administración para gestionar canchas deportivas y reservas en tiempo real, construido con Next.js 15 y Supabase.

## 🚀 Características

### Autenticación
- ✅ Login seguro con Supabase Auth
- ✅ Verificación de permisos de administrador
- ✅ Sesiones persistentes
- ✅ Middleware de protección de rutas

### Gestión de Canchas
- ✅ Crear, editar y eliminar canchas
- ✅ Información detallada (ubicación, precio, capacidad, amenidades)
- ✅ Activar/desactivar disponibilidad
- ✅ Filtrado por región y ciudad

### Gestión de Reservas
- ✅ Vista completa de reservas
- ✅ Confirmar o cancelar reservas
- ✅ Información del cliente
- ✅ Filtrado por estado y fecha

### Notificaciones en Tiempo Real
- ✅ Notificaciones instantáneas de nuevas reservas
- ✅ Sincronización automática usando Supabase Realtime
- ✅ Indicadores visuales de nuevas reservas
- ✅ Alertas de sonido (opcional)

### Dashboard
- ✅ Estadísticas en tiempo real
- ✅ Resumen de reservas del día
- ✅ Métricas de ocupación
- ✅ Visualización de reservas recientes

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de Supabase (usa la misma del proyecto SportMatch móvil)
- npm o yarn

## 🔧 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Las credenciales de Supabase ya están configuradas para conectarse a la misma base de datos que la app móvil.

### 3. Configurar la base de datos

Ejecuta el SQL en tu proyecto de Supabase:

1. Ve a tu proyecto de Supabase → **SQL Editor**
2. Abre el archivo `supabase/migrations/001_create_admin_tables.sql`
3. Copia y pega el contenido completo
4. Ejecuta el SQL

Este script creará:
- Tabla `admin_users` para administradores
- Tabla `courts` para canchas deportivas
- Tabla `bookings` para reservas
- Políticas de seguridad (RLS)
- Índices para mejor rendimiento
- Triggers para campos automáticos
- Configuración de Realtime

### 4. Crear un usuario administrador

Después de ejecutar el SQL, necesitas crear un usuario administrador:

1. Ve a **Authentication** → **Users** en Supabase
2. Crea un nuevo usuario con correo y contraseña
3. Copia el UUID del usuario
4. Ve a **Table Editor** → `admin_users`
5. Inserta un registro:
   - `user_id`: El UUID del usuario que creaste
   - `business_name`: Nombre de tu negocio
   - `phone`: Teléfono de contacto
   - `is_verified`: `true`

Alternativamente, ejecuta este SQL (reemplaza `<USER_UUID>` con el UUID real):

```sql
INSERT INTO admin_users (user_id, business_name, phone, is_verified)
VALUES ('<USER_UUID>', 'Mi Complejo Deportivo', '+56912345678', true);
```

### 5. Habilitar Realtime en Supabase

Para las notificaciones en tiempo real:

1. Ve a **Database** → **Replication** en Supabase
2. Busca la tabla `bookings`
3. Activa el switch de **Realtime**

## 🏃‍♂️ Ejecutar la aplicación

### Modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### Modo producción

```bash
npm run build
npm start
```

## 📱 Integración con la App Móvil

Este panel se conecta a la **misma base de datos de Supabase** que la aplicación móvil SportMatch. Esto significa:

### Comunicación instantánea

1. **Jugador reserva en la App Móvil** → Se inserta un registro en la tabla `bookings`
2. **Supabase Realtime** → Detecta el cambio y envía notificación
3. **Panel Web recibe la notificación** → Actualiza la interfaz y muestra alerta

### Flujo de datos

```
App Móvil (React Native)
    ↓
Supabase Database (Postgres)
    ↓
Supabase Realtime (WebSocket)
    ↓
Panel Web (Next.js) ← Notificación instantánea
```

### Ventajas

- ✅ **Sin backend adicional**: Todo a través de Supabase
- ✅ **Tiempo real**: Notificaciones en menos de 1 segundo
- ✅ **Escalable**: Maneja múltiples administradores simultáneamente
- ✅ **Seguro**: Row Level Security en todas las tablas

## 🎨 Estructura del Proyecto

```
sportmatch-admin/
├── app/
│   ├── dashboard/          # Rutas del dashboard
│   │   ├── bookings/       # Gestión de reservas
│   │   ├── courts/         # Gestión de canchas
│   │   └── settings/       # Configuración
│   ├── login/              # Página de login
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Página de inicio
├── components/
│   ├── BookingsTable.tsx   # Tabla de reservas
│   ├── CourtCard.tsx       # Card de cancha
│   ├── CourtForm.tsx       # Formulario de cancha
│   ├── Header.tsx          # Header del dashboard
│   ├── RealtimeBookings.tsx # Suscripción realtime
│   ├── SettingsForm.tsx    # Formulario de configuración
│   └── Sidebar.tsx         # Sidebar de navegación
├── lib/
│   ├── supabase/           # Cliente y servidor de Supabase
│   └── utils.ts            # Utilidades
├── types/
│   └── database.types.ts   # Tipos de la base de datos
├── supabase/
│   └── migrations/         # Migraciones SQL
├── middleware.ts           # Middleware de autenticación
└── package.json
```

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen políticas de seguridad:

- **admin_users**: Solo el admin puede ver y editar su propio perfil
- **courts**: Los admins solo pueden gestionar sus propias canchas
- **bookings**: Los jugadores ven sus reservas, los admins ven las reservas de sus canchas

### Middleware

El middleware protege todas las rutas del dashboard, verificando:
1. Si el usuario está autenticado
2. Si el usuario tiene un registro en `admin_users`
3. Redirige a login si no cumple los requisitos

## 🚀 Despliegue

### Vercel (Recomendado)

1. Sube el proyecto a GitHub
2. Importa el proyecto en [Vercel](https://vercel.com)
3. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Despliega

### Otras plataformas

El proyecto es compatible con cualquier plataforma que soporte Next.js:
- Netlify
- Railway
- Digital Ocean
- AWS Amplify

## 📊 Características de Realtime

### Notificaciones automáticas

El componente `RealtimeBookings` se suscribe a cambios en la tabla `bookings`:

```typescript
// Se ejecuta cuando hay una nueva reserva (INSERT)
- Verifica que la cancha pertenece al admin
- Muestra notificación toast
- Actualiza la lista de reservas
- Reproduce sonido (opcional)

// Se ejecuta cuando se actualiza una reserva (UPDATE)
- Actualiza la lista automáticamente
```

### Configuración de Realtime

El archivo SQL ya incluye:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

Esto habilita los eventos de Postgres para transmisión en tiempo real.

## 🛠️ Tecnologías Utilizadas

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Realtime**: Supabase Realtime
- **Estilos**: Tailwind CSS
- **UI**: Lucide Icons + Custom Components
- **Notificaciones**: Sonner

## 📝 Próximas Características

- [ ] Calendario visual de reservas
- [ ] Estadísticas avanzadas y gráficos
- [ ] Sistema de pagos integrado
- [ ] Gestión de horarios disponibles
- [ ] Exportación de reportes
- [ ] Chat con clientes
- [ ] Notificaciones push
- [ ] App móvil para administradores

## 🐛 Solución de Problemas

### No recibo notificaciones en tiempo real

1. Verifica que Realtime esté habilitado en la tabla `bookings`
2. Revisa la consola del navegador para ver el estado de la suscripción
3. Asegúrate de que el usuario sea administrador de la cancha

### Error al iniciar sesión

1. Verifica que el usuario exista en `auth.users`
2. Confirma que el usuario tenga un registro en `admin_users`
3. Revisa que `is_verified` sea `true`

### No veo mis canchas

1. Verifica que `admin_id` coincida con tu `user_id`
2. Revisa las políticas RLS en Supabase
3. Confirma que estés autenticado correctamente

## 📄 Licencia

MIT

## 👥 Soporte

Para problemas o preguntas, abre un issue en el repositorio o contacta al desarrollador.

---

**Desarrollado con ❤️ para SportMatch**
