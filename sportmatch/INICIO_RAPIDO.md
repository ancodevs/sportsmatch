# 🚀 Inicio Rápido - SportMatch

## Pasos Mínimos para Comenzar

### 1️⃣ Instalar Dependencias (2 minutos)

```bash
npm install
```

### 2️⃣ Configurar Supabase (5 minutos)

**Crear Proyecto:**
1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto
3. Espera 2-3 minutos a que se inicialice

**Ejecutar SQL:**
1. En el panel de Supabase → **SQL Editor**
2. Copia y pega el SQL del archivo `README.md` (sección "Esquema de Base de Datos")
3. Click en **Run**

**Crear bucket de avatares:**
1. Ve a **Storage** → **New bucket**
2. Nombre: `avatars`
3. Marca como **público**

### 3️⃣ Configurar Variables de Entorno (1 minuto)

```bash
# Copiar archivo de ejemplo
cp .env.example .env
```

**Editar `.env`:**
1. Ve a tu proyecto de Supabase → **Settings** → **API**
2. Copia **Project URL** → pega en `EXPO_PUBLIC_SUPABASE_URL`
3. Copia **anon/public key** → pega en `EXPO_PUBLIC_SUPABASE_ANON_KEY`

```env
EXPO_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-aqui
```

### 4️⃣ Ejecutar la App

```bash
npm start
```

Luego presiona:
- `a` para Android
- `i` para iOS (solo Mac)
- `w` para Web

O escanea el QR con **Expo Go** en tu móvil.

---

## ✅ Verificar que Todo Funciona

1. **Registro:** Crea una cuenta con email/contraseña
2. **Login:** Inicia sesión con las credenciales
3. **Onboarding:** Completa los pasos del onboarding
4. **Perfil:** Edita tu perfil y sube una foto

---

## 🎯 Funcionalidades Implementadas

### ✅ Autenticación
- [x] Login y Registro con email/contraseña
- [x] Validación de formularios
- [x] Manejo de errores
- [x] Persistencia de sesión automática
- [x] Botones de Social Auth (Google/Apple) *
- [x] Autenticación biométrica (Face ID/Huella) *

\* *Requiere configuración adicional (ver CONFIGURACION.md)*

### ✅ Onboarding
- [x] Carrusel de 5 pasos con indicadores
- [x] Subir avatar desde cámara o galería
- [x] Campo de biografía
- [x] Campo de teléfono
- [x] Opción de habilitar biométricos
- [x] Navegación fluida entre pasos

### ✅ Perfil
- [x] Ver información del usuario
- [x] Editar avatar con cámara/galería
- [x] Editar nombre, bio y teléfono
- [x] Navegación a configuración
- [x] Cerrar sesión

### ✅ Configuración
- [x] Toggle de autenticación biométrica
- [x] Cambio de contraseña
- [x] Información de la app
- [x] Links a términos y privacidad

### ✅ Características Técnicas
- [x] Expo Router para navegación
- [x] Context API para estado global
- [x] TypeScript para tipado
- [x] Componentes reutilizables
- [x] Almacenamiento seguro (expo-secure-store)
- [x] Row Level Security en Supabase
- [x] Validación de formularios
- [x] Manejo de errores
- [x] Loading states
- [x] Permisos de cámara y galería

---

## 🔧 Configuración Opcional

### Social Auth (Google/Apple)
Si quieres habilitar login con Google o Apple, sigue la guía detallada en `CONFIGURACION.md`.

**Tiempo estimado:** 15-20 minutos por proveedor

### Assets de la App
Si quieres personalizar los íconos y splash screen:
1. Coloca tus imágenes en la carpeta `assets/`
2. Nombres requeridos: `icon.png`, `splash.png`, `adaptive-icon.png`

---

## 📱 Estructura de Navegación

```
(auth)                  # No autenticado
  ├─ login             → Pantalla de inicio de sesión
  └─ signup            → Pantalla de registro

(onboarding)           # Primera vez después del registro
  └─ index             → Carrusel de configuración de perfil

(tabs)                 # Autenticado
  ├─ profile           → Perfil del usuario (tab principal)
  └─ settings          → Configuración (navegación push)
```

---

## 🐛 Problemas Comunes

### "Cannot find module '@/...'"
- Reinicia el servidor: Ctrl+C y luego `npm start`

### "Invalid API key"
- Verifica el archivo `.env`
- Reinicia el servidor después de cambiar `.env`

### No aparece opción de biométricos
- Normal si el dispositivo no tiene Face ID o huella configurados
- En simulador iOS: Features → Face ID → Enrolled

### Error al subir imagen
- Verifica que el bucket `avatars` esté creado en Supabase Storage
- Verifica que sea público

---

## 📚 Próximos Pasos

1. **Personalizar diseño:** Modifica colores en los estilos de cada componente
2. **Agregar más campos:** Edita el tipo `User` en `types/index.ts`
3. **Nuevas pantallas:** Crea nuevas rutas en la carpeta `app/`
4. **Social Auth:** Configura Google/Apple OAuth (ver CONFIGURACION.md)
5. **Deploy:** Usa EAS Build para compilar la app

---

## 💡 Tips

- **Desarrollo rápido:** Usa `npm start` y escanea el QR con Expo Go
- **Hot Reload:** Los cambios se reflejan automáticamente
- **Logs:** Usa `console.log()` y verás los logs en la terminal
- **Depuración:** Presiona `j` en la terminal para abrir el debugger
- **Clear Cache:** Si hay problemas, usa `npm start -- --clear`

---

## 🆘 Ayuda

Si necesitas ayuda:
1. Revisa `CONFIGURACION.md` para guía detallada
2. Revisa `README.md` para información del proyecto
3. Consulta los comentarios en el código

---

**¡Listo para desarrollar! 🎉**
