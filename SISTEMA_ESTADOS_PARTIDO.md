# Sistema de Estados de Partido - Documentación Completa

## 📊 Estados Implementados

### 1. 📝 DRAFT (Borrador)
**Descripción**: Partido creado pero no publicado

**Características**:
- No visible en listados públicos
- Solo visible para el organizador
- Se puede editar libremente
- Uso: Preparar partido antes de publicar

**Transiciones**:
- `draft` → `open` (Publicar)

### 2. ✅ OPEN (Abierto)
**Descripción**: Partido abierto para inscripciones

**Características**:
- Visible en listados
- Los jugadores pueden unirse
- Los jugadores pueden salir
- Estado predeterminado al crear partido
- **Cambio automático**: Cuando hay cupos disponibles (< max_players)

**Transiciones**:
- `open` → `full` (Automático: cuando se llena)
- `open` → `confirmed` (Manual: organizador confirma)
- `open` → `cancelled` (Manual: organizador cancela)

### 3. 🔒 FULL (Lleno)
**Descripción**: Cupos completos

**Características**:
- Visible en listados
- No se pueden unir nuevos jugadores
- Los inscritos pueden salir
- **Cambio automático**: Cuando jugadores >= max_players
- Vuelve a `open` si alguien sale

**Transiciones**:
- `full` → `open` (Automático: cuando alguien sale)
- `full` → `confirmed` (Manual: organizador confirma)
- `full` → `cancelled` (Manual: organizador cancela)

### 4. ✔️ CONFIRMED (Confirmado)
**Descripción**: Partido confirmado por organizador

**Características**:
- Visible en listados
- **NO se pueden unir** nuevos jugadores
- **NO se pueden salir** jugadores
- Los equipos están cerrados
- Listo para jugarse
- **Cambio manual**: Solo organizador

**Transiciones**:
- `confirmed` → `finished` (Manual: organizador finaliza)
- `confirmed` → `finished` (Automático: 3h después de datetime)
- `confirmed` → `cancelled` (Manual: organizador cancela - excepcional)

### 5. 🏆 FINISHED (Finalizado)
**Descripción**: Partido terminado y jugado

**Características**:
- Visible en historial de jugadores
- Puede tener resultados (scores, ganador, MVP)
- **NO se pueden unir** nuevos jugadores
- **NO se pueden salir** jugadores
- Cuenta para estadísticas
- No visible en lista principal (solo historial)
- **Cambio manual**: Solo organizador
- **Cambio automático**: 3h después de datetime si está confirmed

**Transiciones**:
- `finished` → `confirmed` (Excepcional: reabrir con función especial)

### 6. ❌ CANCELLED (Cancelado)
**Descripción**: Partido cancelado

**Características**:
- **NO visible** en listados activos
- Visible en historial (futuro)
- No se puede unir ni salir
- Estado final (no reversible)
- **Cambio manual**: Solo organizador

**Transiciones**:
- Ninguna (estado final)

## 🔄 Diagrama de Transiciones

```
      CREATE
         ↓
    [DRAFT] ────────→ (opcional, futuro)
         ↓
      [OPEN] ←──────────┐
         ↓              │
    jugadores++    jugadores--
         ↓              │
      [FULL] ──────────┘
         ↓
   Organizador confirma
         ↓
   [CONFIRMED]
         ↓
   Organizador finaliza (manual)
   O auto-finaliza después de 3h
         ↓
    [FINISHED] 🏆
         ↓
   Historial y Estadísticas

   Desde OPEN o FULL:
      organizador cancela
         ↓
   [CANCELLED]
```

## 🤖 Automatización Implementada

### Triggers en Base de Datos

#### 1. `trigger_match_status_on_player_change`
**Evento**: Después de INSERT o DELETE en `match_players`

**Lógica**:
```
SI jugador se une:
  SI estado = 'open' Y jugadores >= max_players:
    → Cambiar a 'full'

SI jugador sale:
  SI estado = 'full' Y jugadores < max_players:
    → Cambiar a 'open'
```

#### 2. `trigger_update_match_status`
**Evento**: Antes de UPDATE en `max_players` de `matches`

**Lógica**:
```
SI se cambia max_players:
  SI jugadores >= nuevo_max_players:
    → 'full'
  SI jugadores < nuevo_max_players:
    → 'open'
```

## 🎯 Lógica en React Native

### Vista de Detalle (`[id].tsx`)

