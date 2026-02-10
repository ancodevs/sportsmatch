# Implementación de Lógica de Modos de Juego

## 📋 Resumen

Se ha implementado la lógica completa para los 3 modos de juego en la pantalla de detalle del partido (`[id].tsx`).

## 🎮 Modos Implementados

### 1. **Modo Selección (Selection)** 🎯

**Flujo**:
1. Al unirse, se muestra un modal para elegir Equipo A o B
2. Los jugadores pueden cambiar de equipo en cualquier momento
3. Vista dividida: Equipo A (azul) vs Equipo B (rojo)
4. Botón de intercambio para cambiar de equipo

**Características**:
- ✅ Modal de selección de equipo al unirse
- ✅ Vista dividida con colores distintivos
- ✅ Contador de jugadores por equipo
- ✅ Botón para cambiar de equipo (solo para el jugador actual)
- ✅ Sección para jugadores sin equipo asignado

**Interfaz**:
```
┌──────────────────────────────┐
│ Equipo A (5)                 │
│ ┌──────────────────────────┐ │
│ │ 👤 Juan Pérez      [⇄]   │ │
│ │ 👤 María López           │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Equipo B (3)                 │
│ ┌──────────────────────────┐ │
│ │ 👤 Carlos Silva          │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### 2. **Modo Aleatorio (Random)** 🎲

**Flujo**:
1. Los jugadores se unen a una lista única
2. Cuando el partido se llena, los equipos se sortean automáticamente
3. El organizador puede sortear manualmente antes de llenarse (min. 4 jugadores)

**Características**:
- ✅ Lista simple antes del sorteo
- ✅ Info box explicativo
- ✅ Sorteo automático al llenarse
- ✅ Botón manual para sortear (solo organizador, min 4 jugadores)
- ✅ Vista de equipos sorteados con banner de éxito
- ✅ Algoritmo Fisher-Yates shuffle para sorteo justo

**Interfaz antes del sorteo**:
```
┌──────────────────────────────────┐
│ ℹ️ Los equipos se sortearán      │
│   automáticamente cuando el      │
│   partido se llene               │
└──────────────────────────────────┘

👤 Juan Pérez
👤 María López
👤 Carlos Silva
👤 Ana Torres

┌──────────────────────────────────┐
│ 🔀 Sortear Equipos Ahora         │
└──────────────────────────────────┘
```

**Interfaz después del sorteo**:
```
┌──────────────────────────────────┐
│ ✅ ¡Equipos formados              │
│    aleatoriamente!                │
└──────────────────────────────────┘

Equipo A (5)
...

Equipo B (5)
...
```

### 3. **Modo Equipos (Teams)** 👥

**Estado**: Próximamente

**Características planeadas**:
- Validación de que el jugador pertenezca a un equipo creado
- Solo equipos completos pueden inscribirse
- Vista de equipos con nombres y logos
- Integración con tabla `teams` (pendiente de crear)

**Interfaz actual**:
```
┌──────────────────────────────────┐
│          🔧                       │
│                                   │
│ La funcionalidad de equipos      │
│ creados estará disponible pronto │
└──────────────────────────────────┘
```

## 🛠️ Implementación Técnica

### Nuevos Estados

```typescript
const [showTeamSelector, setShowTeamSelector] = useState(false);
const [teamsAssigned, setTeamsAssigned] = useState(false);
```

### Funciones Principales

#### `handleJoinMatch(selectedTeam?: string)`
- Maneja la unión al partido según el modo
- Para `selection`: muestra modal de selección
- Para `random`: agrega a lista única
- Para `teams`: valida pertenencia a equipo (próximamente)

#### `assignRandomTeams()`
- Sortea equipos aleatoriamente (Fisher-Yates shuffle)
- Divide jugadores en dos equipos equitativos
- Actualiza campo `team` en `match_players`
- Solo ejecutable por el organizador

#### `changeTeam(playerId, newTeam)`
- Permite cambiar de equipo en modo `selection`
- Solo el jugador puede cambiar su propio equipo
- Actualización inmediata en base de datos

#### `getTeamsData()`
- Organiza jugadores en: `teamA`, `teamB`, `noTeam`
- Retorna estructura `TeamInfo` para cada equipo
- Utilizada para renderizar vistas de equipos

### Estructura de Datos

```typescript
interface TeamInfo {
  name: string;
  players: Player[];
}
```

## 🎨 Componentes UI

### Modal de Selección de Equipo

```typescript
<Modal visible={showTeamSelector}>
  <View style={styles.modalContent}>
    <TouchableOpacity onPress={() => handleJoinMatch('A')}>
      // Equipo A
    </TouchableOpacity>
    <TouchableOpacity onPress={() => handleJoinMatch('B')}>
      // Equipo B
    </TouchableOpacity>
  </View>
