# Guía de Navegación con Subsecciones en Tabs

## 📱 Estructura Implementada

Cada Tab puede tener múltiples secciones internas usando **Stack Navigation**.

### Estructura de Carpetas

```
app/(tabs)/
├── match/                    # Tab con subsecciones
│   ├── _layout.tsx          # Stack Navigator
│   ├── index.tsx            # Pantalla principal (Home del tab)
│   ├── create.tsx           # Crear partido
│   ├── join.tsx             # Unirse a partido
│   └── my-matches.tsx       # Mis partidos
├── teams.tsx                # Tab simple (sin subsecciones aún)
├── ranking.tsx              # Tab simple
└── profile.tsx              # Tab simple
```

## 🎯 Cómo Funciona

### 1. **Tab Simple** (archivo único)
```
teams.tsx  →  Pantalla única
```

### 2. **Tab con Subsecciones** (carpeta)
```
match/
├── _layout.tsx    →  Define el Stack
├── index.tsx      →  Pantalla principal (se ve al tocar el tab)
├── create.tsx     →  Navega desde index con router.push()
├── join.tsx       →  Navega desde index con router.push()
└── my-matches.tsx →  Navega desde index con router.push()
```

## 🔧 Implementación Paso a Paso

### Paso 1: Convertir archivo a carpeta

**Antes:**
```
app/(tabs)/
└── teams.tsx  ❌
```

**Después:**
```
app/(tabs)/
└── teams/
    ├── _layout.tsx  ✅
    └── index.tsx    ✅
```

### Paso 2: Crear `_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Ocultamos el header por defecto
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-team" />
      <Stack.Screen name="team-details" />
    </Stack>
  );
}
```

### Paso 3: Crear `index.tsx` (pantalla principal)

```typescript
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function TeamsHome() {
  const router = useRouter();

  return (
    <View>
      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/teams/create-team')}
      >
        <Text>Crear Equipo</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Paso 4: Crear subsecciones

```typescript
// teams/create-team.tsx
export default function CreateTeam() {
  const router = useRouter();

  return (
    <View>
      <TouchableOpacity onPress={() => router.back()}>
        <Text>← Volver</Text>
      </TouchableOpacity>
      <Text>Formulario para crear equipo</Text>
    </View>
  );
}
```

## 🗺️ Rutas de Navegación

### Navegar entre subsecciones

```typescript
// Desde cualquier pantalla:

// Ir a crear partido
router.push('/(tabs)/match/create');

// Ir a mis partidos
router.push('/(tabs)/match/my-matches');

// Volver atrás
router.back();

// Reemplazar (no permite volver atrás)
router.replace('/(tabs)/match/join');
```

## 📋 Ejemplo Completo: Match

### Estructura implementada

```
match/
├── _layout.tsx           # Define las rutas
├── index.tsx             # Pantalla principal con 3 botones
├── create.tsx            # Crear partido
├── join.tsx              # Unirse a partido
└── my-matches.tsx        # Mis partidos
```

### Flujo de navegación

```
Usuario toca tab "Match"
    ↓
Se muestra: match/index.tsx
    ↓
Usuario presiona "Crear partido"
    ↓
Navega a: match/create.tsx
    ↓
Usuario presiona "← Volver"
    ↓
Regresa a: match/index.tsx
```

## 🎨 Patrones de Diseño

### Pantalla Principal (index.tsx)

```typescript
// Muestra opciones para navegar
<TouchableOpacity onPress={() => router.push('/(tabs)/match/create')}>
  <Icon />
  <Text>Crear partido</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => router.push('/(tabs)/match/join')}>
  <Icon />
  <Text>Unirse a partido</Text>
</TouchableOpacity>
```

### Subsecciones (create.tsx, join.tsx, etc.)

```typescript
// Header con botón de volver
<View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()}>
    <Icon name="arrow-back" />
  </TouchableOpacity>
  <Text>Título</Text>
</View>

// Contenido de la pantalla
<ScrollView>
  {/* Tu contenido aquí */}
</ScrollView>
```

## 🚀 Aplicar a Otros Tabs

### Para Teams:

```
teams/
├── _layout.tsx
├── index.tsx            # Lista de equipos
├── create.tsx           # Crear equipo
├── [id].tsx            # Detalles de equipo (ruta dinámica)
└── join-team.tsx       # Unirse a equipo
```

### Para Ranking:

```
ranking/
├── _layout.tsx
├── index.tsx           # Tabla general
├── players.tsx         # Ranking de jugadores
└── teams.tsx          # Ranking de equipos
```

## 🎯 Ventajas

✅ **Organización**: Cada tab tiene su propia estructura
✅ **Escalabilidad**: Fácil agregar más subsecciones
✅ **Navegación**: Back button funciona automáticamente
✅ **Aislamiento**: Cada tab maneja su propio estado

## ⚠️ Notas Importantes

1. **index.tsx siempre es la pantalla principal** que se muestra al tocar el tab

2. **_layout.tsx define todas las rutas** disponibles en ese tab

3. **Rutas completas incluyen el grupo:**
   ```typescript
   /(tabs)/match/create  ✅
   match/create          ❌
   ```

4. **Header personalizado** por pantalla:
   ```typescript
   <Stack.Screen 
     name="create" 
     options={{
       headerShown: true,
       title: "Crear Partido"
     }}
   />
   ```

## 📱 Resultado Visual

```
┌─────────────────────────────┐
│  ← FutMatch                 │  Header
├─────────────────────────────┤
│                             │
│  ⚽ Match                   │
│  Tu próxima oportunidad...  │
│                             │
│  ┌─────────────────────┐   │
│  │ + Crear partido     │   │  Botón 1 → /match/create
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 👥 Unirse a partido │   │  Botón 2 → /match/join
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ 📅 Mis Partidos     │   │  Botón 3 → /match/my-matches
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
│ ⚽  👥  🏆  👤           │  Tab Bar
└─────────────────────────────┘
```

## 🔄 Siguiente Paso

Para convertir Teams y Ranking a la misma estructura:

1. Renombra `teams.tsx` → `teams-old.tsx`
2. Crea carpeta `teams/`
3. Crea `teams/_layout.tsx` y `teams/index.tsx`
4. Mueve el contenido de `teams-old.tsx` a `teams/index.tsx`
5. Elimina `teams-old.tsx`
6. Repite para Ranking

¡Ya tienes navegación completa con subsecciones! 🎉
