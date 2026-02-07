# Guía de Player Stats

## 📊 Sistema de Estadísticas de Jugador

Cada usuario tiene estadísticas asociadas que rastrean su desempeño en el juego.

## 🗄️ Estructura de la Tabla

```sql
player_stats
├── id (UUID)
├── player_id (UUID) → profiles.id
├── total_matches (integer) - Total de partidos jugados
├── wins (integer) - Victorias
├── losses (integer) - Derrotas
├── draws (integer) - Empates
├── mvp_count (integer) - Veces que fue MVP
├── gk_count (integer) - Partidos como Portero (GoalKeeper)
├── df_count (integer) - Partidos como Defensa (Defender)
├── mf_count (integer) - Partidos como Mediocampo (Midfielder)
├── fw_count (integer) - Partidos como Delantero (Forward)
├── current_level (integer) - Nivel actual del jugador
├── created_at (timestamp)
└── updated_at (timestamp)
```

## 🚀 Instalación

### Para Proyecto Nuevo
Si estás configurando el proyecto desde cero, ejecuta todo el contenido de `primerabd.sql` que ya incluye la tabla `player_stats`.

### Para Proyecto Existente (Migración)
Si ya tienes usuarios creados y necesitas agregar las estadísticas:

1. **Ejecuta el script de migración** en Supabase SQL Editor:
   ```bash
   # Copia y pega todo el contenido de:
   MIGRACION_PLAYER_STATS.sql
   ```

2. **Verificar** que todos los perfiles tienen stats:
   ```sql
   SELECT 
     p.id,
     p.email,
     ps.id as stats_id
   FROM profiles p
   LEFT JOIN player_stats ps ON p.id = ps.player_id;
   ```

## 💻 Uso en el Código

### Importar el Servicio

```typescript
import { playerStatsService } from '@/services/player-stats.service';
```

### Obtener Estadísticas

```typescript
// Obtener stats de un jugador
const stats = await playerStatsService.getPlayerStats(userId);

// Obtener stats formateadas para mostrar
const formatted = playerStatsService.getFormattedStats(stats);
// Retorna: { ...stats, winRate: "75.0%", favoritePosition: "Delantero", level: 3 }
```

### Actualizar Después de un Partido

```typescript
// Registrar victoria
await playerStatsService.incrementMatches(userId, 'win');

// Registrar derrota
await playerStatsService.incrementMatches(userId, 'loss');

// Registrar empate
await playerStatsService.incrementMatches(userId, 'draw');

// Registrar MVP
await playerStatsService.incrementMVP(userId);

// Registrar posición jugada
await playerStatsService.incrementPosition(userId, 'fw'); // fw, mf, df, gk

// Actualizar nivel (se calcula automáticamente)
await playerStatsService.updateLevel(userId);
```

### Actualización Manual

```typescript
// Actualizar campos específicos
await playerStatsService.updateStats(userId, {
  total_matches: 10,
  wins: 7,
  mvp_count: 2,
});
```

## 📈 Sistema de Niveles

El nivel se calcula automáticamente basado en el número de partidos:

```typescript
nivel = ⌊√(total_matches / 10)⌋ + 1
```

Ejemplos:
- 0-9 partidos = Nivel 1
- 10-39 partidos = Nivel 2
- 40-89 partidos = Nivel 3
- 90-159 partidos = Nivel 4
- etc.

## 🎯 Calcular Estadísticas

```typescript
// Porcentaje de victorias
const winRate = playerStatsService.calculateWinRate(stats);
// Retorna: 75.5

// Posición favorita
const favoritePos = playerStatsService.getFavoritePosition(stats);
// Retorna: "Delantero" o "Sin posición favorita"

// Calcular nuevo nivel
const newLevel = playerStatsService.calculateLevel(totalMatches);
```

## 🎨 Mostrar en la UI

### Ejemplo: Card de Estadísticas

```typescript
import { playerStatsService } from '@/services/player-stats.service';

const StatsCard = ({ userId }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await playerStatsService.getPlayerStats(userId);
    setStats(data);
  };

  if (!stats) return <Loading />;

  const formatted = playerStatsService.getFormattedStats(stats);

  return (
    <View>
      <Text>Nivel {formatted.level}</Text>
      <Text>Partidos: {stats.total_matches}</Text>
      <Text>Victorias: {stats.wins}</Text>
      <Text>Win Rate: {formatted.winRate}</Text>
      <Text>Posición favorita: {formatted.favoritePosition}</Text>
      <Text>MVP: {stats.mvp_count}x</Text>
    </View>
  );
};
```

## 🔒 Seguridad (RLS)

Las políticas de Row Level Security están configuradas para que:
- ✅ Los usuarios solo pueden ver sus propias estadísticas
- ✅ Los usuarios solo pueden actualizar sus propias estadísticas
- ✅ Las estadísticas se crean automáticamente al registrarse

## 🔄 Creación Automática

Cuando un usuario se registra:

1. Se crea el perfil en `profiles`
2. Se crean las estadísticas en `player_stats` automáticamente
3. Valores iniciales:
   - `total_matches`: 0
   - `wins`: 0
   - `losses`: 0
   - `draws`: 0
   - `mvp_count`: 0
   - `*_count` (posiciones): 0
   - `current_level`: 1

## 📝 Notas Importantes

1. **Relación 1:1**: Cada perfil tiene exactamente un registro de stats
2. **DELETE CASCADE**: Si se elimina un perfil, sus stats también se eliminan
3. **Trigger updated_at**: Se actualiza automáticamente en cada modificación
4. **Nivel automático**: El nivel se debe calcular y actualizar después de cada partido

## 🧪 Testing

```sql
-- Ver todas las stats
SELECT * FROM player_stats;

-- Ver stats con información del jugador
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  ps.*
FROM profiles p
JOIN player_stats ps ON p.id = ps.player_id;

-- Insertar datos de prueba
UPDATE player_stats
SET 
  total_matches = 25,
  wins = 18,
  losses = 5,
  draws = 2,
  mvp_count = 7,
  fw_count = 20,
  mf_count = 5
WHERE player_id = 'tu-user-id-aqui';
```

## 🎮 Posiciones

- **GK** (GoalKeeper): Portero
- **DF** (Defender): Defensa
- **MF** (Midfielder): Mediocampista
- **FW** (Forward): Delantero

Cada contador rastrea cuántas veces el jugador ha jugado en cada posición.

## 🚀 Próximos Pasos

Considera agregar:
- Historial de partidos (tabla `matches`)
- Sistema de logros/badges
- Ranking global de jugadores
- Estadísticas por temporada
- Gráficos de progreso
