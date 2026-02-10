# 📱 Pantalla "Mis Partidos" - Documentación

## 🎯 Descripción General

La pantalla **"Mis Partidos"** (`my-matches.tsx`) permite a los usuarios gestionar y visualizar todos sus partidos según su estado y rol (participante u organizador).

---

## 🎨 Características Implementadas

### 1. **Sistema de Tabs**

La pantalla está organizada en 4 pestañas principales:

#### 📅 **Próximos**
- **Descripción**: Partidos donde el usuario está inscrito y próximos a jugarse
- **Estados incluidos**: `open`, `full`
- **Ordenamiento**: Fecha ascendente (más próximos primero)
- **Uso**: Ver partidos a los que te uniste y aún no se confirman

#### ✔️ **Confirmados**
- **Descripción**: Partidos confirmados por el organizador donde el usuario participa
- **Estados incluidos**: `confirmed`
- **Ordenamiento**: Fecha ascendente
- **Uso**: Ver partidos listos para jugarse

#### 🏆 **Historial**
- **Descripción**: Partidos ya finalizados donde el usuario participó
- **Estados incluidos**: `finished`
- **Ordenamiento**: Fecha descendente (más recientes primero)
- **Uso**: Ver historial de partidos jugados

#### ⭐ **Organizados**
- **Descripción**: Partidos creados por el usuario (cualquier estado)
- **Estados incluidos**: Todos excepto `cancelled`
- **Ordenamiento**: Fecha ascendente
- **Filtro especial**: Solo partidos donde `created_by = currentUserId`
- **Uso**: Gestionar tus partidos como organizador

---

## 🎨 UI/UX

### Cards de Partido

Cada card muestra:

```
┌─────────────────────────────────────────┐
│ ⚽ Fútbol              ⭐ Organizador   │ ← Header
│                                         │
│ Partido de la Tarde                     │ ← Título
│                                         │
│ ✅ Abierto                              │ ← Badge de estado
│                                         │
│ 🕒 Hoy 18:00                            │
│ 📍 Complejo Central                     │
│ 👥 6/10 jugadores                       │
│                                         │
│ ─────────────────────────────────────   │
│                   Ver detalles →        │ ← Footer
└─────────────────────────────────────────┘
```

### Elementos de la Card

1. **Header**:
   - Chip de tipo de deporte (⚽, 🏀, 🏐, 🎾)
   - Badge "Organizador" si el usuario creó el partido

2. **Título**: Nombre del partido

3. **Badge de Estado**:
   - ✅ Abierto (verde)
   - 🔒 Lleno (amarillo)
   - ✔️ Confirmado (azul)
   - 🏆 Finalizado (verde oscuro)

4. **Información**:
   - Fecha/hora (formato inteligente: "Hoy", "Mañana", "En X días")
   - Ubicación (nombre del complejo)
   - Jugadores (X/Y jugadores)

5. **Footer**: Link para ver detalles

### Estados Vacíos

Para cada tab sin partidos:

```
┌─────────────────────────────────────────┐
│                                         │
│            📅 (icono grande)            │
│                                         │
│      No tienes partidos próximos        │
│                                         │
│  Únete a un partido desde la pestaña   │
│              "Unirse"                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💻 Lógica Implementada

### Carga de Datos

```typescript
// Según el tab seleccionado:
switch (selectedTab) {
  case 'upcoming':
    // Partidos open o full donde estoy inscrito
    query.in('status', ['open', 'full'])
    
  case 'confirmed':
    // Partidos confirmados donde estoy inscrito
    query.eq('status', 'confirmed')
    
  case 'finished':
    // Partidos finalizados donde participé
    query.eq('status', 'finished')
    
  case 'organized':
    // Partidos que yo creé (cualquier estado activo)
    query.eq('created_by', currentUserId)
         .neq('status', 'cancelled')
}

// Filtrar en cliente por participación
filteredMatches = matches.filter(match => 
  match.match_players.some(p => p.player_id === currentUserId)
);
```

### Formato de Fecha Inteligente

```typescript
const formatDate = (datetime: string) => {
  const diffDays = daysBetween(now, datetime);
  
  if (diffDays === 0) return "Hoy 18:00";
  if (diffDays === 1) return "Mañana 18:00";
  if (diffDays === -1) return "Ayer 18:00";
  if (diffDays > 1 && diffDays < 7) return "En 3 días 18:00";
  
  return "15 Ene 18:00";
};
```

### Detección de Rol

```typescript
const isOrganizer = match.created_by === currentUserId;

// Si es organizador, mostrar badge
{isOrganizer && (
  <View style={styles.organizerBadge}>
    <Ionicons name="star" size={12} color="#F59E0B" />
    <Text>Organizador</Text>
  </View>
)}
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Ver Próximos Partidos

