# 🎯 Instrucciones para el Sistema de Partidos

## 📋 Resumen de Cambios

Se han implementado las siguientes funcionalidades:

1. **Migración de Base de Datos**: Tablas `matches` y `match_players`
2. **Formulario de Creación de Partidos**: Interfaz completa en React Native
3. **Integración con Sistema de Ubicación**: País, Región y Ciudad

---

## 🗄️ 1. Ejecutar la Migración en Supabase

### Opción A: Desde la consola de Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Copia el contenido del archivo:
   ```
   sportmatch-admin/supabase/migrations/005_create_matches_tables.sql
   ```
4. Pégalo en el editor y haz clic en **Run**

### Opción B: Usando Supabase CLI

```bash
cd sportmatch-admin
supabase db push
```

### ✅ Verificar la migración

Ejecuta esta consulta en el SQL Editor para verificar:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('matches', 'match_players');

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('matches', 'match_players');
```

---

## 📦 2. Instalar Dependencias en la App

Navega a la carpeta de la app y ejecuta:

```bash
cd sportmatch
npm install
```

Esto instalará las siguientes dependencias nuevas:
- `@react-native-picker/picker@2.9.0` - Para selectores de opciones
- `@react-native-community/datetimepicker@8.2.0` - Para selección de fecha y hora

---

## 🚀 3. Ejecutar la Aplicación

```bash
# Para Android
npm run android

# Para iOS
npm run ios

# Para Web
npm run web
```

---

## 📊 4. Estructura de las Tablas

### Tabla `matches`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `title` | TEXT | Título del partido * |
| `description` | TEXT | Descripción opcional |
| `datetime` | TIMESTAMP | Fecha y hora del partido * |
| `court_id` | UUID | ID de la cancha donde se juega * |
| `max_players` | INTEGER | Número máximo de jugadores |
| `match_type` | TEXT | Tipo: futbol, basketball, volleyball, etc. |
| `game_mode` | TEXT | Modo: mixed, male, female |
| `price` | INTEGER | Precio de entrada |
| `created_by` | UUID | ID del creador |
| `status` | TEXT | Estado: pending, confirmed, in_progress, completed, cancelled |
| `score_team_a` | INTEGER | Puntuación equipo A |
| `score_team_b` | INTEGER | Puntuación equipo B |
| `winning_team` | TEXT | Equipo ganador: team_a, team_b, o NULL |
| `mvp_player_id` | UUID | ID del jugador MVP |

### Tabla `match_players`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `match_id` | UUID | ID del partido |
| `player_id` | UUID | ID del jugador |
| `team` | TEXT | Equipo: team_a, team_b, o NULL |
| `position` | TEXT | Posición: GK, DF, MF, FW |
| `is_captain` | BOOLEAN | Es capitán del equipo |
| `joined_at` | TIMESTAMP | Fecha de unión al partido |

---

## 🔐 5. Políticas de Seguridad (RLS)

### Matches
- ✅ Todos pueden ver partidos públicos (pending, confirmed, in_progress, completed)
- ✅ El creador puede actualizar su partido (solo si está pending)
- ✅ Cualquier usuario autenticado puede crear partidos
- ✅ El creador puede eliminar su partido (solo si está pending)

### Match Players
- ✅ Todos pueden ver los jugadores de un partido
- ✅ Usuarios autenticados pueden unirse a partidos
- ✅ Los jugadores pueden salirse de un partido
- ✅ El creador del partido puede actualizar equipos y posiciones

---

## ⚙️ 6. Funcionalidades Automáticas

### Actualización de Estadísticas

Cuando un partido cambia a estado `completed`, se ejecuta automáticamente un trigger que:

1. Incrementa `total_matches` para todos los jugadores
2. Incrementa `wins`, `losses` o `draws` según el resultado
3. Incrementa `mvp_count` para el jugador MVP
4. Incrementa contadores de posición (`gk_count`, `df_count`, etc.)

### Trigger de Updated At

Ambas tablas tienen un trigger que actualiza automáticamente el campo `updated_at` al hacer cambios.

---

## 🎨 7. Uso del Formulario

### Campos del Formulario

**Obligatorios (*):**
- Título del partido
- Fecha
- Hora
- Tipo de partido (para filtrar canchas)
- Región (para buscar canchas)
- Cancha (del listado de canchas disponibles)

**Opcionales:**
- Descripción
- Modo de juego (default: mixto)
- Jugadores máximos (default: 10)
- Precio (default: 0)

### Flujo de Creación

1. El usuario completa el título y descripción
2. Selecciona el tipo de deporte (fútbol, basketball, etc.)
3. Selecciona una región (pre-cargada con la región del usuario)
4. El sistema carga automáticamente las canchas disponibles:
   - Filtradas por región
   - Filtradas por tipo de deporte
   - Muestra información completa de cada cancha
5. El usuario selecciona una cancha y ve su información:
   - Nombre y complejo deportivo
   - Dirección completa
   - Superficie (césped sintético, natural, etc.)
   - Características (iluminación, estacionamiento)
6. Selecciona fecha, hora y otros detalles
7. Crea el partido
8. El creador se agrega automáticamente como capitán

---

## 🐛 8. Troubleshooting

### Error: "No se pudo crear el partido"
- Verifica que el usuario esté autenticado
- Verifica que las políticas RLS estén activas
- Revisa la consola del navegador/app para más detalles

### Error: "Tablas no existen"
- Asegúrate de haber ejecutado la migración SQL
- Verifica la conexión a Supabase

### Selectores no aparecen en iOS/Android
- Ejecuta `npm install` nuevamente
- Limpia el caché: `npm run reset`
- Reconstruye la app

### DatePicker no funciona
- En Android: Se abre el selector nativo
- En iOS: Se abre el selector nativo
- En Web: Usar input type="datetime-local" alternativo

---

## 📝 9. Próximos Pasos Sugeridos

1. **Vista de Lista de Partidos**: Mostrar todos los partidos disponibles
2. **Vista de Detalle**: Ver información completa de un partido
3. **Unirse a un Partido**: Permitir a usuarios unirse
4. **Gestión de Equipos**: Asignar jugadores a equipos A y B
5. **Chat del Partido**: Comunicación entre jugadores
6. **Notificaciones**: Alertas de nuevos partidos, cambios, etc.
7. **Búsqueda y Filtros**: Por ciudad, fecha, tipo de deporte
8. **Mapa de Ubicación**: Integrar con Google Maps

---

## 💡 10. Notas Técnicas

### Integración con Supabase
El formulario usa el cliente de Supabase configurado en `@/services/supabase`. Asegúrate de que la configuración sea correcta.

### Selección de Canchas
El sistema carga canchas dinámicamente:
1. Obtiene la región del usuario desde su perfil
2. Pre-selecciona su región automáticamente
3. Busca ciudades en la región seleccionada
4. Busca admin_users con city_id en esas ciudades
5. Carga las canchas (courts) de esos administradores
6. Filtra por tipo de deporte seleccionado
7. Muestra información completa de cada cancha mediante JOIN

### Validaciones
- Título es obligatorio
- Cancha es obligatoria
- Fecha debe ser futura
- Número de jugadores mínimo: 2

### Características Especiales
- **Filtrado Inteligente**: Las canchas se filtran automáticamente por tipo de deporte
- **Pre-selección**: La región del usuario se pre-selecciona automáticamente
- **Vista Previa**: Al seleccionar una cancha, se muestra su información completa
- **Estado Vacío**: Mensaje amigable cuando no hay canchas disponibles

---

¿Necesitas ayuda? Revisa la documentación de:
- [Supabase](https://supabase.com/docs)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/docs/getting-started)
