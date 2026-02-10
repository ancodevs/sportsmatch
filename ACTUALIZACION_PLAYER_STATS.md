# 📊 Actualización Automática de Player Stats - Documentación

## 🎯 Descripción General

Sistema automático que actualiza las estadísticas de los jugadores (`player_stats`) cuando un partido se finaliza. Utiliza triggers de PostgreSQL para mantener las estadísticas sincronizadas sin intervención manual.

---

## ✅ Funcionalidades Implementadas

### 1. **Trigger Automático**

Cuando un partido cambia a estado `finished`, se ejecuta automáticamente:

```sql
TRIGGER: trigger_update_player_stats_on_finish
EVENTO: AFTER UPDATE OF status ON matches
ACCIÓN: Actualizar player_stats de todos los jugadores
```

### 2. **Estadísticas Actualizadas**

Para cada jugador del partido se actualiza:

| Campo | Descripción | Cuándo se Incrementa |
|-------|-------------|---------------------|
| `total_matches` | Total de partidos | Siempre (+1) |
| `wins` | Victorias | Si su equipo ganó (+1) |
| `losses` | Derrotas | Si su equipo perdió (+1) |
| `draws` | Empates | Si fue empate (+1) |
| `mvp_count` | Veces MVP | Si fue el MVP (+1) |
| `gk_count` | Partidos como GK | Si position = 'GK' (+1) |
| `df_count` | Partidos como DF | Si position = 'DF' (+1) |
| `mf_count` | Partidos como MF | Si position = 'MF' (+1) |
| `fw_count` | Partidos como FW | Si position = 'FW' (+1) |
| `updated_at` | Última actualización | NOW() |

---

## 🔄 Flujo de Actualización

### Proceso Automático

```
1. Organizador finaliza partido
   ↓
2. Estado cambia a 'finished'
   ↓
3. Trigger se activa automáticamente
   ↓
4. Obtiene todos los jugadores (match_players)
   ↓
5. Para cada jugador:
   ├─ Verifica si ganó, perdió o empató
   ├─ Verifica si fue MVP
   ├─ Verifica su posición
   └─ UPSERT en player_stats
   ↓
6. Todos los jugadores actualizados ✅
```

---

## 💻 Lógica de Actualización

### Determinar Resultado para Cada Jugador

```typescript
// Empate
if (winning_team === 'empate' || winning_team === null) {
  draws += 1;
}

// Ganó
else if (player.team === winning_team) {
  wins += 1;
}

// Perdió
else if (winning_team !== null && player.team !== null) {
  losses += 1;
}

// MVP
if (mvp_player_id === player.id) {
  mvp_count += 1;
}

// Posición
if (player.position === 'GK') gk_count += 1;
if (player.position === 'DF') df_count += 1;
// etc...
```

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Partido con Ganador y MVP

```sql
-- Partido: Equipo A gana 5-3, María García (Equipo A) es MVP

UPDATE matches
SET 
  status = 'finished',
  score_team_a = 5,
  score_team_b = 3,
  winning_team = 'A',
  mvp_player_id = '[maria-uuid]'
WHERE id = '[match-uuid]';

-- Resultado automático para jugadores:

-- Jugadores de Equipo A:
-- ✓ total_matches +1
-- ✓ wins +1
-- ✓ losses (sin cambio)
-- ✓ draws (sin cambio)

-- María García (MVP):
-- ✓ total_matches +1
-- ✓ wins +1
-- ✓ mvp_count +1  ← EXTRA por ser MVP

-- Jugadores de Equipo B:
-- ✓ total_matches +1
-- ✓ wins (sin cambio)
-- ✓ losses +1
-- ✓ draws (sin cambio)
```

### Ejemplo 2: Partido con Empate

```sql
-- Partido: Empate 2-2

UPDATE matches
SET 
  status = 'finished',
  score_team_a = 2,
  score_team_b = 2,
  winning_team = 'empate'
WHERE id = '[match-uuid]';

-- Resultado automático para TODOS los jugadores:
-- ✓ total_matches +1
-- ✓ wins (sin cambio)
-- ✓ losses (sin cambio)
-- ✓ draws +1
```

### Ejemplo 3: Finalizar Sin Resultados

