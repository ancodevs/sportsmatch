# 🏗️ Estructura del Proyecto SportMatch

Este documento describe la arquitectura y organización del proyecto para mantener consistencia.

---

## 📁 Árbol de Carpetas

```
sportsmatch-master/
│
├── docs/                           # Documentación centralizada
│   ├── README.md                   # Índice de documentación
│   ├── ESTRUCTURA_PROYECTO.md     # Este archivo
│   ├── canchas/                    # Documentación de canchas
│   │   ├── ACTUALIZACION_CANCHAS.md
│   │   ├── RESUMEN_FINAL_CANCHAS.md
│   │   ├── ACTUALIZACION_V2.1_RECINTOS.md
│   │   └── GUIA_MAPA_RECINTOS.md
│   └── matches/                    # Documentación de partidos
│       ├── INSTRUCCIONES_MATCHES.md
│       └── RESUMEN_IMPLEMENTACION_MATCHES.md
│
├── sportmatch/                     # App móvil
│   ├── app/                        # Rutas Expo Router
│   │   ├── (auth)/                 # Login, Signup
│   │   ├── (onboarding)/           # Onboarding
│   │   └── (tabs)/                 # Tabs principales
│   │       ├── match/              # Partidos
│   │       ├── profile/            # Perfil
│   │       ├── ranking/            # Rankings
│   │       ├── teams/              # Equipos
│   │       └── settings/           # Configuración
│   ├── components/                 # Componentes reutilizables
│   ├── contexts/                   # React Context
│   ├── services/                   # Servicios (Supabase, Auth)
│   ├── types/                      # TypeScript types
│   └── assets/                     # Imágenes, fuentes
│
├── sportmatch-admin/               # Panel web admin
│   ├── app/                        # Rutas Next.js App Router
│   │   ├── dashboard/              # Dashboard protegido
│   │   │   ├── bookings/           # Reservas
│   │   │   ├── courts/             # Canchas
│   │   │   └── settings/           # Configuración
│   │   ├── login/                  # Login
│   │   └── page.tsx                # Landing
│   ├── components/                 # Componentes UI
│   ├── lib/                        # Utilidades, Supabase
│   ├── types/                      # Tipos BD
│   ├── docs/                       # Docs específicos admin
│   └── supabase/
│       └── migrations/             # Migraciones SQL
│
└── supabase_unified_schema.sql     # Esquema BD completo
```

---

## 📋 Convenciones de Organización

### Documentación

| Tipo | Ubicación | Ejemplo |
|------|-----------|---------|
| Docs generales del proyecto | `docs/` | Guías de canchas, matches |
| Docs específicos de app móvil | `sportmatch/` | INICIO_RAPIDO.md, CONFIGURACION.md |
| Docs específicos de admin | `sportmatch-admin/` o `sportmatch-admin/docs/` | ARQUITECTURA.md, UBICACIONES.md |
| Changelog app | `sportmatch/CHANGELOG.md` | Historial de cambios |

### Código

| Tipo | Ubicación |
|------|-----------|
| Páginas/Rutas | `app/` (cada proyecto) |
| Componentes | `components/` |
| Lógica de negocio | `services/` o `lib/` |
| Tipos compartidos | `types/` |
| Contextos globales | `contexts/` |

### Base de Datos

| Tipo | Ubicación |
|------|-----------|
| Esquema completo | `supabase_unified_schema.sql` (raíz) |
| Migraciones | `sportmatch-admin/supabase/migrations/` |
| Seeds | `sportmatch-admin/supabase/seed_*.sql` |

---

## 🔄 Flujo de Datos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  App Móvil      │     │  Supabase       │     │  Panel Admin    │
│  (sportmatch)   │────▶│  (PostgreSQL +  │◀────│  (sportmatch-   │
│                 │     │   Auth +        │     │   admin)        │
│  - Jugadores    │     │   Realtime)     │     │                 │
│  - Partidos     │     │                 │     │  - Administrad. │
│  - Rankings     │     │  - profiles     │     │  - Canchas      │
│                 │     │  - courts       │     │  - Reservas     │
└─────────────────┘     │  - matches      │     └─────────────────┘
                        │  - bookings     │
                        └─────────────────┘
```

---

## ✅ Checklist para Nuevas Features

Al agregar funcionalidad nueva:

1. [ ] Crear migración SQL si hay cambios en BD
2. [ ] Documentar en `docs/` (nueva carpeta si es área nueva)
3. [ ] Actualizar `docs/README.md` con enlace al nuevo doc
4. [ ] Actualizar `sportmatch/CHANGELOG.md` si afecta la app
5. [ ] Seguir convenciones de nombres y estructura

---

## 📝 Nombre de Archivos

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Documentación | MAIUSCULAS_CON_GUIONES.md | ACTUALIZACION_CANCHAS.md |
| Componentes | PascalCase.tsx | CourtCard.tsx |
| Servicios | kebab-case.service.ts | auth.service.ts |
| Migraciones | NNN_descripcion.sql | 005_create_matches_tables.sql |
