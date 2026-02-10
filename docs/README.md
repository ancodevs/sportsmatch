# 📚 Documentación SportMatch

Índice central de toda la documentación del proyecto. Aquí encontrarás guías, instrucciones y referencias organizadas por tema.

---

## 🗂️ Estructura de Documentación

```
docs/
├── README.md                 ← Estás aquí (índice)
├── ESTRUCTURA_PROYECTO.md    ← Arquitectura y organización
├── DATABASE.md               ← Esquema y migraciones
│
├── app-movil/                ← App React Native (sportmatch)
├── admin/                    ← Panel Web (sportmatch-admin)
├── canchas/                  ← Sistema de canchas y recintos
├── matches/                  ← Sistema de partidos
└── guias/                    ← Guías de configuración e inicio
```

---

## 📱 App Móvil (sportmatch)

| Documento | Descripción |
|-----------|-------------|
| [README](../sportmatch/README.md) | Visión general y características |
| [Inicio Rápido](../sportmatch/INICIO_RAPIDO.md) | Configuración rápida |
| [Configuración](../sportmatch/CONFIGURACION.md) | Configuración detallada |
| [Guía Navegación Tabs](../sportmatch/GUIA_NAVEGACION_TABS.md) | Estructura de navegación |
| [Guía Player Stats](../sportmatch/GUIA_PLAYER_STATS.md) | Estadísticas de jugadores |
| [Generar Assets](../sportmatch/GENERAR_ASSETS.md) | Assets e iconos |
| [Changelog](../sportmatch/CHANGELOG.md) | Historial de cambios |

---

## 🖥️ Panel Admin (sportmatch-admin)

| Documento | Descripción |
|-----------|-------------|
| [README](../sportmatch-admin/README.md) | Visión general completa |
| [Arquitectura](../sportmatch-admin/ARQUITECTURA.md) | Diseño y estructura |
| [Cómo Empezar](../sportmatch-admin/COMO_EMPEZAR.md) | Guía de inicio |
| [Inicio Rápido](../sportmatch-admin/INICIO_RAPIDO.md) | Setup rápido |
| [Integración App Móvil](../sportmatch-admin/INTEGRACION_APP_MOVIL.md) | Conexión entre app y admin |
| [Resumen Proyecto](../sportmatch-admin/RESUMEN_PROYECTO.md) | Resumen de funcionalidades |
| [docs/](../sportmatch-admin/docs/) | Documentación adicional (ubicaciones, deportes) |

---

## 🏟️ Canchas y Recintos

| Documento | Descripción |
|-----------|-------------|
| [Actualización Canchas](canchas/ACTUALIZACION_CANCHAS.md) | Cambios del sistema de canchas |
| [Resumen Final Canchas](canchas/RESUMEN_FINAL_CANCHAS.md) | Resumen de implementación |
| [Actualización V2.1 Recintos](canchas/ACTUALIZACION_V2.1_RECINTOS.md) | Versión 2.1 de recintos |
| [Guía Mapa Recintos](canchas/GUIA_MAPA_RECINTOS.md) | Mapa y ubicación de recintos |

---

## ⚽ Partidos (Matches)

| Documento | Descripción |
|-----------|-------------|
| [Instrucciones Matches](matches/INSTRUCCIONES_MATCHES.md) | Guía de implementación |
| [Resumen Implementación](matches/RESUMEN_IMPLEMENTACION_MATCHES.md) | Resumen de cambios |

---

## 🗄️ Base de Datos

| Documento | Descripción |
|-----------|-------------|
| [DATABASE.md](DATABASE.md) | Guía del esquema y migraciones |
| [Esquema Unificado](../supabase_unified_schema.sql) | Script SQL completo |
| [Migraciones Admin](../sportmatch-admin/supabase/migrations/) | Migraciones del panel |

---

## 🚀 Inicio Rápido (Todo el Proyecto)

1. **App Móvil**: Ver [sportmatch/INICIO_RAPIDO.md](../sportmatch/INICIO_RAPIDO.md)
2. **Panel Admin**: Ver [sportmatch-admin/COMO_EMPEZAR.md](../sportmatch-admin/COMO_EMPEZAR.md)
3. **Base de Datos**: Ejecutar [supabase_unified_schema.sql](../supabase_unified_schema.sql) en Supabase

---

## 📝 Convenciones de Documentación

- Usar títulos claros con emojis para secciones
- Incluir ejemplos de código cuando sea relevante
- Mantener actualizado el Changelog al hacer cambios
- Documentar nuevas features en `docs/` antes de implementar
