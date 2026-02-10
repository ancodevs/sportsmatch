# 🔧 Fix: Error al Finalizar Partido

## 🐛 Problema

Al intentar finalizar un partido, aparece este error:

```
ERROR: new row violates row-level security policy for table "matches"
Code: 42501
```

## 🔍 Causa

Las políticas de **Row Level Security (RLS)** de Supabase no permitían al organizador cambiar el estado a `finished`.

## ✅ Solución

He creado la migración `010_fix_finish_match_rls.sql` que actualiza las políticas RLS para permitir esta operación.

---

## 🚀 Cómo Aplicar el Fix

### Opción 1: Reset Completo (Recomendado)

```bash
cd sportmatch-admin
supabase db reset
```

**Ventajas**:
- ✅ Aplica todas las migraciones en orden
- ✅ Base de datos limpia y consistente

**Desventajas**:
- ⚠️ Borra todos los datos

### Opción 2: Solo Nueva Migración

```bash
cd sportmatch-admin
supabase db push
```

**Ventajas**:
- ✅ Mantiene los datos existentes
- ✅ Solo aplica migraciones nuevas

---

## 📋 Qué se Arregló

### Políticas RLS Actualizadas

#### 1. **SELECT** (Ver partidos)
```sql
-- Puede ver partidos:
✓ open, full, confirmed, finished (todos los usuarios)
✓ Cualquier estado si es el creador
```

#### 2. **INSERT** (Crear partidos)
```sql
-- Solo puede crear con:
✓ status = 'draft' o 'open'
✓ Debe ser auth.uid() = created_by
```

#### 3. **UPDATE** (Actualizar partidos) ⭐ **FIX PRINCIPAL**
```sql
-- El creador puede cambiar a cualquier estado:
✓ draft
✓ open
✓ full
✓ confirmed
✓ finished    ← ARREGLADO
✓ cancelled
```

---

## 🧪 Cómo Probar

### Test 1: Finalizar Partido

```
1. Crear un partido (como organizador)
2. Confirmar el partido
3. Presionar botón "Finalizar"
4. ✅ Debe cambiar a estado 'finished' sin errores
5. ✅ Banner verde "Este partido ha finalizado"
6. ✅ No aparece en lista principal
```

### Test 2: Verificar Políticas

Ejecuta en Supabase SQL Editor:

```sql
-- Ver políticas actuales
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Ver'
    WHEN cmd = 'INSERT' THEN 'Crear'
    WHEN cmd = 'UPDATE' THEN 'Actualizar'
    WHEN cmd = 'DELETE' THEN 'Eliminar'
  END as operacion
FROM pg_policies
WHERE tablename = 'matches'
ORDER BY policyname;
```

Deberías ver:
- ✅ `Organizador puede actualizar su partido` (UPDATE)
- ✅ `Usuarios pueden ver partidos disponibles` (SELECT)
- ✅ `Usuarios autenticados pueden crear partidos` (INSERT)

---

## 🔍 Verificación Manual

### Opción A: SQL Editor (Supabase Dashboard)

```sql
-- 1. Crear partido de prueba
INSERT INTO matches (title, datetime, max_players, match_type, status, created_by)
VALUES (
  'Test Finalizar',
  NOW() + INTERVAL '1 day',
  10,
  'futbol',
  'confirmed',
  auth.uid()
);

-- 2. Intentar finalizar
UPDATE matches
SET status = 'finished'
WHERE title = 'Test Finalizar'
  AND created_by = auth.uid();

-- 3. Verificar
SELECT title, status FROM matches WHERE title = 'Test Finalizar';
-- Debe mostrar: status = 'finished'

-- 4. Limpiar
DELETE FROM matches WHERE title = 'Test Finalizar';
```

### Opción B: Desde la App

```
1. Abrir la app
2. Crear partido
3. Confirmar partido
4. Presionar "Finalizar"
5. ✅ Debería funcionar sin errores
```

---

## 📊 Antes vs Después

### ❌ Antes (Con Error)

```sql
-- Política restrictiva anterior
CREATE POLICY "Organizador puede cambiar estado"
  ON matches FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('open', 'full', 'confirmed', 'cancelled')
    -- ❌ 'finished' no estaba incluido
  );
```