```sql
-- Partido finalizado sin registrar ganador

UPDATE matches
SET status = 'finished'
WHERE id = '[match-uuid]';

-- Resultado automático para TODOS los jugadores:
-- ✓ total_matches +1
-- ✓ wins (sin cambio)
-- ✓ losses (sin cambio)
-- ✓ draws (sin cambio)  ← No suma porque winning_team es NULL
```

---

## 🛠️ Funciones Auxiliares

### 1. `recalculate_player_stats(player_uuid)`

Recalcula desde cero las estadísticas de un jugador específico.

**Uso**:
```sql
-- Recalcular stats de un jugador
SELECT recalculate_player_stats('[player-uuid]'::UUID);
```

**Cuándo usar**:
- Si hay inconsistencias en los datos
- Después de corregir errores en partidos
- Para verificar que los stats son correctos

### 2. `recalculate_all_player_stats()`

Recalcula las estadísticas de TODOS los jugadores que han participado en partidos.

**Uso**:
```sql
-- Recalcular stats de todos los jugadores
SELECT * FROM recalculate_all_player_stats();
```

**Retorna**:
```
player_id | total_matches | status
----------|---------------|--------
uuid-1    | 15            | success
uuid-2    | 8             | success
uuid-3    | 23            | success
```

**Cuándo usar**:
- Después de migraciones
- Mantenimiento periódico
- Después de correcciones masivas

---

## 📊 Consultas Útiles

### Ver Estadísticas de un Jugador

```sql
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches as partidos,
  ps.wins as victorias,
  ps.losses as derrotas,
  ps.draws as empates,
  ps.mvp_count as mvp,
  ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) as "win_rate_%"
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.player_id = '[player-uuid]'::UUID;
```

**Resultado**:
```
nombre        | partidos | victorias | derrotas | empates | mvp | win_rate_%
--------------|----------|-----------|----------|---------|-----|------------
María García  | 25       | 18        | 5        | 2       | 5   | 72.00
```

### Top 10 Jugadores por Victorias

```sql
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.wins,
  ps.mvp_count,
  ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) as win_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.total_matches > 0
ORDER BY ps.wins DESC, win_rate DESC
LIMIT 10;
```

### Top 10 Jugadores MVP

```sql
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.total_matches,
  ps.mvp_count,
  ROUND(ps.mvp_count * 100.0 / NULLIF(ps.total_matches, 0), 2) as mvp_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.total_matches > 0
ORDER BY ps.mvp_count DESC, mvp_rate DESC
LIMIT 10;
```

### Estadísticas por Posición

```sql
SELECT 
  p.first_name || ' ' || p.last_name as nombre,
  ps.gk_count as portero,
  ps.df_count as defensa,
  ps.mf_count as medio,
  ps.fw_count as delantero,
  ps.total_matches
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.player_id = '[player-uuid]'::UUID;
```

---

## 🎯 Casos Especiales

### Caso 1: Jugador Sin Equipo Asignado

```
Partido: Modo "random", equipos no asignados

Jugador:
- team = NULL
- winning_team = 'A'

Resultado:
✓ total_matches +1
✗ wins (no suma, team es NULL)
✗ losses (no suma, team es NULL)
✗ draws (no suma, no hay empate)
```

### Caso 2: Partido Sin Ganador Registrado

```
Organizador finaliza sin indicar ganador

winning_team = NULL

Todos los jugadores:
✓ total_matches +1
✗ wins (no suma)
✗ losses (no suma)
✗ draws (no suma, no es empate explícito)
```

### Caso 3: MVP de Equipo Perdedor

```
Partido: Equipo A gana 3-2
MVP: Juan Pérez (Equipo B)

Juan Pérez:
✓ total_matches +1
✗ wins (su equipo perdió)
✓ losses +1
✓ mvp_count +1  ← Sí suma MVP aunque perdió
```

### Caso 4: Jugador Sin Posición

```
Jugador:
- position = NULL

Resultado:
✓ total_matches +1
✓ wins/losses/draws (según resultado)
✗ gk_count, df_count, mf_count, fw_count (no suman)
```

---

## 🧪 Testing

### Test 1: Finalizar Partido con Ganador

