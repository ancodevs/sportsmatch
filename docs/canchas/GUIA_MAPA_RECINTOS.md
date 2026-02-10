# 🗺️ Guía: Implementación de Mapa para Seleccionar Recintos

## 📋 Objetivo

Permitir a los usuarios seleccionar un recinto deportivo visualmente desde un mapa interactivo, mostrando todos los complejos disponibles en la región seleccionada.

---

## 🎯 Nuevo Flujo Implementado

### Flujo Actual (v2.0)
```
1. Seleccionar Tipo de Deporte (fútbol, basketball, etc.)
   ↓
2. Seleccionar Región
   ↓
3. Seleccionar Recinto/Complejo (lista dropdown) ← AQUÍ IRÁS A MAPA
   ↓
4. Seleccionar Cancha del recinto
   ↓
5. Completar detalles del partido
```

### Ventajas del Nuevo Flujo
- ✅ Más intuitivo: Primero eliges DÓNDE (recinto), luego QUÉ cancha
- ✅ Mejor UX: Ver el recinto completo antes de elegir cancha
- ✅ Preparado para mapa: Los recintos tienen lat/long
- ✅ Escalable: Fácil agregar filtros por distancia, calificación, etc.

---

## 🗺️ Implementación del Mapa (Próxima Versión)

### Opción 1: React Native Maps (Recomendado)

#### Instalación
```bash
cd sportmatch
npx expo install react-native-maps
```

#### Componente de Mapa
```typescript
// app/(tabs)/match/components/VenueMapSelector.tsx
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminUser {
  id: string;
  user_id: string;
  business_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  cities: { name: string };
}

interface VenueMapSelectorProps {
  adminUsers: AdminUser[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
  onClose: () => void;
}

export function VenueMapSelector({ 
  adminUsers, 
  selectedId, 
  onSelect,
  onClose 
}: VenueMapSelectorProps) {
  // Calcular región inicial (centro de todos los marcadores)
  const getInitialRegion = () => {
    const validAdmins = adminUsers.filter(a => a.latitude && a.longitude);
    if (validAdmins.length === 0) {
      return {
        latitude: -33.4489, // Santiago por defecto
        longitude: -70.6693,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const avgLat = validAdmins.reduce((sum, a) => sum + (a.latitude || 0), 0) / validAdmins.length;
    const avgLng = validAdmins.reduce((sum, a) => sum + (a.longitude || 0), 0) / validAdmins.length;

    return {
      latitude: avgLat,
      longitude: avgLng,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Selecciona un Recinto</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <MapView 
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation
        showsMyLocationButton
      >
        {adminUsers
          .filter(admin => admin.latitude && admin.longitude)
          .map(admin => (
            <Marker
              key={admin.user_id}
              coordinate={{
                latitude: admin.latitude!,
                longitude: admin.longitude!,
              }}
              pinColor={selectedId === admin.user_id ? '#10B981' : '#EF4444'}
              onPress={() => onSelect(admin.user_id)}
            >
              <View style={[
                styles.markerContainer,
                selectedId === admin.user_id && styles.markerSelected
              ]}>
                <Ionicons 
                  name="business" 
                  size={24} 
                  color={selectedId === admin.user_id ? '#10B981' : '#EF4444'} 
                />
              </View>
            </Marker>
          ))
        }
      </MapView>

      {/* Info del recinto seleccionado */}
      {selectedId && (
        <View style={styles.infoCard}>
          {adminUsers
            .filter(a => a.user_id === selectedId)
            .map(admin => (
              <View key={admin.user_id}>
                <Text style={styles.infoTitle}>{admin.business_name}</Text>
                <Text style={styles.infoSubtitle}>{admin.address}</Text>
                <Text style={styles.infoCity}>{admin.cities.name}</Text>
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={onClose}
                >
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            ))
          }
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    borderColor: '#10B981',
    borderWidth: 3,
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoCity: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
```