### ✅ Después (Arreglado)

```sql
-- Política actualizada
CREATE POLICY "Organizador puede actualizar su partido"
  ON matches FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    status IN ('draft', 'open', 'full', 'confirmed', 'finished', 'cancelled')
    -- ✅ 'finished' ahora incluido
  );
```

---

## 🎯 Estados Permitidos por Política

| Estado | Ver (SELECT) | Crear (INSERT) | Actualizar (UPDATE) |
|--------|--------------|----------------|---------------------|
| draft | Solo creador | ✅ | ✅ |
| open | ✅ Todos | ✅ | ✅ |
| full | ✅ Todos | ❌ | ✅ (automático) |
| confirmed | ✅ Todos | ❌ | ✅ |
| **finished** | ✅ Todos | ❌ | **✅ ARREGLADO** |
| cancelled | Solo creador | ❌ | ✅ |

---

## 🔧 Troubleshooting

### Error persiste después de migración

**Causa**: Cache de políticas en Supabase

**Solución**:
```bash
# Reiniciar Supabase local
supabase stop
supabase start
```

### Error: "policy already exists"

**Causa**: Política ya existe con nombre diferente

**Solución**:
```sql
-- Ver todas las políticas
SELECT policyname FROM pg_policies WHERE tablename = 'matches';

-- Eliminar todas las políticas de UPDATE
DROP POLICY IF EXISTS "nombre_aqui" ON matches;

-- Ejecutar migración de nuevo
```

### Error en producción (Supabase Cloud)

**Solución**:
1. Ir a Supabase Dashboard
2. SQL Editor
3. Copiar contenido de `010_fix_finish_match_rls.sql`
4. Ejecutar
5. Refresh de la app

---

## 📝 Checklist Post-Fix

- [ ] Ejecutar migración (`supabase db reset` o `supabase db push`)
- [ ] Verificar políticas en SQL Editor
- [ ] Probar finalizar partido en la app
- [ ] Verificar que no aparece en lista principal después de finalizar
- [ ] Verificar que aparece en tab "Historial"
- [ ] Verificar banner verde "Partido finalizado"

---

## 🎓 Explicación Técnica

### ¿Por qué pasó esto?

En la migración `008_match_status_system.sql`, la política original fue:

```sql
CREATE POLICY "Organizador puede cambiar estado"
  ON matches FOR UPDATE
  WITH CHECK (
    status IN ('draft', 'open', 'full', 'confirmed', 'cancelled')
  );
```

Cuando implementamos el estado `finished` en la migración `009`, olvidamos actualizar la política RLS para incluirlo.

### ¿Cómo funciona RLS?

```
Usuario intenta: UPDATE matches SET status = 'finished'
                          ↓
              Supabase verifica RLS
                          ↓
        WITH CHECK: status IN ('draft', 'open', ...)
                          ↓
              ❌ 'finished' no está en la lista
                          ↓
            Error 42501: Policy violation
```

Con el fix:

```
Usuario intenta: UPDATE matches SET status = 'finished'
                          ↓
              Supabase verifica RLS
                          ↓
   WITH CHECK: status IN ('draft', 'open', ..., 'finished')
                          ↓
                 ✅ 'finished' en la lista
                          ↓
                  Actualización exitosa
```

---

## 📚 Referencias

- **Archivo**: `010_fix_finish_match_rls.sql`
- **Políticas afectadas**: 
  - `Organizador puede actualizar su partido` (UPDATE)
  - `Usuarios pueden ver partidos disponibles` (SELECT)
  - `Usuarios autenticados pueden crear partidos` (INSERT)
- **Tablas**: `matches`
- **Error code**: `42501` (insufficient_privilege)

---

## ✅ Resultado Final

Después de aplicar el fix:

✅ Organizadores pueden finalizar partidos
✅ Partidos finalizados aparecen en historial
✅ No más errores de RLS
✅ Sistema completo funcional

---

**Fecha**: 7 de febrero, 2026  
**Estado**: ✅ Fix aplicado y documentado  
**Migración**: `010_fix_finish_match_rls.sql`