#### Para Jugadores (No Organizadores)

**Estado `open`**:
- ✅ Botón "Unirme al Partido" habilitado
- ✅ Modal de selección de equipo (si es modo selection)
- ✅ Botón "Salir del Partido" si ya está inscrito

**Estado `full`**:
- ⚠️ Botón "Partido Lleno" deshabilitado
- ✅ Botón "Salir del Partido" si ya está inscrito

**Estado `confirmed`**:
- 🔒 No se puede unir
- 🔒 No se puede salir
- ℹ️ Mensaje: "Partido confirmado, no acepta cambios"

**Estado `cancelled`**:
- ❌ Banner rojo: "Este partido ha sido cancelado"
- ❌ No se puede unir ni salir

#### Para Organizadores

**Estado `open` o `full`**:
- ✅ Botón "Confirmar" (azul)
- ⚠️ Botón "Cancelar" (rojo)
- ℹ️ Si < 4 jugadores: Advertencia al confirmar

**Estado `confirmed`**:
- ✅ Badge "Partido Confirmado" (no editable)
- Opcionalmente puede cancelar (excepcional)

**Estado `cancelled`**:
- ❌ Banner rojo: "Este partido ha sido cancelado"

### Vista de Lista (`join.tsx`)

**Filtrado**:
- ❌ Partidos `cancelled` NO se muestran

**Badges visibles**:
- 🔒 "Lleno" (amarillo) - cuando status = 'full'
- ✔️ "Confirmado" (azul) - cuando status = 'confirmed'
- Nada cuando status = 'open' (es el estado normal)

## 🎨 UI/UX

### Colores por Estado

| Estado | Color | Icono |
|--------|-------|-------|
| draft | Gris | 📝 |
| open | Verde `#10B981` | ✅ |
| full | Amarillo `#F59E0B` | 🔒 |
| confirmed | Azul `#3B82F6` | ✔️ |
| finished | Verde Oscuro `#059669` | 🏆 |
| cancelled | Rojo `#EF4444` | ❌ |

### Botones de Organizador

```
┌─────────────────────────────────────┐
│  ✓ Confirmar   │   ✗ Cancelar      │
│     (Azul)     │     (Rojo)         │
└─────────────────────────────────────┘
```

### Card de Estado en Detalle

```
┌────────────────────────────────┐
│ ✅ Estado                      │
│    ✅ Abierto                  │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 🔒 Estado                      │
│    🔒 Lleno                    │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ✔️ Estado                      │
│    ✔️ Confirmado               │
└────────────────────────────────┘
```

## 💻 Funciones Implementadas

### `handleConfirmMatch()`
```typescript
// Validaciones:
- Estado no sea 'confirmed' o 'cancelled'
- Advertencia si < 4 jugadores
- Solo organizador puede ejecutar

// Acción:
- UPDATE matches SET status = 'confirmed'
- Alert de confirmación
- Recargar partido
```

### `handleCancelMatch()`
```typescript
// Validaciones:
- Estado no sea 'cancelled'
- Confirmación del usuario (destructive)
- Solo organizador puede ejecutar

// Acción:
- UPDATE matches SET status = 'cancelled'
- Alert de cancelación
- Recargar partido
```

### `handleJoinMatch()`
```typescript
// Validaciones agregadas:
- Estado = 'cancelled' → Alert y return
- Estado = 'confirmed' → Alert y return
- Estado != 'open' || 'full' → Alert y return

// Si todo OK:
- Continuar con lógica normal de unirse
```

### `handleLeaveMatch()`
```typescript
// Validaciones agregadas:
- Estado = 'confirmed' → Alert y return
- Estado = 'cancelled' → Alert y return

// Si todo OK:
- Continuar con lógica normal de salir
```

## 🗄️ Base de Datos

### Funciones SQL Auxiliares

#### `confirm_match(match_uuid, user_uuid)`
```sql
-- Confirmar partido (solo organizador)
SELECT confirm_match(
  '550e8400-e29b-41d4-a716-446655440000',
  'user-uuid-here'
);
```

#### `cancel_match(match_uuid, user_uuid)`
```sql
-- Cancelar partido (solo organizador)
SELECT cancel_match(
  '550e8400-e29b-41d4-a716-446655440000',
  'user-uuid-here'
);
```

### Índices Creados

```sql
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_status_datetime ON matches(status, datetime);
```

**Beneficios**:
- Consultas rápidas por estado
- Filtrado eficiente en listas
- Ordenamiento optimizado