</Modal>
```

### Vista de Equipos (Selection/Random)

```typescript
<View style={styles.teamSection}>
  <View style={[styles.teamHeader, styles.teamAHeader]}>
    // Header Equipo A
  </View>
  {teamA.players.map(player => (
    // Card de jugador con botón de cambio
  ))}
</View>
```

### Info Boxes

- **Info Box (azul)**: Información contextual
- **Success Box (verde)**: Confirmación de acciones
- **Coming Soon Box (gris)**: Funcionalidades futuras

## 🎯 Flujos de Usuario

### Flujo: Unirse a Partido (Modo Selection)

1. Usuario presiona "Unirme al Partido"
2. Se muestra modal con opciones: Equipo A / Equipo B
3. Usuario selecciona un equipo
4. Se inserta en `match_players` con `team` = 'A' o 'B'
5. Vista se actualiza mostrando al usuario en su equipo
6. Usuario puede cambiar de equipo con botón de intercambio

### Flujo: Unirse a Partido (Modo Random)

1. Usuario presiona "Unirme al Partido"
2. Se inserta en `match_players` con `team` = `null`
3. Usuario aparece en lista simple
4. **Automático**: Si se llena el partido → `assignRandomTeams()`
5. **Manual**: Organizador puede sortear con botón (min 4 jugadores)
6. Equipos se forman y `team` se actualiza a 'A' o 'B'
7. Vista cambia a equipos sorteados

### Flujo: Sorteo Aleatorio

1. Se obtienen todos los jugadores del partido
2. Se mezcla array con Fisher-Yates shuffle
3. Se divide en dos grupos (mitad y mitad)
4. Se actualiza cada jugador con su equipo asignado
5. Se muestra alert de confirmación
6. Vista se refresca con equipos formados

## 📊 Base de Datos

### Campo `team` en `match_players`

```sql
team TEXT NULL  -- Valores: 'A', 'B', o NULL
```

**Uso por modo**:
- **Selection**: Se asigna al unirse ('A' o 'B')
- **Random**: `NULL` hasta sorteo, luego 'A' o 'B'
- **Teams**: (Próximamente) ID del equipo

## 🎨 Estilos Nuevos

### Colores de Equipos
- **Equipo A**: Azul (`#3B82F6`, `#DBEAFE`, `#EFF6FF`)
- **Equipo B**: Rojo (`#EF4444`, `#FEE2E2`, `#FEF2F2`)
- **Sin Equipo**: Gris (`#9CA3AF`, `#F3F4F6`)

### Componentes Estilizados
- `teamSection` - Contenedor de equipo
- `teamHeader` - Header con color y nombre
- `teamAAvatar` / `teamBAvatar` - Avatares con color de equipo
- `changeTeamButton` - Botón de intercambio
- `infoBox` / `successBox` - Cajas de información
- `shuffleButton` - Botón de sorteo (púrpura)
- `modalOverlay` / `modalContent` - Modal de selección
- `teamSelectButton` - Botones en modal

## ✅ Funcionalidades Completas