```
1. Usuario abre "Mis Partidos"
2. Tab "Próximos" activo por defecto
3. Ve lista de partidos a los que se unió
4. Toca una card
5. Navega a detalle del partido
```

### Flujo 2: Ver Historial

```
1. Usuario selecciona tab "Historial"
2. Ve partidos ya jugados
3. Ordenados del más reciente al más antiguo
4. Puede ver detalles (resultados, equipos, etc.)
```

### Flujo 3: Gestionar Partidos Organizados

```
1. Usuario selecciona tab "Organizados"
2. Ve todos los partidos que creó
3. Badge "Organizador" visible en cada card
4. Puede entrar a confirmar/cancelar/finalizar
```

### Flujo 4: Refresh

```
1. Usuario hace pull-to-refresh
2. Se recargan los partidos del tab actual
3. Indicador de carga visible
4. Lista actualizada
```

---

## 🎨 Colores y Estilos

### Colores de Estado

```typescript
const statusColors = {
  open: '#10B981',      // Verde
  full: '#F59E0B',      // Amarillo
  confirmed: '#3B82F6', // Azul
  finished: '#059669'   // Verde oscuro
};
```

### Paleta de la Pantalla

```
Fondo principal:    #F9FAFB (gris muy claro)
Cards:              #FFFFFF (blanco)
Bordes:             #E5E7EB (gris claro)
Texto principal:    #1F2937 (negro grisáceo)
Texto secundario:   #6B7280 (gris)
Tab activo:         #3B82F6 (azul)
Tab inactivo:       #6B7280 (gris)
```

---

## 📊 Estadísticas

### Barra de Estadísticas

```
┌─────────────────────────────────────────┐
│  5 partidos                             │
└─────────────────────────────────────────┘
```

Muestra el total de partidos en el tab actual.

---

## 🔍 Consultas SQL

### Query Completo

```typescript
const { data } = await supabase
  .from('matches')
  .select(`
    id,
    title,
    description,
    datetime,
    status,
    match_type,
    game_mode,
    gender_mode,
    max_players,
    price,
    created_by,
    courts (
      name,
      admin_users (
        business_name,
        address,
        cities (
          name,
          regions (name)
        )
      )
    ),
    match_players (
      id,
      player_id,
      team
    )
  `)
  .in('status', ['open', 'full'])  // Ejemplo para tab "Próximos"
  .order('datetime', { ascending: true });
```

---

## 🧪 Casos de Prueba

### Test 1: Ver Partidos Próximos

```
✓ Usuario tiene 3 partidos próximos
✓ Abrir "Mis Partidos"
✓ Tab "Próximos" activo
✓ Ver 3 cards
✓ Ordenados por fecha (más cercano primero)
✓ Sin badge "Organizador" (si no es organizador)
```

### Test 2: Ver Partidos Organizados

```
✓ Usuario ha creado 2 partidos
✓ Seleccionar tab "Organizados"
✓ Ver 2 cards
✓ Badge "Organizador" visible en ambas
✓ Incluye partidos en diferentes estados
```

### Test 3: Ver Historial Vacío

```
✓ Usuario nuevo (sin partidos jugados)
✓ Seleccionar tab "Historial"
✓ Ver estado vacío
✓ Icono 🏆 grande
✓ Mensaje: "Aún no has jugado partidos"
✓ Descripción: "Tu historial aparecerá aquí"
```

### Test 4: Refresh

```
✓ Abrir "Mis Partidos"
✓ Pull to refresh
✓ Ver indicador de carga
✓ Partidos actualizados
✓ Nuevos partidos aparecen
```

### Test 5: Navegación a Detalle

```
✓ Tocar una card de partido
✓ Navegar a pantalla de detalle
✓ Ver información completa del partido
✓ Botón back funciona
```

---

## 🚀 Mejoras Futuras

### Corto Plazo

- [ ] **Contador de notificaciones** en cada tab
  ```
  Próximos (3)  Confirmados (1)  Historial  Organizados (2)
  ```

- [ ] **Filtros adicionales**:
  - Por deporte
  - Por fecha
  - Por ubicación

- [ ] **Búsqueda**:
  - Buscar por nombre de partido
  - Buscar por ubicación

### Mediano Plazo

- [ ] **Acciones rápidas** en las cards:
  - Compartir partido
  - Salir del partido (swipe)
  - Agregar a calendario

- [ ] **Vista de calendario**:
  - Alternar entre lista y calendario
  - Ver partidos en calendario mensual

- [ ] **Recordatorios**:
  - Notificación 1h antes del partido
  - Notificación cuando organizador confirma

### Largo Plazo

- [ ] **Estadísticas avanzadas**:
  - Gráfico de actividad mensual
  - Deportes más jugados
  - Tasa de asistencia