## 🧪 Testing

### Caso 1: Crear y Llenar Partido

```
1. Crear partido (modo Selection, max 4 jugadores)
   → Estado: 'open' ✅
   
2. Usuario B se une
   → Estado: 'open' ✅
   → Jugadores: 2/4
   
3. Usuario C se une
   → Estado: 'open' ✅
   → Jugadores: 3/4
   
4. Usuario D se une
   → Estado: 'full' 🔒 (AUTOMÁTICO)
   → Jugadores: 4/4
   → Botón "Unirme" deshabilitado
   
5. Usuario B sale
   → Estado: 'open' ✅ (AUTOMÁTICO)
   → Jugadores: 3/4
   → Botón "Unirme" habilitado
```

### Caso 2: Confirmar Partido

```
1. Organizador ve partido con 4 jugadores
   → Estado: 'full' 🔒
   
2. Organizador presiona "Confirmar"
   → Alert de confirmación
   → Estado: 'confirmed' ✔️
   
3. Jugadores intentan salir
   → Alert: "No puedes salir de partido confirmado"
   → No pueden salir
   
4. Nuevos jugadores intentan unirse
   → Alert: "Partido confirmado, no acepta más jugadores"
   → No pueden unirse
```

### Caso 3: Cancelar Partido

```
1. Organizador decide cancelar
   
2. Presiona "Cancelar"
   → Alert: "¿Estás seguro? No se puede deshacer"
   
3. Confirma cancelación
   → Estado: 'cancelled' ❌
   → Partido desaparece de listados
   → Banner rojo en detalle
   
4. Jugadores que tenían la vista abierta
   → Al refrescar: "Este partido ha sido cancelado"
```

### Caso 4: Partido con Pocos Jugadores

```
1. Organizador crea partido
   → Jugadores: 1/10 (solo él)
   
2. Organizador intenta confirmar
   → Alert: "Se recomienda al menos 4 jugadores"
   → Opción: "Confirmar de todas formas" o "Cancelar"
   
3. Si confirma con pocos jugadores
   → Estado: 'confirmed' ✔️
   → Partido confirmado con 1 jugador
```

## 📱 Experiencia de Usuario

### Como Organizador

#### Flujo Normal
1. Crear partido → `open`
2. Esperar jugadores
3. Cuando hay suficientes → "Confirmar"
4. Partido confirmado → `confirmed`
5. Jugar

#### Si Necesita Cancelar
1. Ver partido
2. Presionar "Cancelar"
3. Confirmar cancelación
4. Partido cancelado → `cancelled`

### Como Jugador

#### Unirse a Partido Abierto
1. Ver lista (solo partidos `open` y `full`)
2. Elegir partido con cupos
3. Unirse (modal si es selection)
4. Esperar confirmación del organizador

#### Si Partido se Llena
1. Ver badge "🔒 Lleno" en lista
2. No poder unirse
3. Si alguien sale → Badge desaparece
4. Poder unirse de nuevo

#### Si Partido se Confirma
1. Recibir notificación (futuro)
2. No poder salir
3. Ver badge "✔️ Confirmado"
4. Prepararse para jugar

## 🚀 Mejoras Futuras

### Notificaciones
- [ ] Notificar cuando partido se llena
- [ ] Notificar cuando organizador confirma
- [ ] Notificar si partido se cancela
- [ ] Recordatorio 1 hora antes del partido

### Estados Adicionales
- [ ] `draft` - Implementar publicación manual
- [ ] `in_progress` - Partido en curso
- [ ] `finished` - Partido terminado
- [ ] `rescheduled` - Reprogramado

### Automatizaciones
- [ ] Auto-cancelar partidos sin jugadores después de 24h
- [ ] Auto-confirmar si está lleno y faltan < 2h
- [ ] Auto-marcar como 'finished' después de la hora programada
- [ ] Recordatorios automáticos

### Mejoras UX
- [ ] Historial de cambios de estado
- [ ] Razón de cancelación (campo de texto)
- [ ] Reprogramar en lugar de cancelar
- [ ] Lista de espera para partidos llenos

## 📝 Archivos Modificados

1. **`008_match_status_system.sql`** (NUEVO)
   - Función `update_match_status()`
   - Función `update_match_status_on_player_change()`
   - Función `confirm_match()`
   - Función `cancel_match()`
   - Triggers automáticos
   - Políticas de seguridad