```sql
-- Setup
INSERT INTO matches (...) VALUES (...) RETURNING id;
-- match_id = 'xxx'

INSERT INTO match_players (match_id, player_id, team) VALUES
  ('xxx', 'player-1', 'A'),
  ('xxx', 'player-2', 'A'),
  ('xxx', 'player-3', 'B'),
  ('xxx', 'player-4', 'B');

-- Verificar stats iniciales (deben ser 0)
SELECT * FROM player_stats WHERE player_id IN ('player-1', 'player-2', 'player-3', 'player-4');

-- Finalizar partido
UPDATE matches
SET status = 'finished', winning_team = 'A'
WHERE id = 'xxx';

-- Verificar stats actualizados
SELECT 
  player_id,
  total_matches,  -- Debe ser 1 para todos
  wins,           -- Debe ser 1 para player-1 y player-2
  losses          -- Debe ser 1 para player-3 y player-4
FROM player_stats
WHERE player_id IN ('player-1', 'player-2', 'player-3', 'player-4');
```

### Test 2: Finalizar Múltiples Partidos

```sql
-- Finalizar 3 partidos donde player-1 juega en todos

-- Partido 1: Gana
UPDATE matches SET status = 'finished', winning_team = 'A'
WHERE id = 'match-1';  -- player-1 en equipo A

-- Partido 2: Pierde
UPDATE matches SET status = 'finished', winning_team = 'B'
WHERE id = 'match-2';  -- player-1 en equipo A

-- Partido 3: Empata
UPDATE matches SET status = 'finished', winning_team = 'empate'
WHERE id = 'match-3';  -- player-1 en equipo A

-- Verificar
SELECT 
  total_matches,  -- Debe ser 3
  wins,           -- Debe ser 1
  losses,         -- Debe ser 1
  draws           -- Debe ser 1
FROM player_stats
WHERE player_id = 'player-1';
```

### Test 3: Recalcular Stats

```sql
-- Corromper datos manualmente
UPDATE player_stats
SET total_matches = 999, wins = 888
WHERE player_id = 'player-1';

-- Recalcular
SELECT recalculate_player_stats('player-1'::UUID);

-- Verificar que se corrigió
SELECT total_matches, wins, losses, draws
FROM player_stats
WHERE player_id = 'player-1';
-- Debe mostrar valores correctos basados en partidos reales
```

---

## 📈 Métricas y Analytics

### Ranking de Jugadores

```sql
-- Ranking por Win Rate (mínimo 5 partidos)
SELECT 
  ROW_NUMBER() OVER (ORDER BY 
    ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) DESC
  ) as ranking,
  p.first_name || ' ' || p.last_name as jugador,
  ps.total_matches,
  ps.wins,
  ps.losses,
  ps.draws,
  ROUND(ps.wins * 100.0 / NULLIF(ps.total_matches, 0), 2) as win_rate
FROM player_stats ps
JOIN profiles p ON p.id = ps.player_id
WHERE ps.total_matches >= 5
ORDER BY win_rate DESC
LIMIT 10;
```

### Estadísticas Globales

```sql
SELECT 
  COUNT(*) as total_jugadores,
  SUM(total_matches) as total_participaciones,
  ROUND(AVG(total_matches), 2) as promedio_partidos_por_jugador,
  ROUND(AVG(wins * 100.0 / NULLIF(total_matches, 0)), 2) as win_rate_promedio,
  SUM(mvp_count) as total_mvps
FROM player_stats
WHERE total_matches > 0;
```

### Jugadores Más Activos (Último Mes)

```sql
SELECT 
  p.first_name || ' ' || p.last_name as jugador,
  COUNT(*) as partidos_ultimo_mes,
  ps.total_matches as partidos_total
FROM match_players mp
JOIN matches m ON m.id = mp.match_id
JOIN profiles p ON p.id = mp.player_id
LEFT JOIN player_stats ps ON ps.player_id = mp.player_id
WHERE m.status = 'finished'
  AND m.datetime > NOW() - INTERVAL '30 days'
GROUP BY mp.player_id, p.first_name, p.last_name, ps.total_matches
ORDER BY partidos_ultimo_mes DESC
LIMIT 10;
```

---

