# Changelog - SportMatch

## [1.1.0] - Actualización Mayor

### ✨ Nuevas Características

#### Sistema de Ubicación
- ✅ Agregadas tablas de países, regiones y ciudades
- ✅ Datos de Chile precargados (16 regiones, 80+ ciudades)
- ✅ Selectores en cascada en el perfil del usuario
- ✅ Servicio `locationService` para gestionar ubicaciones

#### Perfil Extendido
- ✅ Campos adicionales en el perfil:
  - `first_name` y `last_name` (reemplaza `full_name`)
  - `gender` (masculino, femenino, otro)
  - `birth_date` (fecha de nacimiento)
  - `country_id`, `region_id`, `city_id` (ubicación)
  - `premiumstatus` (estado premium)
  - `premiumfinalizedat` (fecha de finalización premium)
  - `extra_matches_balance` (balance de matches extras)
  - `team_creation_tokens` (tokens para crear equipos)

#### Componentes Nuevos
- ✅ `Select.tsx`: Componente dropdown con modal
- ✅ Integración de selects en el formulario de perfil
- ✅ Badge de usuario premium

### 🔧 Mejoras

#### Base de Datos
- ✅ Índices agregados para mejor rendimiento
- ✅ Trigger para `updated_at` automático
- ✅ Función mejorada para crear perfiles con first_name/last_name
- ✅ RLS habilitado en todas las tablas

#### Interfaz
- ✅ Formulario de perfil expandido
- ✅ Visualización de ubicación en perfil
- ✅ Badge visual para usuarios premium
- ✅ Mejor organización de campos en el perfil

### 📝 Archivos Modificados

**Nuevos:**
- `services/location.service.ts`
- `components/Select.tsx`
- `CHANGELOG.md`

**Actualizados:**
- `primerabd.sql` - Schema completo de BD
- `types/index.ts` - Tipos actualizados
- `services/auth.service.ts` - UserProfile actualizado
- `app/(tabs)/profile.tsx` - Campos adicionales
- `contexts/AuthContext.tsx` - Manejo de nombres
- `README.md` - Documentación actualizada

### 🗄️ Migración de Datos

Si ya tienes datos en producción:

```sql
-- Migrar full_name a first_name y last_name
UPDATE profiles 
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = substring(full_name from position(' ' in full_name) + 1)
WHERE full_name IS NOT NULL;

-- Agregar columnas si no existen
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id),
ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
```

### 📦 Dependencias

No se agregaron nuevas dependencias en esta versión.

### 🚀 Próximas Características

- [ ] Sistema de equipos
- [ ] Sistema de matches
- [ ] Chat en tiempo real
- [ ] Notificaciones push
- [ ] Búsqueda por ubicación
- [ ] Filtros avanzados

### 🐛 Correcciones

- Ninguna (primera versión mayor)

---

## [1.0.0] - Versión Inicial

### ✨ Características Iniciales

- ✅ Autenticación con email/contraseña
- ✅ Social Auth (Google/Apple)
- ✅ Autenticación biométrica
- ✅ Persistencia de sesión
- ✅ Onboarding interactivo
- ✅ Perfil de usuario
- ✅ Edición de avatar
- ✅ Configuración de la app
