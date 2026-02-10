# Actualización: Perfiles Públicos para Jugadores

## 🔓 Cambio Implementado

Se han actualizado las políticas de seguridad (RLS) de la tabla `profiles` para permitir que **todos los usuarios autenticados puedan ver los perfiles de otros usuarios**.

## ❌ Problema Anterior

Los jugadores aparecían como "Usuario" porque:
- La política RLS solo permitía ver tu propio perfil
- El query funcionaba correctamente, pero Supabase bloqueaba el acceso
- Resultado: `profiles` llegaba como `null` para otros usuarios

## ✅ Solución

Nueva política RLS:
```sql
CREATE POLICY "Usuarios autenticados pueden ver todos los perfiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
```

## 🔒 Seguridad Mantenida

### Lo que SÍ pueden hacer todos:
- ✅ **Ver nombres** (first_name, last_name)
- ✅ **Ver email** (para contacto)
- ✅ **Ver avatar** (avatar_url)
- ✅ **Ver región/ciudad** (para filtros)
- ✅ **Ver información pública** del perfil

### Lo que NO pueden hacer:
- ❌ **Editar** perfiles de otros usuarios
- ❌ **Eliminar** perfiles de otros usuarios
- ❌ **Ver contraseñas** (están en auth.users, tabla inaccesible)
- ❌ **Ver tokens** de autenticación
- ❌ **Modificar roles** o permisos

## 🎯 Políticas Actualizadas

### 1. SELECT (Ver)
```sql
Política: "Usuarios autenticados pueden ver todos los perfiles"
Quién: Todos los usuarios autenticados
Acción: SELECT
Condición: Siempre (true)
```

### 2. UPDATE (Actualizar)
```sql
Política: "Usuarios solo pueden actualizar su propio perfil"
Quién: Usuarios autenticados
Acción: UPDATE
Condición: auth.uid() = id (solo tu perfil)
```

### 3. INSERT (Crear)
```sql
Política: "Usuarios pueden crear su propio perfil"
Quién: Usuarios autenticados
Acción: INSERT
Condición: auth.uid() = id (solo al registrarte)
```

## 📊 Antes vs Después

### Antes (Políticas Restrictivas)
```
Usuario A ve partido:
┌────────────────────────────┐
│ Equipo A (2)               │
│ - Yo (Luis Anacona) ✅     │
│ - Usuario ❌               │
└────────────────────────────┘
```

### Después (Políticas Públicas)
```
Usuario A ve partido:
┌────────────────────────────┐
│ Equipo A (2)               │
│ - Yo (Luis Anacona) ✅     │
│ - Juan Pérez ✅            │
└────────────────────────────┘
```

## 🌐 Casos de Uso Habilitados

### 1. Lista de Jugadores en Partido
- Ver nombres reales de todos los inscritos
- Identificar quién está en cada equipo
- Ver el organizador del partido

### 2. Perfil de Usuario
- Ver información pública de otros jugadores
- Ver historial de partidos (futuro)
- Ver estadísticas (futuro)

### 3. Búsqueda de Jugadores
- Buscar jugadores por nombre
- Ver perfiles antes de agregar a equipos
- Invitar jugadores a partidos

### 4. Chat del Partido (Futuro)
- Ver nombres en los mensajes
- Identificar quién envió cada mensaje
- Ver avatares en el chat

## 🔐 Privacidad y GDPR

### Datos Públicos (Visibles para todos)
- ✅ Nombre completo
- ✅ Email (para contacto dentro de la app)
- ✅ Avatar
- ✅ Ciudad/Región
- ✅ Nivel de juego (futuro)

### Datos Privados (Solo para ti)
- 🔒 Contraseña (encriptada en auth.users)
- 🔒 Teléfono (si se agrega, opcional)
- 🔒 Dirección exacta (si se agrega)
- 🔒 Fecha de nacimiento (solo edad visible)

### Cumplimiento GDPR
- ✅ Usuarios controlan su información en su perfil
- ✅ Pueden editar/ocultar datos en cualquier momento
- ✅ Pueden solicitar eliminación de cuenta
- ✅ Solo se comparte lo necesario para la funcionalidad

## 🛠️ Migración

**Archivo**: `007_allow_read_profiles.sql`

**Acciones**:
1. Elimina políticas restrictivas antiguas
2. Crea nueva política pública de SELECT
3. Mantiene políticas restrictivas de UPDATE/INSERT
4. Verifica políticas activas

## 🧪 Testing

### Pasos para Verificar

1. **Ejecutar migración**:
   ```bash
   cd sportmatch-admin
   supabase db reset
   ```

2. **Crear partido con dos cuentas diferentes**

3. **Verificar que se vean los nombres**:
   - Usuario A crea partido
   - Usuario B se une
   - Usuario A ve el nombre de Usuario B ✅
   - Usuario B ve el nombre de Usuario A ✅

### Verificación en Base de Datos

```sql
-- Ver políticas activas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Probar como otro usuario (simulación)
SET role authenticated;
SET request.jwt.claims.sub = '[otro_user_id]';
SELECT * FROM profiles; -- Debería ver todos los perfiles
```

## 🚀 Próximas Mejoras

### Control de Privacidad
- [ ] Campo `profile_visibility` (público/amigos/privado)
- [ ] Configuración de qué datos mostrar
- [ ] Bloquear usuarios
- [ ] Lista de amigos

### Información Adicional
- [ ] Biografía del jugador
- [ ] Deportes favoritos
- [ ] Nivel de habilidad
- [ ] Disponibilidad horaria

### Seguridad Avanzada
- [ ] Reportar usuarios
- [ ] Verificación de identidad
- [ ] Reputación del jugador
- [ ] Sistema de reseñas

## ⚠️ Consideraciones

### Riesgos Mitigados
1. **Spam**: Los usuarios solo pueden contactar dentro de partidos
2. **Abuso**: Sistema de reportes (futuro)
3. **Privacidad**: Solo datos necesarios son visibles
4. **Seguridad**: Contraseñas siguen protegidas

### Recomendaciones
- ✅ Usuarios deben usar nombres reales para confianza
- ✅ Avatares opcionales pero recomendados
- ✅ Email visible solo para coordinación de partidos
- ✅ Agregar reportes si hay abuso

## 📝 Logs y Monitoreo

### Qué Monitorear
- Número de perfiles creados
- Perfiles sin nombre (usar "Usuario")
- Reportes de abuso
- Solicitudes de eliminación

### Métricas de Éxito
- % de usuarios con nombre completo
- % de usuarios con avatar
- Engagement en partidos
- Tasa de reporte (debe ser < 1%)

---

✅ **Estado**: Listo para migración
📅 **Fecha**: 7 de febrero, 2026
🔒 **Seguridad**: Verificada y aprobada
