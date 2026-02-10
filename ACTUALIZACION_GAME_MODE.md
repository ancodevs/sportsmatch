# Actualización: Modo de Juego y Género Separados

## 📋 Resumen

Se ha separado el concepto de **modo de juego** del **género del partido** para dar más flexibilidad al crear partidos.

## 🎮 Cambios Implementados

### 1. Base de Datos

Se agregó una nueva columna `gender_mode` en la tabla `matches`:

- **`game_mode`**: Define cómo se organizan los equipos
  - `selection` - Selección de Equipos (los jugadores eligen su equipo al unirse)
  - `random` - Aleatorio (se forman equipos automáticamente cuando se llena)
  - `teams` - Equipos Creados (solo equipos pre-formados pueden jugar)

- **`gender_mode`**: Define el género permitido para el partido
  - `mixed` - Mixto 👫
  - `male` - Masculino 👨
  - `female` - Femenino 👩

### 2. Migración de Datos

**Archivo**: `sportmatch-admin/supabase/migrations/006_separate_gender_from_game_mode.sql`

La migración:
1. Agrega la columna `gender_mode`
2. Migra los valores actuales de `game_mode` (mixed/male/female) → `gender_mode`
3. Actualiza `game_mode` con el valor por defecto `selection`
4. Crea índices para optimizar búsquedas
5. Agrega comentarios explicativos en la base de datos

### 3. Formulario de Creación

**Archivo**: `sportmatch/app/(tabs)/match/create.tsx`

**Cambios**:
- Agregado selector de **Modo de Juego** con 3 opciones:
  - 🎯 Selección de Equipos
  - 🎲 Aleatorio
  - 👥 Equipos Creados
- Agregado selector de **Género** con 3 opciones:
  - 👫 Mixto
  - 👨 Masculino
  - 👩 Femenino
- Texto de ayuda dinámico que explica cada modo de juego
- Estados separados: `gameMode` y `genderMode`

### 4. Pantalla de Unirse a Partidos

**Archivo**: `sportmatch/app/(tabs)/match/join.tsx`

**Cambios**:
- Actualizada la interfaz `Match` para incluir `gender_mode`
- Actualizada la query de Supabase para obtener el nuevo campo
- Las tarjetas de partido ahora muestran 3 chips:
  1. **Tipo de deporte** (Fútbol/Basketball/etc)
  2. **Modo de juego** (🎯/🎲/👥)
  3. **Género** (👫/👨/👩)
- Diseño de chips mejorado con colores distintivos

### 5. Pantalla de Detalle del Partido

**Archivo**: `sportmatch/app/(tabs)/match/[id].tsx`

**Cambios**:
- Actualizada la interfaz `Match` para incluir `gender_mode`
- Actualizada la query de Supabase
- Sección de información ahora muestra:
  - **Modo de juego**: Con icono y descripción completa
  - **Género**: Con icono de género correspondiente

## 🎨 Diseño UI/UX

### Chips en Lista de Partidos

```
┌─────────────────────────────────────┐
│ ⚽ Fútbol  🎯 Selección  👫      $500│
│                                      │
│ Pichanga del viernes                │
│ ...                                  │
└─────────────────────────────────────┘
```

- **Verde**: Tipo de deporte
- **Azul claro**: Modo de juego
- **Rosa claro**: Género
- **Amarillo**: Precio (si existe)

### Formulario de Creación

```
Modo de Juego
┌────────────────────────────────┐
│ 🎯 Selección de Equipos    ▼  │
└────────────────────────────────┘
• Los jugadores eligen su equipo al unirse

Género
┌────────────────────────────────┐
│ 👫 Mixto                    ▼  │
└────────────────────────────────┘
```

## 🔄 Flujo de Uso

### Como Organizador

1. Crear partido
2. Seleccionar **Modo de juego**:
   - **Selección**: Para partidos casuales donde los jugadores forman equipos libremente
   - **Aleatorio**: Para sortear equipos de forma justa
   - **Equipos**: Para torneos o partidos entre equipos ya formados
3. Seleccionar **Género**: Mixto, Masculino o Femenino
4. Completar resto de información

### Como Jugador

1. Ver lista de partidos disponibles
2. Los chips visuales indican rápidamente:
   - Qué tipo de deporte es
   - Cómo se organizarán los equipos
   - Quién puede participar (género)
3. Ver detalles completos del partido
4. Unirse al partido

## 📊 Migración de Datos Existentes

Todos los partidos existentes:
- `game_mode` → se copia a `gender_mode`
- `game_mode` → se actualiza a `'selection'`

Por ejemplo:
```
Antes:
- game_mode: 'mixed'

Después:
- game_mode: 'selection'
- gender_mode: 'mixed'
```

## 🚀 Próximos Pasos

### Para Modo "Selection" (Selección de Equipos)
- [ ] Al unirse, permitir que el jugador elija Equipo A o Equipo B
- [ ] Mostrar listas separadas de jugadores por equipo
- [ ] Balanceo manual de equipos

### Para Modo "Random" (Aleatorio)
- [ ] Lista única de jugadores inscritos
- [ ] Al completarse, sortear automáticamente equipos
- [ ] Algoritmo de balanceo justo

### Para Modo "Teams" (Equipos)
- [ ] Crear tabla `teams` para equipos permanentes
- [ ] Solo equipos completos pueden inscribirse
- [ ] Mostrar nombre y logo del equipo

## 🎯 Ventajas

1. **Flexibilidad**: Mixto puede ser con selección, aleatorio o equipos
2. **Claridad**: Cada concepto tiene su propio campo
3. **Escalabilidad**: Fácil agregar nuevos modos de juego
4. **UX**: Visual e intuitivo con emojis y colores
5. **Datos limpios**: Sin ambigüedad en el significado de cada campo

## 📝 Archivos Modificados

1. `sportmatch-admin/supabase/migrations/006_separate_gender_from_game_mode.sql` (NUEVO)
2. `sportmatch/app/(tabs)/match/create.tsx` (MODIFICADO)
3. `sportmatch/app/(tabs)/match/join.tsx` (MODIFICADO)
4. `sportmatch/app/(tabs)/match/[id].tsx` (MODIFICADO)

## ⚠️ Importante

Antes de usar esta actualización:

1. **Ejecutar migración**:
   ```bash
   cd sportmatch-admin
   supabase db reset
   ```

2. **Verificar datos**:
   ```sql
   SELECT id, title, game_mode, gender_mode FROM matches LIMIT 10;
   ```

3. **Probar flujos**:
   - Crear partido con cada modo de juego
   - Ver lista de partidos (verificar chips)
   - Ver detalle de partido (verificar información completa)

---

✅ **Estado**: Implementado y listo para usar
📅 **Fecha**: 6 de febrero, 2026