- [x] Modal de selección de equipo
- [x] Vista dividida por equipos (Selection)
- [x] Cambiar de equipo (Selection)
- [x] Lista simple pre-sorteo (Random)
- [x] Sorteo automático al llenarse (Random)
- [x] Sorteo manual por organizador (Random)
- [x] Vista de equipos sorteados (Random)
- [x] Info boxes contextuales
- [x] Colores distintivos por equipo
- [x] Contador de jugadores por equipo
- [x] Badge "Tú" para identificar jugador actual
- [x] Badge "Capitán" para organizador

## 🚧 Próximas Mejoras

### Para Modo Teams
- [ ] Crear tabla `teams`
- [ ] Validar pertenencia a equipo al unirse
- [ ] Mostrar logo y nombre del equipo
- [ ] Vista de equipos inscritos

### Mejoras Generales
- [ ] Animaciones de transición entre vistas
- [ ] Drag & drop para cambiar jugadores de equipo (Selection)
- [ ] Historial de cambios de equipo
- [ ] Notificaciones cuando se sortean equipos
- [ ] Estadísticas por equipo
- [ ] Balanceo automático de equipos por nivel

### UX
- [ ] Confirmación al cambiar de equipo
- [ ] Preview de cómo quedarían los equipos
- [ ] Sugerencias de equipos balanceados
- [ ] Opción de "equipos justos" basado en stats

## 📝 Archivos Modificados

1. **`sportmatch/app/(tabs)/match/[id].tsx`**
   - Agregados estados: `showTeamSelector`, `teamsAssigned`
   - Modificado: `handleJoinMatch()` con lógica por modo
   - Agregado: `assignRandomTeams()` para sorteo
   - Agregado: `changeTeam()` para cambio de equipo
   - Agregado: `getTeamsData()` helper
   - Modificada vista de jugadores con lógica condicional por modo
   - Agregado Modal de selección de equipo
   - Agregados +30 estilos nuevos

2. **`sportmatch-admin/supabase/migrations/006_separate_gender_from_game_mode.sql`**
   - Ya creado en paso anterior
   - Define `game_mode` y `gender_mode`

## 🧪 Testing

### Para Probar Modo Selection
1. Crear partido con modo "Selección de Equipos"
2. Unirse al partido → debe mostrar modal
3. Elegir Equipo A o B
4. Verificar que aparece en el equipo correcto
5. Cambiar de equipo con botón de intercambio
6. Verificar actualización en tiempo real

### Para Probar Modo Random
1. Crear partido con modo "Aleatorio"
2. Unirse con varios usuarios (mínimo 4)
3. Verificar lista simple
4. Como organizador, sortear manualmente
5. Verificar equipos formados aleatoriamente
6. O llenar partido y ver sorteo automático

### Para Probar Modo Teams
1. Crear partido con modo "Equipos Creados"
2. Intentar unirse
3. Debe mostrar mensaje "Próximamente"

## 📖 Uso

### Como Jugador (Selection)
```
1. Ver detalle del partido
2. Presionar "Unirme al Partido"
3. Elegir Equipo A o Equipo B en modal
4. ¡Listo! Apareces en tu equipo
5. (Opcional) Cambiar de equipo con botón ⇄
```

### Como Jugador (Random)
```
1. Ver detalle del partido
2. Presionar "Unirme al Partido"
3. Apareces en lista de espera
4. Esperar a que se llene o que organizador sortee
5. Ver tu equipo asignado aleatoriamente
```

### Como Organizador (Random)
```
1. Crear partido con modo "Aleatorio"
2. Esperar mínimo 4 jugadores
3. Presionar "Sortear Equipos Ahora"
4. Confirmar sorteo
5. Ver equipos formados
```

---

✅ **Estado**: Totalmente implementado para Selection y Random
🚧 **Teams**: Pendiente, requiere tabla adicional
📅 **Fecha**: 6 de febrero, 2026
