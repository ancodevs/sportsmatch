# 🏆 Estado FINISHED - Documentación

## 📋 Descripción General

El estado **FINISHED** (Finalizado) se implementó para marcar partidos que ya terminaron y registrarlos en el historial de jugadores y estadísticas del sistema.

---

## 🎯 Características

### Estado FINISHED

**Descripción**: Partido terminado y jugado

**Características**:
- ✅ Visible en historial de partidos
- ✅ Puede registrar resultados (scores, ganador, MVP)
- ❌ Los jugadores NO pueden unirse
- ❌ Los jugadores NO pueden salir
- ✅ Cuenta para estadísticas de jugadores
- ✅ Visible en perfil de jugador

**Transiciones**:
- `confirmed` → `finished` (Manual: organizador marca como finalizado)
- `confirmed` → `finished` (Automático: 3h después de la hora programada)
- `finished` → `confirmed` (Excepcional: reabrir partido con función especial)

---

## 🔄 Diagrama de Transiciones Actualizado

```
      CREATE
         ↓
    [DRAFT] (futuro)
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
   O auto-finaliza (3h después)
         ↓
    [FINISHED] 🏆
         ↓
   Historial y Estadísticas

   Desde OPEN/FULL/CONFIRMED:
      organizador cancela
         ↓
   [CANCELLED]
```

---

## 💻 Funciones SQL Implementadas

### 1. `finish_match()`

Permite al organizador finalizar manualmente el partido con resultados opcionales.

```sql
SELECT finish_match(
  '[match-uuid]'::UUID,      -- ID del partido
  '[user-uuid]'::UUID,        -- ID del organizador
  5,                          -- Score equipo A (opcional)
  3,                          -- Score equipo B (opcional)
  'A',                        -- Equipo ganador (opcional)
  '[mvp-uuid]'::UUID          -- MVP del partido (opcional)
);
```

**Validaciones**:
- ✅ Solo el organizador puede ejecutar
- ✅ Solo partidos `confirmed` pueden finalizarse
- ✅ Registra scores, ganador y MVP si se proporcionan

### 2. `auto_finish_past_matches()`

Finaliza automáticamente partidos confirmados cuya fecha ya pasó (más de 3 horas).

```sql
-- Ejecutar en cron job (cada hora)
SELECT auto_finish_past_matches();
-- Retorna: Número de partidos finalizados
```

**Uso**: 
- Ejecutar como cron job cada hora
- O como Edge Function de Supabase
- O trigger temporal en la base de datos

### 3. `reopen_finished_match()`

Reabre un partido finalizado (excepcional, solo organizador).

```sql
SELECT reopen_finished_match(
  '[match-uuid]'::UUID,
  '[user-uuid]'::UUID
);
```

**Uso**: Solo para correcciones excepcionales

### 4. `get_player_match_history()`

Obtiene el historial de partidos finalizados de un jugador.

```sql
SELECT * FROM get_player_match_history(
  '[player-uuid]'::UUID,
  10,  -- límite
  0    -- offset
);
```

**Retorna**:
- Match ID, título, fecha
- Equipo del jugador
- Scores y ganador
- Si fue capitán
- Si fue MVP

### 5. `get_player_stats()`

Calcula estadísticas de un jugador.

```sql
SELECT * FROM get_player_stats('[player-uuid]'::UUID);
```

**Retorna**:
- Total de partidos
- Partidos ganados/perdidos
- Veces MVP
- Veces capitán
- Total de goles
- Tasa de victorias (%)

---

## 📱 UI/UX Implementada

### Card de Estado

```
┌────────────────────────────────┐
│ 🏆 Estado                      │
│    🏆 Finalizado               │
└────────────────────────────────┘
```

### Badge en Lista

```
(Los partidos finalizados NO aparecen en lista principal)
(Solo en historial/perfil de jugador)
```

### Banner en Detalle

```
┌─────────────────────────────────────┐
│  🏆  Este partido ha finalizado     │
└─────────────────────────────────────┘
```

### Botón de Organizador

Cuando el partido está `confirmed`:

```
┌─────────────────────────────────────┐
│  🏆 Finalizar   │   ✗ Cancelar      │
│     (Verde)     │     (Rojo)         │
└─────────────────────────────────────┘
```

---

## 🎨 Colores

| Estado | Color | Hex | Icono |
|--------|-------|-----|-------|
| finished | Verde Oscuro | `#059669` | 🏆 |

---

## 🧪 Casos de Uso

