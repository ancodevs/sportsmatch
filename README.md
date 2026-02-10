# ⚽ SportMatch

Plataforma deportiva que conecta jugadores con canchas y partidos. Incluye una **app móvil** (React Native/Expo) y un **panel de administración** (Next.js).

---

## 🏗️ Estructura del Proyecto

```
sportsmatch-master/
├── README.md                    ← Estás aquí
├── docs/                        ← 📚 Toda la documentación
│   ├── README.md               ← Índice de documentación
│   ├── ESTRUCTURA_PROYECTO.md  ← Arquitectura detallada
│   ├── canchas/                ← Docs de canchas y recintos
│   └── matches/                ← Docs de partidos
│
├── sportmatch/                  ← 📱 App móvil (React Native + Expo)
├── sportmatch-admin/           ← 🖥️ Panel admin (Next.js)
└── supabase_unified_schema.sql ← 🗄️ Esquema BD completo
```

---

## 🚀 Inicio Rápido

### 1. Base de Datos (Supabase)

```bash
# Ejecutar en Supabase SQL Editor
supabase_unified_schema.sql
```

### 2. App Móvil

```bash
cd sportmatch
npm install
cp .env.example .env
# Editar .env con credenciales Supabase
npm start
```

Ver [sportmatch/INICIO_RAPIDO.md](sportmatch/INICIO_RAPIDO.md)

### 3. Panel Admin

```bash
cd sportmatch-admin
npm install
cp .env.example .env.local
npm run dev
```

Ver [sportmatch-admin/COMO_EMPEZAR.md](sportmatch-admin/COMO_EMPEZAR.md)

---

## 📚 Documentación

**Toda la documentación está centralizada en [`docs/`](docs/README.md)**

| Área | Enlace |
|------|--------|
| Índice completo | [docs/README.md](docs/README.md) |
| Estructura del proyecto | [docs/ESTRUCTURA_PROYECTO.md](docs/ESTRUCTURA_PROYECTO.md) |
| App móvil | [sportmatch/README.md](sportmatch/README.md) |
| Panel admin | [sportmatch-admin/README.md](sportmatch-admin/README.md) |
| Canchas y recintos | [docs/canchas/](docs/canchas/) |
| Partidos | [docs/matches/](docs/matches/) |

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| App móvil | React Native, Expo, TypeScript |
| Panel admin | Next.js 15, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Estado | React Context, Supabase Client |

---

## 📋 Convenciones del Proyecto

- **Documentación**: Toda nueva feature debe documentarse en `docs/`
- **Código**: Seguir las reglas en `.cursor/rules/`
- **Base de datos**: Usar migraciones en `sportmatch-admin/supabase/migrations/`
- **Changelog**: Actualizar `sportmatch/CHANGELOG.md` al modificar la app

---

## 📄 Licencia

MIT
