# 🚀 Guía Rápida: Sistema de Estados de Partido

## ✅ ¿Qué se implementó?

Se ha implementado un sistema completo de estados para los partidos con 5 estados:

1. **✅ OPEN** (Abierto) - Acepta inscripciones
2. **🔒 FULL** (Lleno) - Cupos completos
3. **✔️ CONFIRMED** (Confirmado) - Partido confirmado por organizador
4. **❌ CANCELLED** (Cancelado) - Partido cancelado
5. **📝 DRAFT** (Borrador) - Para implementación futura

## 🔄 Transiciones Automáticas

El sistema actualiza el estado automáticamente cuando:

- Un jugador se une y se llena → `open` → `full`
- Un jugador sale de un partido lleno → `full` → `open`

## 📋 Para Empezar

### 1. Ejecutar la Migración

```bash
cd sportmatch-admin
supabase db reset
```

O manualmente:

```bash
cd sportmatch-admin
supabase db push
```

### 2. Verificar Implementación

Ejecuta el script de verificación:

```bash
supabase db query < test_match_status_system.sql
```

Deberías ver:
- ✅ 2 triggers creados
- ✅ 4 índices creados
- ✅ 4 funciones creadas
- ✅ Tests automáticos pasando

### 3. Probar en la App

#### Como Organizador:

1. **Crear un partido**
   - El estado inicial es `open`
   - Aparecerá en la lista para otros jugadores

2. **Confirmar partido**
   - Cuando tengas suficientes jugadores
   - Presiona botón "Confirmar" (azul)
   - Los jugadores no podrán salir después

3. **Cancelar partido**
   - Si necesitas cancelar
   - Presiona botón "Cancelar" (rojo)
   - El partido desaparece de las listas

#### Como Jugador:

1. **Ver partidos disponibles**
   - Solo verás partidos `open` y `full`
   - Badge "🔒 Lleno" indica sin cupos

2. **Unirte a partido**
   - Solo partidos `open` con cupos
   - Si es modo "Selección", elige tu equipo

3. **Salir de partido**
   - Antes de que sea confirmado
   - Después de confirmado NO puedes salir

## 📱 UI/UX Implementada

### En Lista de Partidos (`join.tsx`)

```
┌─────────────────────────────────────┐
│ ⚽ Fútbol  🎯 Selección  👫         │ ← Chips
│ 🔒 Lleno                            │ ← Badge (solo si lleno)
│                                     │
│ Partido de la Tarde                 │
│ Jugamos en el complejo deportivo   │
│                                     │
│ 🕒 Hoy 18:00                        │
│ 📍 Complejo Central, Santiago       │
│ 👥 8/10 jugadores                   │
└─────────────────────────────────────┘
```

### En Detalle de Partido (`[id].tsx`)

#### Vista de Jugador:
```
┌─────────────────────────────────────┐
│ Información                          │
│ ✅ Estado: Abierto                  │ ← Card de estado
│ ...                                  │
│                                     │
│ [ Unirme al Partido ]               │ ← Botón (si open)
└─────────────────────────────────────┘
```

#### Vista de Organizador:
```
┌─────────────────────────────────────┐
│ Información                          │
│ 🔒 Estado: Lleno                    │
│ ...                                  │
│                                     │
│ [ Confirmar ] [ Cancelar ]          │ ← Botones
└─────────────────────────────────────┘
```

#### Partido Cancelado:
```
┌─────────────────────────────────────┐
│ ❌ Este partido ha sido cancelado   │ ← Banner
└─────────────────────────────────────┘
```

## 🎨 Códigos de Color

| Estado | Color | Icono |
|--------|-------|-------|
| open | Verde `#10B981` | ✅ |
| full | Amarillo `#F59E0B` | 🔒 |
| confirmed | Azul `#3B82F6` | ✔️ |
| cancelled | Rojo `#EF4444` | ❌ |

## 🧪 Casos de Prueba

### ✅ Test 1: Llenar Partido
1. Crear partido (max 4 jugadores)
2. Estado: `open` ✅
3. Unir 3 usuarios más (4 total)
4. Estado cambia automáticamente a `full` 🔒
5. Botón "Unirme" deshabilitado

### ✅ Test 2: Jugador Sale
1. Partido lleno (4/4)
2. Estado: `full` 🔒
3. Un jugador sale (3/4)
4. Estado cambia automáticamente a `open` ✅
5. Botón "Unirme" habilitado de nuevo

### ✅ Test 3: Confirmar Partido
1. Organizador presiona "Confirmar"
2. Estado: `confirmed` ✔️
3. Jugadores NO pueden salir
4. Nuevos NO pueden unirse