### Caso 1: Finalizar Manualmente

```
1. Partido se juega
2. Organizador entra a la app
3. Ve botón "Finalizar"
4. Presiona y confirma
5. Estado: finished 🏆
6. Partido aparece en historial
```

### Caso 2: Auto-Finalizar

```
1. Partido confirmado (18:00)
2. Pasan 3 horas (21:00)
3. Cron job ejecuta auto_finish_past_matches()
4. Estado: finished 🏆 (automático)
5. Partido en historial
```

### Caso 3: Ver Historial

```
1. Jugador va a su perfil
2. Ve sección "Historial"
3. Lista de partidos finalizados
4. Estadísticas:
   - Partidos jugados: 25
   - Victorias: 18 (72%)
   - MVP: 5 veces
```

---

## 🗄️ Vista de Estadísticas

### `finished_matches_stats`

Vista SQL para consultar partidos finalizados con datos completos.

```sql
SELECT * FROM finished_matches_stats
ORDER BY datetime DESC
LIMIT 10;
```

**Campos**:
- ID, título, fecha
- Tipo de partido
- Scores y ganador
- MVP (nombre completo)
- Organizador (nombre completo)
- Total de jugadores
- Fechas de creación/actualización

---

## 📊 Ejemplo de Estadísticas

### Perfil de Jugador

```
┌─────────────────────────────────────┐
│  👤 Juan Pérez                      │
├─────────────────────────────────────┤
│  📊 Estadísticas                    │
│                                     │
│  ⚽ Partidos Jugados:    25         │
│  🏆 Victorias:           18 (72%)   │
│  😔 Derrotas:            7          │
│  ⭐ MVP:                 5 veces    │
│  👨‍✈️ Capitán:            12 veces   │
│  ⚽ Goles:                48         │
│                                     │
├─────────────────────────────────────┤
│  📜 Historial Reciente              │
│                                     │
│  🏆 Partido de la Tarde             │
│     Equipo A (5-3) - Ganador       │
│     15 Ene 2026 · MVP              │
│                                     │
│  🏆 Amistoso Sábado                 │
│     Equipo B (2-4)                 │
│     10 Ene 2026                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### Finalizar Partido Manualmente

```
Organizador presiona "Finalizar"
         ↓
Frontend: Validaciones locales
         ↓
Alert de confirmación
         ↓
Usuario confirma
         ↓
Frontend: supabase.from('matches').update({ status: 'finished' })
         ↓
PostgreSQL: UPDATE matches SET status = 'finished'
         ↓
Frontend: loadMatchDetail()
         ↓
UI: Banner "🏆 Partido Finalizado"
```

### Auto-Finalizar (Cron Job)

```
Cron Job (cada hora)
         ↓
Ejecutar: auto_finish_past_matches()
         ↓
PostgreSQL: 
  SELECT matches WHERE status = 'confirmed'
    AND datetime < NOW() - INTERVAL '3 hours'
         ↓
  UPDATE matches SET status = 'finished'
         ↓
Retornar: Número de partidos actualizados
         ↓
