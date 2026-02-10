# 🗄️ Base de Datos SportMatch

Referencia del esquema y migraciones de Supabase.

---

## 📁 Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| [supabase_unified_schema.sql](../supabase_unified_schema.sql) | Esquema completo unificado (app + admin) |
| [sportmatch-admin/supabase/migrations/](../sportmatch-admin/supabase/migrations/) | Migraciones incrementales |

---

## 📊 Tablas Principales

### Ubicación
- `countries` - Países
- `regions` - Regiones (Chile precargado)
- `cities` - Ciudades

### Usuarios
- `profiles` - Perfiles de jugadores (app móvil)
- `admin_users` - Administradores (panel)
- `player_stats` - Estadísticas de jugadores

### Canchas y Reservas
- `courts` - Canchas deportivas
- `bookings` - Reservas de canchas

### Partidos
- `matches` - Partidos creados por usuarios
- `match_players` - Jugadores en cada partido

---

## 🔄 Orden de Migraciones

1. `001_create_admin_tables.sql` - Base admin
2. `002_add_location_to_admin_users.sql`
3. `003_remove_location_from_courts.sql`
4. `004_add_sport_type_to_courts.sql`
5. `005_create_matches_tables.sql` - Partidos

---

## ⚙️ Cómo Aplicar

### Nueva instalación
Ejecutar `supabase_unified_schema.sql` en Supabase SQL Editor.

### Proyecto existente
Ejecutar migraciones en orden desde `sportmatch-admin/supabase/migrations/`.

---

## 🔐 Seguridad

Todas las tablas tienen Row Level Security (RLS) habilitado. Las políticas definen quién puede leer/escribir cada tabla.
