# 🔧 Fix: Partidos No Visibles en Join

## 🐛 Problema

Los partidos no aparecían en la pantalla "Unirse a Partido" (`join.tsx`).

## 🔍 Causa

La consulta en `join.tsx` estaba filtrando por:

```typescript
.eq('status', 'pending')
```

Pero en la migración `008_match_status_system.sql` cambiamos el estado inicial de los partidos de `'pending'` a `'open'`.

Por lo tanto:
- ❌ No había partidos con `status = 'pending'`
- ❌ La consulta devolvía 0 resultados
- ❌ La lista aparecía vacía

## ✅ Solución

Actualizar el filtro para incluir los estados visibles:

```typescript
// ANTES
.eq('status', 'pending')

// DESPUÉS
.in('status', ['open', 'full', 'confirmed'])
```

### Estados Incluidos:

| Estado | ¿Visible? | ¿Se puede unir? |
|--------|-----------|-----------------|
| `open` | ✅ | ✅ |
| `full` | ✅ | ❌ (sin cupos) |
| `confirmed` | ✅ | ❌ (ya confirmado) |
| `finished` | ❌ | ❌ |
| `cancelled` | ❌ | ❌ |

### Doble Filtrado

1. **Query SQL** (línea 123):
   ```typescript
   .in('status', ['open', 'full', 'confirmed'])
   ```
   Carga solo partidos activos desde la BD.

2. **Filtro Cliente** (línea 199-201):
   ```typescript
   filtered = filtered.filter(match => 
     match.status !== 'cancelled' && match.status !== 'finished'
   );
   ```
   Elimina cancelados y finalizados (por seguridad adicional).

## 🎯 Resultado

Ahora la pantalla muestra:

- ✅ Partidos **abiertos** (`open`) - con cupos disponibles
- ✅ Partidos **llenos** (`full`) - sin cupos, pero visibles
- ✅ Partidos **confirmados** (`confirmed`) - ya confirmados, visibles
- ❌ Partidos **finalizados** (`finished`) - ocultos
- ❌ Partidos **cancelados** (`cancelled`) - ocultos

## 📂 Archivo Modificado

- **`sportmatch/app/(tabs)/match/join.tsx`**
  - Línea 123: Cambio de `.eq('status', 'pending')` a `.in('status', ['open', 'full', 'confirmed'])`

## 🧪 Cómo Probar

### Test 1: Partidos Visibles

```
1. Crear partido (estado: open)
2. Ir a "Unirse a Partido"
3. ✅ Debe aparecer en la lista
```

### Test 2: Partido Lleno Visible

```
1. Crear partido (max 4 jugadores)
2. Llenarlo con 4 jugadores
3. Estado cambia a 'full'
4. Ir a "Unirse a Partido"
5. ✅ Debe aparecer con badge "🔒 Lleno"
```

### Test 3: Partido Confirmado Visible

```
1. Crear partido
2. Confirmarlo (como organizador)
3. Estado cambia a 'confirmed'
4. Ir a "Unirse a Partido"
5. ✅ Debe aparecer con badge "✔️ Confirmado"
```

### Test 4: Partido Finalizado NO Visible

```
1. Finalizar un partido
2. Estado cambia a 'finished'
3. Ir a "Unirse a Partido"
4. ❌ NO debe aparecer (correcto)
```

### Test 5: Partido Cancelado NO Visible

```
1. Cancelar un partido
2. Estado cambia a 'cancelled'
3. Ir a "Unirse a Partido"
4. ❌ NO debe aparecer (correcto)
```

## 📊 Antes vs Después

### ❌ Antes (Con Bug)

```typescript
Query: .eq('status', 'pending')
Resultado: 0 partidos (porque no hay 'pending')
UI: "No hay partidos disponibles"
```

### ✅ Después (Arreglado)

```typescript
Query: .in('status', ['open', 'full', 'confirmed'])
Resultado: Todos los partidos activos
UI: Lista con partidos disponibles
```

## 🔍 Otros Lugares con el Mismo Problema

Verificar si hay más referencias a `'pending'`:

```bash
# Buscar en toda la app
rg "status.*pending" sportmatch/
```

Si encuentras más referencias, cambiar de:
```typescript
.eq('status', 'pending')
```

A:
```typescript
.in('status', ['open', 'full', 'confirmed'])
```

O el estado apropiado según el contexto.

## 📝 Notas Adicionales

### Estados del Sistema

Recuerda que ahora usamos:

| Estado Anterior | Estado Nuevo | Migración |
|----------------|--------------|-----------|
| `pending` | `open` | 008 |

### Migración que lo Cambió

En `008_match_status_system.sql`:

```sql
-- Actualizar valores existentes de 'pending' a 'open'
UPDATE public.matches
SET status = 'open'
WHERE status = 'pending';
```

Y en `create.tsx`:

```typescript
// Estado inicial al crear partido
status: 'open'  // Antes era 'pending'
```

---

## ✅ Checklist de Verificación

Después del fix:

- [x] Partidos `open` visibles
- [x] Partidos `full` visibles con badge
- [x] Partidos `confirmed` visibles con badge
- [x] Partidos `finished` NO visibles
- [x] Partidos `cancelled` NO visibles
- [x] Query optimizado (filtra en BD)
- [x] Sin errores de linting
- [x] Doble filtrado (BD + cliente)

---

✅ **Estado**: Arreglado
📅 **Fecha**: 7 de febrero, 2026
🔄 **Versión**: Fix 1.0