Log: "Auto-finalizados: 5 partidos"
```

---

## 🚀 Implementación de Cron Job

### Opción 1: Supabase Edge Function

```typescript
// supabase/functions/auto-finish-matches/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('auto_finish_past_matches')

  return new Response(
    JSON.stringify({ 
      finalized: data,
      error: error?.message 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Configurar en Supabase Dashboard**:
- Functions → Create Function
- Deploy código
- Cron Jobs → Add Job
- Expresión: `0 * * * *` (cada hora)

### Opción 2: External Cron (Vercel, Railway, etc.)

```bash
# Crear endpoint en tu backend
curl -X POST https://tu-api.com/cron/auto-finish-matches
```

---

## 📋 Validaciones Implementadas

### En `handleJoinMatch()`:
```typescript
✅ Partido no debe estar finished
```

### En `handleLeaveMatch()`:
```typescript
✅ Partido no debe estar finished
```

### En `handleFinishMatch()`:
```typescript
✅ Usuario debe ser organizador
✅ Partido debe estar confirmed
✅ Confirmación del usuario
```

### En Filtros de Lista:
```typescript
✅ Partidos finished NO aparecen en lista principal
✅ Solo en historial/perfil
```

---

## 🎯 Beneficios

### Para Jugadores:
- ✅ Ver historial de partidos
- ✅ Seguir estadísticas personales
- ✅ Comparar con otros jugadores
- ✅ Motivación (victorias, MVP)

### Para Organizadores:
- ✅ Marcar partidos como finalizados
- ✅ Registrar resultados
- ✅ Limpiar lista de partidos activos

### Para el Sistema:
- ✅ Datos para rankings
- ✅ Estadísticas de uso
- ✅ Análisis de comportamiento
- ✅ Gamificación (logros, badges)

---

## 📈 Mejoras Futuras

### Corto Plazo:
- [ ] Formulario para ingresar scores al finalizar
- [ ] Selección de MVP desde la app
- [ ] Compartir resultado en redes sociales

### Mediano Plazo:
- [ ] Rankings por región/deporte
- [ ] Logros y badges (10 partidos, 50 victorias, etc.)
- [ ] Gráficos de estadísticas
- [ ] Comparación entre jugadores

### Largo Plazo:
- [ ] Sistema de niveles (Bronce, Plata, Oro)
- [ ] Predicción de resultados (ML)
- [ ] Recomendaciones de jugadores similares
- [ ] Torneos y competencias

---

## 📊 Consultas de Analytics

### Partidos Más Activos

```sql
SELECT 
  DATE_TRUNC('day', datetime) as fecha,
  COUNT(*) as partidos_finalizados
FROM matches
WHERE status = 'finished'
  AND datetime > NOW() - INTERVAL '30 days'
GROUP BY fecha
ORDER BY fecha DESC;
```

### Jugadores Más Activos

```sql
SELECT 
  p.first_name || ' ' || p.last_name as jugador,
  COUNT(*) as partidos_jugados,
  COUNT(*) FILTER (WHERE mp.team = m.winning_team) as victorias,
  COUNT(*) FILTER (WHERE m.mvp_player_id = p.id) as mvp_veces
FROM profiles p
JOIN match_players mp ON mp.player_id = p.id
JOIN matches m ON m.id = mp.match_id
WHERE m.status = 'finished'
  AND m.datetime > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY partidos_jugados DESC
LIMIT 10;
```

### Deportes Más Populares

```sql
SELECT 
  match_type,
  COUNT(*) as total_partidos,
  COUNT(*) FILTER (WHERE status = 'finished') as finalizados,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'finished') * 100.0 / COUNT(*),
    2
  ) as tasa_finalizacion
FROM matches
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY match_type
ORDER BY total_partidos DESC;
```

---

## 🧪 Testing

### Test: Finalizar Manualmente

```
✓ Crear partido
✓ Confirmar partido
✓ Presionar "Finalizar"
✓ Verificar estado = 'finished'
✓ Verificar banner verde
✓ Verificar NO aparece en lista join
```

### Test: Auto-Finalizar

```
✓ Crear partido (hace 4 horas)
✓ Confirmar partido
✓ Ejecutar: SELECT auto_finish_past_matches()
✓ Verificar estado = 'finished'
✓ Verificar retorna 1
```

### Test: Ver Estadísticas

```
✓ Finalizar varios partidos
✓ Ejecutar: SELECT * FROM get_player_stats('[uuid]')
✓ Verificar totales correctos
✓ Verificar tasa de victorias
```

---

## 📂 Archivos Creados/Modificados

### Nuevos:
- `009_add_finished_status.sql` - Migración completa

### Modificados:
- `[id].tsx` - UI + botón finalizar + validaciones
- `join.tsx` - Filtrar partidos finished

---

## ✅ Checklist de Implementación

### Base de Datos:
- [x] Migración SQL creada
- [x] Función `finish_match()`
- [x] Función `auto_finish_past_matches()`
- [x] Función `reopen_finished_match()`
- [x] Función `get_player_match_history()`
- [x] Función `get_player_stats()`
- [x] Vista `finished_matches_stats`
- [x] Índice optimizado
- [x] RLS actualizado

### Frontend:
- [x] Badge de estado finished
- [x] Botón "Finalizar" para organizador
- [x] Validaciones en unirse/salir
- [x] Banner verde de finalizado
- [x] Filtros para ocultar de lista principal
- [x] Estilos y colores

### Pendiente:
- [ ] Historial de partidos en perfil
- [ ] Vista de estadísticas de jugador
- [ ] Cron job para auto-finalizar
- [ ] Formulario de resultados (scores, MVP)

---

✅ **Estado FINISHED Implementado**

**Fecha**: 7 de febrero, 2026  
**Versión**: 1.1.0  
**Estado**: ✅ Base completa, pendiente UI de historial