## ⚠️ Consideraciones Importantes

### 1. **UPSERT (INSERT ON CONFLICT)**

```sql
-- Si el jugador NO existe en player_stats:
→ Crea registro nuevo con valores iniciales

-- Si el jugador YA existe:
→ Incrementa los contadores existentes
```

### 2. **Trigger Solo en UPDATE**

```sql
-- El trigger solo se activa en UPDATE, no en INSERT
-- Esto es correcto porque los partidos se crean como 'open'
-- y luego se actualizan a 'finished'
```

### 3. **Validación de Team**

```sql
-- Si player.team es NULL, no puede ganar/perder
-- Solo suma total_matches
-- Esto puede pasar en modo "random" antes de asignar equipos
```

### 4. **Performance**

```sql
-- El trigger itera sobre N jugadores
-- En un partido típico (10-20 jugadores): muy rápido
-- En partidos grandes (50+ jugadores): puede tardar 1-2 segundos
-- Esto es aceptable porque se ejecuta en background
```

### 5. **Consistencia de Datos**

```sql
-- Si hay errores en partidos antiguos:
→ Usar recalculate_player_stats() para corregir

-- Si hay inconsistencias globales:
→ Usar recalculate_all_player_stats()
```

---

## 🔧 Troubleshooting

### Problema: Stats no se actualizan

**Verificar**:
```sql
-- 1. ¿Existe el trigger?
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_player_stats_on_finish';

-- 2. ¿El partido está en 'finished'?
SELECT status FROM matches WHERE id = '[match-uuid]';

-- 3. ¿Hay jugadores en el partido?
SELECT COUNT(*) FROM match_players WHERE match_id = '[match-uuid]';
```

**Solución**:
```sql
-- Recalcular manualmente
SELECT recalculate_player_stats('[player-uuid]'::UUID);
```

### Problema: Stats incorrectos

**Causa**: Partido fue editado después de finalizar

**Solución**:
```sql
-- Recalcular desde cero
SELECT recalculate_player_stats('[player-uuid]'::UUID);
```

### Problema: Win rate > 100%

**Causa**: Datos corruptos

**Solución**:
```sql
-- Verificar integridad
SELECT 
  player_id,
  total_matches,
  wins,
  losses,
  draws,
  (wins + losses + draws) as suma
FROM player_stats
WHERE (wins + losses + draws) > total_matches;

-- Si hay inconsistencias, recalcular
SELECT recalculate_player_stats('[player-uuid]'::UUID);
```

---

## 📂 Archivos Relacionados

### 1. Migración Principal
- **`011_update_player_stats_on_finish.sql`**
  - Función `update_player_stats_on_match_finish()`
  - Trigger `trigger_update_player_stats_on_finish`
  - Función `recalculate_player_stats()`
  - Función `recalculate_all_player_stats()`

### 2. Tablas Involucradas
- `matches` - Datos del partido
- `match_players` - Jugadores del partido
- `player_stats` - Estadísticas de jugadores
- `profiles` - Información de usuarios

---

## ✅ Checklist de Verificación

Después de ejecutar la migración:

- [ ] Trigger existe y está activo
- [ ] Funciones auxiliares creadas
- [ ] Finalizar partido de prueba
- [ ] Verificar stats actualizados
- [ ] Probar recalculate_player_stats()
- [ ] Verificar que UPSERT funciona
- [ ] Verificar conteo de wins/losses/draws
- [ ] Verificar conteo de MVP
- [ ] Verificar conteo de posiciones

---

## 🎯 Resumen

La actualización automática de `player_stats`:

✅ **Se ejecuta automáticamente** al finalizar partido
✅ **Actualiza todos los jugadores** del partido
✅ **Maneja todos los casos** (ganador, empate, sin resultado)
✅ **Reconoce MVP** y lo cuenta
✅ **Cuenta posiciones** jugadas
✅ **Usa UPSERT** (crea o actualiza según corresponda)
✅ **Incluye funciones** de recálculo para mantenimiento
✅ **Es eficiente** y rápido
✅ **No require intervención** manual

---

✅ **Estado**: Implementado y documentado
📅 **Fecha**: 7 de febrero, 2026
🔄 **Versión**: 1.0.0