### ✅ Test 4: Cancelar Partido
1. Organizador presiona "Cancelar"
2. Confirma en alert destructivo
3. Estado: `cancelled` ❌
4. Partido desaparece de lista `join`
5. Banner rojo en vista de detalle

## 📊 Consultas Útiles

### Ver Estados de Todos los Partidos
```sql
SELECT 
  title,
  status,
  max_players,
  (SELECT COUNT(*) FROM match_players WHERE match_id = matches.id) as jugadores_actuales,
  datetime
FROM matches
ORDER BY datetime DESC
LIMIT 10;
```

### Ver Distribución de Estados
```sql
SELECT 
  status,
  COUNT(*) as cantidad
FROM matches
GROUP BY status
ORDER BY cantidad DESC;
```

### Partidos por Llenar
```sql
SELECT 
  m.title,
  m.max_players,
  COUNT(mp.id) as jugadores_actuales,
  m.max_players - COUNT(mp.id) as cupos_disponibles
FROM matches m
LEFT JOIN match_players mp ON mp.match_id = m.id
WHERE m.status = 'open'
GROUP BY m.id, m.title, m.max_players
HAVING COUNT(mp.id) < m.max_players
ORDER BY cupos_disponibles ASC;
```

## 🔧 Solución de Problemas

### Estado no se actualiza automáticamente

**Problema**: Agregaste un jugador pero el estado sigue en `open` cuando debería ser `full`

**Solución**:
```sql
-- Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'match_players';

-- Si no existen, ejecutar migración:
\i 008_match_status_system.sql
```

### Jugador puede salir de partido confirmado

**Problema**: El frontend permite salir después de confirmar

**Solución**: Verificar que tienes la última versión de `[id].tsx` con validaciones:
```typescript
if (match.status === 'confirmed') {
  Alert.alert('Partido Confirmado', 'No puedes salir...');
  return;
}
```

### Partidos cancelados aparecen en lista

**Problema**: Los partidos cancelados se muestran en `join.tsx`

**Solución**: Verificar filtro en `applyFilters()`:
```typescript
filtered = filtered.filter(match => match.status !== 'cancelled');
```

## 📂 Archivos Creados/Modificados

### Nuevos:
- `008_match_status_system.sql` - Migración principal
- `test_match_status_system.sql` - Tests automáticos
- `SISTEMA_ESTADOS_PARTIDO.md` - Documentación completa
- `GUIA_RAPIDA_ESTADOS.md` - Este archivo

### Modificados:
- `create.tsx` - Estado inicial 'open'
- `[id].tsx` - UI de estados + validaciones + botones organizador
- `join.tsx` - Filtros + badges de estado

## 🚀 Próximos Pasos

### Implementación Futura

1. **Notificaciones**
   - Notificar cuando partido se llena
   - Notificar cuando organizador confirma
   - Recordatorios 1h antes del partido

2. **Estado Draft**
   - Crear partido sin publicar
   - Editar antes de publicar
   - Publicar cuando esté listo

3. **Lista de Espera**
   - Para partidos llenos
   - Auto-notificar cuando hay cupo

4. **Reprogramar**
   - En lugar de cancelar
   - Mantener jugadores inscritos
   - Nueva fecha/hora

5. **Historial**
   - Ver partidos cancelados
   - Ver razón de cancelación
   - Estadísticas de confirmación

## 💡 Tips

### Para Organizadores:
- ✅ Confirma solo cuando estés seguro
- ✅ Comunica con tiempo si vas a cancelar
- ✅ Si < 4 jugadores, espera más antes de confirmar
- ✅ Los jugadores NO pueden salir después de confirmar

### Para Jugadores:
- ✅ Únete solo si estás seguro de ir
- ✅ Sal con tiempo si no puedes ir
- ⚠️ Después de confirmado NO puedes salir
- ℹ️ Los badges te indican disponibilidad

## 📞 Soporte

### Si algo no funciona:

1. **Ejecutar migración**:
   ```bash
   cd sportmatch-admin
   supabase db reset
   ```

2. **Verificar triggers**:
   ```bash
   supabase db query < test_match_status_system.sql
   ```

3. **Ver logs**:
   - Expo: `npx expo start`
   - Supabase: Dashboard → Logs

4. **Reiniciar app**:
   - Cerrar completamente
   - Limpiar caché: `npx expo start -c`

---

✅ **Sistema Listo para Usar**

El sistema de estados está 100% funcional. Ejecuta la migración y empieza a probar! 🚀
