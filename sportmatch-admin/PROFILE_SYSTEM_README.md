# Sistema de Configuración/Perfil del Recinto

## 📋 Implementación Completada

Se ha implementado un sistema completo de gestión de perfil para recintos deportivos con dos vistas:

### 1. **Vista Profesional** (Solo Lectura)
- Banner verde con logo circular y nombre del recinto
- Tarjeta de información de contacto (email, teléfono, dirección)
- Tarjeta de deportes disponibles con tags verdes
- Bloque de ubicación (región y ciudad)
- Botón "Editar Perfil" en la esquina superior derecha

### 2. **Vista de Edición** (Formulario Completo)
- Subida de logo con drag & drop
- Nombre del recinto *
- Correo de contacto * (solo lectura)
- Dirección completa *
- Selectores de Región y Ciudad * (dependientes)
- Teléfono de contacto
- Selector de deportes con checkboxes
- Opción "Otros" para deportes personalizados
- Botón "Guardar Cambios" verde
- Botón "Cancelar" en la esquina superior derecha

---

## 🗂️ Archivos Creados

### Componentes:
1. **`/components/ProfileManager.tsx`** - Componente principal que alterna entre vista y edición
2. **`/components/ProfileView.tsx`** - Vista profesional de solo lectura
3. **`/components/ProfileEditForm.tsx`** - Formulario completo de edición
4. **`/components/ImageUpload.tsx`** - Componente de subida de logo con drag & drop

### Página:
5. **`/app/dashboard/settings/page.tsx`** - Actualizada para usar ProfileManager

### Migración:
6. **`/supabase/migrations/014_add_profile_fields_admin_users.sql`** - Agrega columnas necesarias

---

## 🔧 Configuración Requerida

### 1. Ejecutar Migración SQL

Debes ejecutar la migración `014_add_profile_fields_admin_users.sql` en Supabase SQL Editor:

```sql
-- Agrega dos columnas nuevas a admin_users:
-- - logo_url (TEXT)
-- - sports_offered (TEXT[])
-- Y crea el bucket 'admin-logos' con políticas
```

**Ubicación:**
```
sportmatch-admin/supabase/migrations/014_add_profile_fields_admin_users.sql
```

### 2. Verificar Bucket de Storage

En Supabase Dashboard → Storage, verifica que existe el bucket `admin-logos`:
- Debe ser público (public: true)
- Las políticas permiten a usuarios autenticados subir/editar/eliminar sus propios logos

---

## 🎨 Deportes Predefinidos

Los deportes disponibles en el selector son:
- Fútbol
- Fútbol 5
- Fútbol 7
- Padel
- Tenis
- Básquet
- Vóleibol
- Hockey
- Otros (permite agregar deportes personalizados)

### Deportes Personalizados:
- Al seleccionar "Otros" aparece un input para agregar deportes personalizados
- Los deportes personalizados se pueden eliminar (X)
- Los deportes predefinidos no se pueden eliminar una vez seleccionados

---

## 🔄 Flujo de Usuario

### Vista Inicial (ProfileView):
1. Usuario ve su información en un diseño profesional
2. Hace clic en "Editar Perfil"
3. Cambia a modo edición

### Modo Edición (ProfileEditForm):
1. Usuario edita sus datos
2. Puede subir/cambiar/eliminar logo
3. Selecciona deportes ofrecidos
4. Hace clic en "Guardar Cambios"
5. Vuelve a vista profesional con datos actualizados

### Cancelar Edición:
- Botón "Cancelar" en la esquina superior derecha
- Descarta cambios y vuelve a vista profesional

---

## 📸 Subida de Logo

### Características:
- **Drag & Drop**: Arrastra una imagen al área punteada
- **Clic para Seleccionar**: Haz clic en el área para abrir selector de archivos
- **Formatos**: JPG, PNG, WebP
- **Tamaño máximo**: 5MB
- **Preview**: Muestra el logo en círculo grande
- **Eliminar**: Botón para quitar el logo actual

### Path en Storage:
```
admin-logos/profiles/{userId}_{timestamp}.{ext}
```

### Proceso:
1. Al subir: elimina logo anterior (si existe) y sube nuevo
2. Obtiene URL pública
3. Actualiza `admin_users.logo_url`

---

## 🔐 Seguridad

### Políticas RLS:
- Solo el admin puede ver/editar su propio perfil
- Los logos son públicos (lectura para todos)
- Solo el dueño puede subir/editar/eliminar su logo

### Validaciones:
- Nombre del recinto obligatorio
- Correo obligatorio (pero no editable)
- Dirección obligatoria
- Región y ciudad obligatorias
- Al menos 1 deporte seleccionado
- Validación de formato y tamaño de imagen

---

## 🗄️ Estructura de Base de Datos

### Tabla: `admin_users`

Columnas nuevas requeridas:
- `logo_url` (TEXT) - URL del logo en Storage
- `sports_offered` (TEXT[]) - Array de deportes

Columnas existentes usadas:
- `user_id` (UUID) - FK a auth.users
- `business_name` (TEXT) - Nombre del recinto
- `address` (TEXT) - Dirección
- `phone` (TEXT) - Teléfono
- `region_id` (INTEGER) - FK a regions
- `city_id` (INTEGER) - FK a cities

### Relaciones:
```
admin_users
  ├─→ regions (region_id)
  └─→ cities (city_id)
        └─→ regions (region_id)
              └─→ countries (country_id)
```

---

## 📱 Diseño Responsive

- **Móvil**: Columnas apiladas, botones full-width
- **Tablet**: Grid 2 columnas para tarjetas
- **Desktop**: Grid 2-3 columnas, layout optimizado

---

## 🎯 Diferencias con CanchApp

| Aspecto | CanchApp | SportMatch Admin |
|---------|----------|------------------|
| Tabla | profiles | admin_users |
| Nombre | facility_name | business_name |
| Email campo | contact_email | user.email (auth) |
| Ubicación | region, city (TEXT) | region_id, city_id (JOIN) |
| Deportes | sports_types (array) | sports_offered (array) |
| Logo bucket | profile-images | admin-logos |

---

## ✅ Checklist de Verificación

Antes de usar el sistema:

- [ ] Ejecutar migración `014_add_profile_fields_admin_users.sql`
- [ ] Verificar que existe bucket `admin-logos` en Storage
- [ ] Verificar políticas de storage para logos
- [ ] Verificar que tablas `regions` y `cities` tienen datos
- [ ] Probar navegación: Configuración → Vista → Editar → Guardar → Vista

---

## 🐛 Resolución de Problemas

### Error: "logo_url does not exist"
- Ejecuta la migración 014

### Error: "sports_offered does not exist"
- Ejecuta la migración 014

### Error al subir logo
- Verifica que el bucket `admin-logos` existe
- Verifica las políticas de storage
- Verifica que el archivo sea JPG/PNG/WebP < 5MB

### No se muestran ciudades en el selector
- Verifica que la tabla `cities` tenga datos
- Verifica que la columna `region_id` existe en cities

### El formulario no guarda
- Abre la consola del navegador para ver errores
- Verifica políticas RLS de `admin_users`
- Verifica que todos los campos obligatorios estén llenos

---

## 🚀 Próximas Mejoras

- [ ] Validación de formato de teléfono
- [ ] Geocodificación automática de dirección
- [ ] Preview de ubicación en mapa
- [ ] Más campos: horarios de atención, redes sociales
- [ ] Redimensionar imagen automáticamente a 512x512
- [ ] Crop de imagen antes de subir

---

**¡Tu sistema de perfil de recinto está listo! 🎉**
