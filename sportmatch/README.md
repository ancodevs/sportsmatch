# SportMatch - Aplicación React Native con Expo

Aplicación móvil desarrollada con React Native, Expo y Supabase que incluye:

## 🚀 Características

### Autenticación
- ✅ Login y Sign Up tradicional
- ✅ Autenticación social con Google y Apple
- ✅ Autenticación biométrica (Face ID / Huella dactilar)
- ✅ Persistencia de sesión segura

### Onboarding
- ✅ Carruseles interactivos para completar perfil
- ✅ Experiencia guiada para nuevos usuarios

### Perfil
- ✅ Edición de avatar con cámara o galería
- ✅ Gestión de datos personales
- ✅ Cambio de contraseña seguro

## 📦 Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno:
```bash
cp .env.example .env
```

3. Edita el archivo `.env` con tus credenciales de Supabase y OAuth

## 🏃‍♂️ Ejecutar la aplicación

```bash
# Iniciar el servidor de desarrollo
npm start

# Ejecutar en iOS
npm run ios

# Ejecutar en Android
npm run android
```

## 🔧 Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Habilita los proveedores de autenticación (Google, Apple)
3. Copia tu URL y Anon Key al archivo `.env`
4. Configura las URLs de redirección en Supabase

### Esquema de Base de Datos

El esquema completo de la base de datos está en el archivo `primerabd.sql`.

**Incluye:**
- ✅ Tabla de perfiles con campos extendidos
- ✅ Tablas de ubicación (países, regiones, ciudades)
- ✅ Datos de Chile precargados
- ✅ Sistema de tokens y premium
- ✅ Row Level Security (RLS)
- ✅ Triggers automáticos
- ✅ Storage para avatares

**Para configurar:**
1. Ve a tu proyecto de Supabase → **SQL Editor**
2. Copia el contenido de `primerabd.sql`
3. Pega y ejecuta el SQL
4. Crea el bucket `avatars` en **Storage** (público)

## 📱 Estructura del Proyecto

\`\`\`
sportmatch/
├── app/                    # Navegación con Expo Router
│   ├── (auth)/            # Pantallas de autenticación
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (onboarding)/      # Pantallas de onboarding
│   │   └── index.tsx
│   ├── (tabs)/            # Navegación principal
│   │   ├── profile.tsx
│   │   └── settings.tsx
│   └── _layout.tsx
├── components/            # Componentes reutilizables
├── services/             # Servicios (Supabase, Auth)
├── contexts/             # Contextos de React
├── types/                # Tipos de TypeScript
└── utils/                # Utilidades y helpers
\`\`\`

## 🔐 Seguridad

- Las credenciales se almacenan de forma segura usando `expo-secure-store`
- Autenticación biométrica para acceso rápido
- Tokens de sesión manejados por Supabase
- RLS habilitado en todas las tablas

## 📄 Licencia

MIT