2. **`sportmatch/app/(tabs)/match/create.tsx`**
   - Estado inicial: `'open'` en lugar de `'pending'`

3. **`sportmatch/app/(tabs)/match/[id].tsx`**
   - Card de estado con colores
   - Validaciones en `handleJoinMatch()`
   - Validaciones en `handleLeaveMatch()`
   - Funciones: `handleConfirmMatch()`, `handleCancelMatch()`
   - Botones de organizador (Confirmar/Cancelar)
   - Banner de partido cancelado
   - Estilos para estados

4. **`sportmatch/app/(tabs)/match/join.tsx`**
   - Filtrar partidos cancelados
   - Badges de estado en cards
   - Estilos para badges

## 🧪 Comandos de Prueba

### Ejecutar Migración
```bash
cd sportmatch-admin
supabase db reset
```

### Verificar Estados en BD
```sql
-- Ver distribución de estados
SELECT 
  status,
  COUNT(*) as cantidad
FROM matches
GROUP BY status;

-- Ver triggers
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('matches', 'match_players');
```

### Probar Transiciones Automáticas
```sql
-- Ver estado actual de un partido
SELECT id, title, status, max_players FROM matches WHERE id = '[uuid]';

-- Ver jugadores
SELECT COUNT(*) FROM match_players WHERE match_id = '[uuid]';

-- Simular jugador uniéndose
INSERT INTO match_players (match_id, player_id, team)
VALUES ('[match-uuid]', '[player-uuid]', 'A');

-- Verificar cambio automático de estado
SELECT status FROM matches WHERE id = '[uuid]';
-- Debería cambiar a 'full' si se llenó
```

## ⚠️ Consideraciones Importantes

### 1. Partidos Confirmados
- Los jugadores NO pueden salir
- Organizador debe comunicar bien antes de confirmar
- Considerar tiempo de gracia antes de confirmar (ej: 2h antes del partido)

### 2. Partidos Cancelados
- No son reversibles
- Considerar implementar "Reprogramar" en lugar de cancelar
- Notificar a todos los jugadores

### 3. Auto-transiciones
- Los triggers son SÍNCRONOS
- El estado se actualiza inmediatamente en BD
- El frontend debe recargar para ver cambios

### 4. Rendimiento
- Los índices optimizan las consultas
- Los triggers son eficientes (solo cuando necesario)
- Considerar cache en frontend si hay muchos usuarios

## 📊 Métricas y Monitoreo

### KPIs a Monitorear
```sql
-- Tasa de confirmación
SELECT 
  ROUND(COUNT(CASE WHEN status = 'confirmed' THEN 1 END) * 100.0 / COUNT(*), 2) as tasa_confirmacion
FROM matches
WHERE created_at > NOW() - INTERVAL '30 days';

-- Tasa de cancelación
SELECT 
  ROUND(COUNT(CASE WHEN status = 'cancelled' THEN 1 END) * 100.0 / COUNT(*), 2) as tasa_cancelacion
FROM matches
WHERE created_at > NOW() - INTERVAL '30 days';

-- Partidos que se llenan
SELECT 
  ROUND(COUNT(CASE WHEN status IN ('full', 'confirmed') THEN 1 END) * 100.0 / COUNT(*), 2) as tasa_llenado
FROM matches
WHERE created_at > NOW() - INTERVAL '30 days';

-- Tiempo promedio hasta llenarse
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as horas_promedio
FROM matches
WHERE status IN ('full', 'confirmed')
  AND created_at > NOW() - INTERVAL '30 days';
```

## 🎯 Resumen Ejecutivo

### ✅ Implementado
- [x] 5 estados de partido (draft, open, full, confirmed, cancelled)
- [x] Transiciones automáticas (open ↔ full)
- [x] Transiciones manuales (confirm, cancel)
- [x] Triggers en base de datos
- [x] Validaciones en frontend
- [x] UI con colores y badges
- [x] Botones de organizador
- [x] Filtrado de partidos cancelados

### 🚧 Pendiente (Opcionales)
- [ ] Estado 'draft' con publicación manual
- [ ] Notificaciones de cambios de estado
- [ ] Historial de cambios
- [ ] Reprogramar partidos
- [ ] Lista de espera
- [ ] Auto-cancelar partidos viejos

---

✅ **Estado**: Totalmente implementado
📅 **Fecha**: 7 de febrero, 2026
🔄 **Versión**: 1.0.0