#### Integración en el Formulario
```typescript
// app/(tabs)/match/create.tsx

// Agregar estado para el mapa
const [showMap, setShowMap] = useState(false);

// En el JSX, reemplazar el Picker con:
{selectedRegionId && (
  <View style={styles.formGroup}>
    <Text style={styles.label}>Recinto / Complejo Deportivo *</Text>
    
    {/* Botón para abrir mapa */}
    <TouchableOpacity 
      style={styles.mapButton}
      onPress={() => setShowMap(true)}
    >
      <Ionicons name="map" size={20} color="#10B981" />
      <Text style={styles.mapButtonText}>
        {selectedAdminUserId 
          ? adminUsers.find(a => a.user_id === selectedAdminUserId)?.business_name
          : 'Ver recintos en el mapa'
        }
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>

    {/* Modal del mapa */}
    <Modal
      visible={showMap}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <VenueMapSelector
        adminUsers={adminUsers}
        selectedId={selectedAdminUserId}
        onSelect={(userId) => setSelectedAdminUserId(userId)}
        onClose={() => setShowMap(false)}
      />
    </Modal>
  </View>
)}
```

---

## 📊 Datos Necesarios

### Asegurar que admin_users tiene coordenadas

```sql
-- Verificar recintos con coordenadas
SELECT 
  business_name,
  address,
  latitude,
  longitude,
  cities.name as ciudad
FROM admin_users
JOIN cities ON admin_users.city_id = cities.id
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Actualizar coordenadas de un recinto
UPDATE admin_users
SET 
  latitude = -34.1701,    -- Rancagua
  longitude = -70.7405
WHERE id = 'UUID-DEL-ADMIN';
```

### Script para obtener coordenadas automáticamente

```typescript
// utils/geocoding.ts
export async function getCoordinatesFromAddress(address: string, city: string) {
  const query = encodeURIComponent(`${address}, ${city}, Chile`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding:', error);
    return null;
  }
}
```

---

## 🎨 Características Adicionales del Mapa

### 1. Filtro por Tipo de Deporte
Mostrar solo recintos que tengan canchas del tipo seleccionado:

```typescript
const filteredAdminUsers = adminUsers.filter(admin => {
  // Verificar si el recinto tiene canchas del tipo seleccionado
  // (necesitarías cargar esta info en el query)
  return admin.has_sport_type === matchType;
});
```

### 2. Clustering de Marcadores
Para muchos recintos cercanos:

```bash
npm install react-native-maps-clustering
```

### 3. Información de Distancia
```typescript
import * as Location from 'expo-location';

// Calcular distancia desde ubicación del usuario
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

### 4. Fotos del Recinto
Agregar campo `photos` a `admin_users`:

```sql
ALTER TABLE admin_users ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Storage policy para fotos de recintos
CREATE POLICY "Cualquiera puede ver fotos de recintos"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-photos');
```

---

## 🚀 Roadmap de Implementación

### Fase 1: Preparación (Actual) ✅
- [x] Estructura de datos lista
- [x] Flujo Region → Recinto → Cancha
- [x] Campos latitude/longitude en admin_users

### Fase 2: Mapa Básico
- [ ] Instalar react-native-maps
- [ ] Crear componente VenueMapSelector
- [ ] Integrar en formulario con Modal
- [ ] Mostrar marcadores de recintos

### Fase 3: Mejoras UX
- [ ] Geocoding automático de direcciones
- [ ] Mostrar distancia desde usuario
- [ ] Filtro por tipo de deporte en mapa
- [ ] Clustering de marcadores

### Fase 4: Features Avanzados
- [ ] Fotos de recintos
- [ ] Calificaciones y reviews
- [ ] Precios estimados por cancha
- [ ] Disponibilidad en tiempo real

---

## 💡 Alternativas al Mapa

Si no quieres implementar el mapa ahora, el flujo actual es completamente funcional con:
- ✅ Lista ordenada alfabéticamente
- ✅ Muestra ciudad junto al nombre
- ✅ Info completa del recinto al seleccionar
- ✅ Preparado para migrar a mapa cuando quieras

---

**Estado Actual:** v2.0 - Selector por lista (funcional)  
**Próxima Versión:** v3.0 - Selector con mapa interactivo  
**Fecha:** 6 de febrero de 2026