- [ ] **Recomendaciones**:
  - "Partidos similares a los que juegas"
  - "Jugadores que también juegan contigo"

- [ ] **Modo offline**:
  - Cache de partidos
  - Sincronización cuando hay conexión

---

## 📱 Navegación

### Desde esta pantalla:

```
Mis Partidos
    ├─→ Detalle de Partido ([id].tsx)
    └─→ Atrás (router.back())
```

### Hacia esta pantalla:

```
Home → Mis Partidos
Menú → Mis Partidos
```

---

## 🎯 Componentes Reutilizables

### MatchCard

Puedes extraer la lógica de la card a un componente separado:

```typescript
// components/MatchCard.tsx
export const MatchCard = ({ match, onPress }) => {
  // Lógica de la card
};

// Uso en my-matches.tsx
{matches.map(match => (
  <MatchCard 
    key={match.id}
    match={match}
    onPress={() => router.push(`/match/${match.id}`)}
  />
))}
```

### TabButton

```typescript
// components/TabButton.tsx
export const TabButton = ({ 
  icon, 
  label, 
  active, 
  onPress 
}) => {
  // Lógica del tab
};
```

---

## 📊 Métricas y Analytics

### Eventos a Trackear

```typescript
// Cuando usuario abre la pantalla
analytics.track('my_matches_viewed');

// Cuando cambia de tab
analytics.track('my_matches_tab_changed', {
  tab: selectedTab
});

// Cuando toca una card
analytics.track('my_matches_card_clicked', {
  match_id: match.id,
  tab: selectedTab
});

// Cuando hace refresh
analytics.track('my_matches_refreshed', {
  tab: selectedTab
});
```

### KPIs a Monitorear

```sql
-- Usuarios activos con partidos
SELECT COUNT(DISTINCT mp.player_id) 
FROM match_players mp
JOIN matches m ON m.id = mp.match_id
WHERE m.status IN ('open', 'full', 'confirmed')
  AND m.datetime > NOW();

-- Partidos promedio por usuario
SELECT 
  AVG(party_count) as avg_matches
FROM (
  SELECT 
    player_id,
    COUNT(*) as party_count
  FROM match_players
  GROUP BY player_id
) subquery;

-- Tasa de retención (usuarios con partidos en último mes)
SELECT 
  COUNT(DISTINCT CASE 
    WHEN m.datetime > NOW() - INTERVAL '30 days' 
    THEN mp.player_id 
  END) * 100.0 / COUNT(DISTINCT mp.player_id) as retention_rate
FROM match_players mp
JOIN matches m ON m.id = mp.match_id;
```

---

## 🔧 Troubleshooting

### Problema: No aparecen partidos

**Causa**: El usuario no está inscrito en ningún partido

**Solución**: 
1. Verificar que el usuario tenga registros en `match_players`
2. Verificar que `player_id` coincide con `currentUserId`

```sql
SELECT * FROM match_players WHERE player_id = '[user-id]';
```

### Problema: Fecha incorrecta

**Causa**: Zona horaria o formato de fecha

**Solución**:
```typescript
// Asegurar formato correcto
const date = new Date(datetime);
const localDate = date.toLocaleDateString('es-CL', {
  timeZone: 'America/Santiago'
});
```

### Problema: Loading infinito

**Causa**: Error en la consulta a Supabase

**Solución**:
```typescript
try {
  // Query...
} catch (error) {
  console.error('Error:', error);
} finally {
  setIsLoading(false); // IMPORTANTE
}
```

---

## ✅ Checklist de Implementación

### Backend:
- [x] Tabla `matches` con estados
- [x] Tabla `match_players` con relación
- [x] RLS policies configuradas
- [x] Índices optimizados

### Frontend:
- [x] Sistema de tabs
- [x] Carga de partidos por estado
- [x] Cards de partido
- [x] Estados vacíos
- [x] Pull to refresh
- [x] Loading states
- [x] Navegación a detalle
- [x] Formato de fecha inteligente
- [x] Detección de rol (organizador)
- [x] Estilos y colores

### Testing:
- [ ] Test de carga de datos
- [ ] Test de cambio de tabs
- [ ] Test de estados vacíos
- [ ] Test de navegación
- [ ] Test de refresh

---

## 📝 Resumen

La pantalla **"Mis Partidos"** proporciona una vista completa y organizada de todos los partidos del usuario, segmentados por estado y rol. Con un diseño limpio, carga optimizada y UX intuitiva, permite a los usuarios gestionar eficientemente su participación en partidos.

---

✅ **Estado**: Implementado y funcional
📅 **Fecha**: 7 de febrero, 2026
🔄 **Versión**: 1.0.0
