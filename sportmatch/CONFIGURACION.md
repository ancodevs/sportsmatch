# Guía de Configuración - SportMatch

## 📋 Pasos de Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Supabase

#### a) Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una nueva cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que el proyecto se inicialice (2-3 minutos)

#### b) Configurar Base de Datos

1. En el panel de Supabase, ve a **SQL Editor**
2. Ejecuta el siguiente SQL para crear las tablas necesarias:

```sql
-- Crear tabla de perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

#### c) Configurar Storage para Avatars

1. Ve a **Storage** en el panel de Supabase
2. Crea un nuevo bucket llamado `avatars`
3. Marca el bucket como **público**
4. Configura las políticas de storage:

```sql
-- Política para subir avatares
CREATE POLICY "Los usuarios pueden subir su propio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para actualizar avatares
CREATE POLICY "Los usuarios pueden actualizar su propio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para eliminar avatares
CREATE POLICY "Los usuarios pueden eliminar su propio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### d) Habilitar Proveedores de Autenticación

1. Ve a **Authentication** → **Providers**
2. Habilita **Email** (ya está habilitado por defecto)
3. Para **Google OAuth**:
   - Habilita Google
   - Sigue las instrucciones para crear un proyecto en Google Cloud Console
   - Obtén el Client ID y Client Secret
   - Configura las URLs de redirección autorizadas
4. Para **Apple OAuth** (solo iOS):
   - Habilita Apple
   - Configura tu App ID en Apple Developer
   - Obtén las credenciales necesarias

### 3. Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Edita el archivo `.env` con tus credenciales:

```env
# Supabase (REQUERIDO)
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Google OAuth (OPCIONAL)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=tu-google-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=tu-google-android-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=tu-google-web-client-id

# Apple OAuth (OPCIONAL)
EXPO_PUBLIC_APPLE_CLIENT_ID=tu-apple-client-id
```

**Dónde encontrar las credenciales de Supabase:**
- Ve a **Settings** → **API** en tu proyecto de Supabase
- Copia la **Project URL** en `EXPO_PUBLIC_SUPABASE_URL`
- Copia la **anon/public key** en `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4. Configurar URLs de Redirección

#### En Supabase:
1. Ve a **Authentication** → **URL Configuration**
2. Agrega estas URLs en **Redirect URLs**:
   - `sportmatch://` (para la app móvil)
   - `http://localhost:19006/auth/callback` (para desarrollo web)

#### Para Google OAuth:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. En tu proyecto, ve a **APIs & Services** → **Credentials**
3. Edita tu OAuth 2.0 Client ID
4. Agrega estas URIs de redirección autorizadas:
   - La URL de callback de Supabase (la encontrarás en Authentication → Providers → Google)

### 5. Generar Assets (Opcional)

Si no tienes los assets de la app, puedes usar placeholders:

```bash
# Crear carpeta de assets
mkdir -p assets

# Puedes usar cualquier herramienta para crear imágenes temporales
# o descargar placeholders de internet
```

Las dimensiones requeridas son:
- `icon.png`: 1024x1024
- `splash.png`: 1284x2778
- `adaptive-icon.png`: 1024x1024
- `favicon.png`: 48x48

## 🚀 Ejecutar la Aplicación

### Desarrollo
```bash
# Iniciar el servidor
npm start

# Ejecutar en iOS (requiere Mac)
npm run ios

# Ejecutar en Android
npm run android

# Ejecutar en Web
npm run web
```

### Escanear QR con Expo Go

1. Instala **Expo Go** en tu dispositivo móvil
2. Ejecuta `npm start`
3. Escanea el QR code que aparece en la terminal

## 🔐 Configuración de Autenticación Biométrica

### iOS
Ya está configurada en `app.json` con el mensaje de permisos:
```json
"NSFaceIDUsageDescription": "Usamos Face ID para permitirte acceder de forma segura a tu cuenta"
```

### Android
Los permisos ya están configurados en `app.json`:
```json
"permissions": [
  "USE_FINGERPRINT",
  "USE_BIOMETRIC"
]
```

## 📸 Configuración de Cámara y Galería

### iOS
Configurado en `app.json`:
```json
"NSCameraUsageDescription": "Necesitamos acceso a la cámara para tomar fotos de perfil",
"NSPhotoLibraryUsageDescription": "Necesitamos acceso a tu galería para seleccionar fotos de perfil"
```

### Android
Los permisos ya están configurados en `app.json`:
```json
"permissions": [
  "CAMERA",
  "READ_EXTERNAL_STORAGE",
  "WRITE_EXTERNAL_STORAGE"
]
```

## 🧪 Pruebas

### Probar sin configurar OAuth
Puedes probar la app sin configurar Google/Apple OAuth:
1. Los botones de social auth aparecerán pero mostrarán error si se presionan
2. Usa el login/registro tradicional con email y contraseña
3. Todas las demás funciones funcionarán normalmente

### Probar sin biométricos
Si tu dispositivo no tiene biométricos configurados:
1. La opción de biométricos no aparecerá
2. Todas las demás funciones funcionarán normalmente

## ❓ Solución de Problemas

### Error: "Invalid API key"
- Verifica que hayas copiado correctamente las credenciales en el archivo `.env`
- Asegúrate de reiniciar el servidor después de cambiar el `.env`

### Error: "Policy violation" al subir imagen
- Verifica que las políticas de storage estén configuradas correctamente
- Asegúrate de que el bucket `avatars` sea público

### Google OAuth no funciona
- Verifica que las URLs de redirección estén configuradas en Google Cloud Console
- Asegúrate de usar los Client IDs correctos para cada plataforma

### Biométricos no aparecen
- Verifica que tu dispositivo tenga Face ID o huella dactilar configurados
- En el simulador de iOS, ve a Features → Face ID → Enrolled

## 📦 Build para Producción

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

**Nota:** Necesitarás una cuenta de Expo EAS para builds de producción.

## 📚 Recursos Adicionales

- [Documentación de Expo](https://docs.expo.dev/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Expo Router](https://expo.github.io/router/docs/)
- [React Native](https://reactnative.dev/)
