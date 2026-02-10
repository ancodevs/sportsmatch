# Guía de Depuración: Selección de Equipo

## 🐛 Problema Reportado
No se puede seleccionar el equipo al unirse a un partido en modo "Selection".

## 🔍 Pasos de Depuración Implementados

He agregado varios console.logs para rastrear el flujo:

### 1. Verificar que el modal se abre
```
🎯 handleJoinMatch called with team: undefined
🎯 Current game_mode: selection
🎯 Showing team selector modal
🎯 showTeamSelector changed to: true
```

### 2. Verificar que los botones funcionan
```
🎯 Team A button pressed
🎯 handleJoinMatch called with team: A
```

### 3. Verificar la inserción en BD
```
🎯 Inserting player with team: A
```

## 📋 Lista de Verificación

### Antes de probar:
- [ ] Ejecutar migración: `cd sportmatch-admin && supabase db reset`
- [ ] Crear un partido con modo "Selección de Equipos"
- [ ] Abrir la consola del Metro Bundler para ver logs

### Al probar:
1. **Abrir detalle del partido**
   - Verificar que el partido tenga `game_mode: 'selection'`
   - Buscar en consola: `🎯 Current game_mode: selection`

2. **Presionar "Unirme al Partido"**
   - Debe aparecer el modal
   - Buscar en consola: `🎯 Showing team selector modal`
   - Buscar en consola: `🎯 showTeamSelector changed to: true`

3. **Presionar "Equipo A" o "Equipo B"**
   - Debe cerrar el modal y unir al equipo
   - Buscar en consola: `🎯 Team A button pressed`
   - Buscar en consola: `🎯 Inserting player with team: A`

## 🚨 Posibles Problemas y Soluciones

### Problema 1: No aparece el modal
**Síntoma**: No ves el fondo oscuro ni el cuadro blanco

**Posible causa**: 
- El `game_mode` no es 'selection'
- El estado `showTeamSelector` no se actualiza

**Verificar**:
```javascript
// En la consola, busca:
🎯 Current game_mode: [valor]
```

**Solución**:
- Si dice otro valor que no sea 'selection', el partido fue creado con otro modo
- Crear un nuevo partido con modo "Selección de Equipos"

### Problema 2: Modal aparece pero no responde a clicks
**Síntoma**: Ves el modal pero al presionar botones no pasa nada

**Posible causa**:
- Problema de z-index
- Otro elemento bloqueando el modal

**Verificar**:
```javascript
// Deberías ver al presionar:
🎯 Team A button pressed
```

**Solución temporal**:
Agregar `pointerEvents="box-none"` al overlay:

```typescript
<View style={styles.modalOverlay} pointerEvents="box-none">
  <View style={styles.modalContent} pointerEvents="auto">
    // ...contenido
  </View>
</View>
```

### Problema 3: Error al insertar en base de datos
**Síntoma**: Modal se cierra pero no apareces en ningún equipo

**Verificar**:
```javascript
// Busca:
❌ Error joining match: [error]
```

**Solución**:
- Verificar que ejecutaste la migración
- Verificar que el campo `team` existe en `match_players`

### Problema 4: Campo `game_mode` no se carga
**Síntoma**: `game_mode` es undefined o null

**Verificar en el query**:
```typescript
.select(`
  id,
  title,
  // ...
  game_mode,  // <- Debe estar incluido
  gender_mode,
  // ...
`)
```

**Solución**: Ya está incluido en el código actual.

## 🧪 Prueba Manual Completa

### Paso 1: Crear Partido de Prueba
1. Ir a "Crear Partido"
2. Llenar formulario
3. **IMPORTANTE**: Seleccionar "🎯 Selección de Equipos" en "Modo de Juego"
4. Crear el partido

### Paso 2: Ver Detalle
1. Ir a "Unirse a Partidos"
2. Encontrar el partido creado
3. Tocar la tarjeta para ver detalle
4. **Verificar** que aparezca:
   ```
   Modo de juego: 🎯 Selección de Equipos
   ```

### Paso 3: Unirse
1. Presionar "Unirme al Partido"
2. **Debe aparecer modal** con fondo oscuro
3. **Debe verse**:
   - Título: "Selecciona tu equipo"
   - Botón azul: "Equipo A (0 jugadores)"
   - Botón rojo: "Equipo B (0 jugadores)"
   - Botón gris: "Cancelar"

### Paso 4: Seleccionar Equipo
1. Presionar "Equipo A"
2. **Debe**:
   - Cerrarse el modal
   - Aparecer alert "¡Éxito!"
   - Verte en la lista de "Equipo A"

## 🔧 Código de Emergencia

Si el modal sigue sin funcionar, puedes usar botones simples temporalmente:

```typescript
// Reemplazar el modal por:
{showTeamSelector && (
  <View style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  }}>
    <View style={{
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 10,
      width: '80%'
    }}>
      <Text style={{fontSize: 20, marginBottom: 20}}>Selecciona equipo</Text>
      
      <TouchableOpacity 
        onPress={() => handleJoinMatch('A')}
        style={{backgroundColor: 'blue', padding: 15, marginBottom: 10}}
      >
        <Text style={{color: 'white'}}>Equipo A</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => handleJoinMatch('B')}
        style={{backgroundColor: 'red', padding: 15, marginBottom: 10}}
      >
        <Text style={{color: 'white'}}>Equipo B</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => setShowTeamSelector(false)}
        style={{padding: 15}}
      >
        <Text>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

## 📱 Captura de Logs Requerida

Por favor, copia y pega todos los logs que aparezcan en la consola cuando:
1. Abres el detalle del partido
2. Presionas "Unirme al Partido"
3. (Si aparece) Presionas "Equipo A"

Formato esperado:
```
LOG  🎯 Current game_mode: selection
LOG  🎯 handleJoinMatch called with team: undefined
LOG  🎯 Showing team selector modal
LOG  🎯 showTeamSelector changed to: true
LOG  🎯 Team A button pressed
LOG  🎯 handleJoinMatch called with team: A
LOG  🎯 Inserting player with team: A
```

## ✅ Siguiente Paso

Una vez que compartas los logs de la consola, podré identificar exactamente dónde está fallando el flujo.
