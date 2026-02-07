import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/services/supabase';

interface Region {
  id: number;
  name: string;
  country_id: number;
}

interface City {
  id: number;
  name: string;
  region_id: number;
}

interface AdminUser {
  id: string;
  user_id: string;
  business_name: string;
  address: string;
  city_id: number;
  latitude: number | null;
  longitude: number | null;
  cities: {
    name: string;
    region_id: number;
  };
}

interface Court {
  id: string;
  name: string;
  sport_type: string;
  surface_type: string;
  has_lighting: boolean;
  has_parking: boolean;
  has_changing_rooms: boolean;
  price_per_hour: number;
  capacity: number;
  admin_id: string;
}

export default function CreateMatchScreen() {
  const router = useRouter();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [matchType, setMatchType] = useState('futbol');
  const [gameMode, setGameMode] = useState('mixed');
  const [price, setPrice] = useState('0');
  
  // Location & Courts state
  const [userRegionId, setUserRegionId] = useState<number | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  
  // Admin Users (Recintos) state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  
  // Courts state
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [filteredCourts, setFilteredCourts] = useState<Court[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user's region and regions list on mount
  useEffect(() => {
    loadUserRegion();
    loadRegions();
  }, []);

  // Load admin users (recintos) when region changes
  useEffect(() => {
    if (selectedRegionId) {
      loadAdminUsersByRegion(selectedRegionId);
      setSelectedAdminUserId(null);
      setSelectedCourtId(null);
      setCourts([]);
      setFilteredCourts([]);
    } else {
      setAdminUsers([]);
      setSelectedAdminUserId(null);
      setSelectedCourtId(null);
      setCourts([]);
      setFilteredCourts([]);
    }
  }, [selectedRegionId]);

  // Load courts when admin user (recinto) changes
  useEffect(() => {
    if (selectedAdminUserId) {
      loadCourtsByAdminUser(selectedAdminUserId);
    } else {
      setCourts([]);
      setFilteredCourts([]);
      setSelectedCourtId(null);
    }
  }, [selectedAdminUserId]);

  // Filter courts by match type
  useEffect(() => {
    if (courts.length > 0) {
      // Mapeo de tipos en español a inglés
      const sportTypeMap: { [key: string]: string[] } = {
        'futbol': ['football', 'soccer', 'futbol'],
        'basketball': ['basketball'],
        'volleyball': ['volleyball'],
        'tenis': ['tennis', 'tenis'],
        'paddle': ['paddle', 'padel'],
        'otro': []
      };

      const filtered = courts.filter(court => {
        if (!court.sport_type) return true; // Show courts without sport_type
        
        const acceptedTypes = sportTypeMap[matchType] || [];
        const matches = acceptedTypes.includes(court.sport_type.toLowerCase());
        
        console.log(`🎾 Filtro: ${court.name} - sport_type="${court.sport_type}", matchType="${matchType}", accepted=[${acceptedTypes}], matches=${matches}`);
        
        return matches || acceptedTypes.length === 0;
      });
      
      console.log(`🏟️ Total canchas: ${courts.length}, Filtradas: ${filtered.length}`);
      setFilteredCourts(filtered);
      
      // Reset selected court if it doesn't match the filter
      if (selectedCourtId && !filtered.find(c => c.id === selectedCourtId)) {
        setSelectedCourtId(null);
      }
    }
  }, [matchType, courts]);

  const loadUserRegion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('region_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data?.region_id) {
        setUserRegionId(data.region_id);
        setSelectedRegionId(data.region_id);
      }
    } catch (error) {
      console.error('Error loading user region:', error);
    }
  };

  const loadRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', 1) // Chile
        .order('name');
      
      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const loadAdminUsersByRegion = async (regionId: number) => {
    setIsLoadingAdminUsers(true);
    try {
      console.log('🏢 Buscando recintos para región:', regionId);
      
      // Get cities in the selected region
      const { data: cities, error: citiesError } = await supabase
        .from('cities')
        .select('id')
        .eq('region_id', regionId);
      
      if (citiesError) throw citiesError;
      
      const cityIds = cities?.map(c => c.id) || [];
      console.log('🏙️ Ciudades encontradas:', cityIds.length);
      
      if (cityIds.length === 0) {
        setAdminUsers([]);
        return;
      }

      // Get admin_users in those cities
      const { data: adminUsersData, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          id,
          user_id,
          business_name,
          address,
          city_id,
          latitude,
          longitude,
          cities (
            name,
            region_id
          )
        `)
        .in('city_id', cityIds);
      
      console.log('🏢 Recintos encontrados:', adminUsersData?.length || 0);
      
      if (adminError) {
        console.error('❌ Error loading admin_users:', adminError);
        throw adminError;
      }
      
      // Filter by region
      const filteredAdmins = (adminUsersData || []).filter(admin => 
        admin.cities?.region_id === regionId
      );
      
      console.log('✅ Recintos finales:', filteredAdmins.length);
      setAdminUsers(filteredAdmins as AdminUser[]);
    } catch (error) {
      console.error('❌ Error loading admin users:', error);
      Alert.alert('Error', 'No se pudieron cargar los recintos');
    } finally {
      setIsLoadingAdminUsers(false);
    }
  };

  const loadCourtsByAdminUser = async (adminUserId: string) => {
    setIsLoadingCourts(true);
    try {
      console.log('🏟️ Buscando canchas para recinto:', adminUserId);
      
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('admin_id', adminUserId)
        .eq('is_active', true);
      
      console.log('🏟️ Canchas encontradas:', courtsData?.length || 0, courtsData);
      
      if (courtsError) {
        console.error('❌ Error loading courts:', courtsError);
        throw courtsError;
      }
      
      setCourts((courtsData || []) as Court[]);
    } catch (error) {
      console.error('❌ Error loading courts:', error);
      Alert.alert('Error', 'No se pudieron cargar las canchas');
    } finally {
      setIsLoadingCourts(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDateTime = new Date(datetime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setDatetime(newDateTime);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDateTime = new Date(datetime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDatetime(newDateTime);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para el partido');
      return false;
    }
    if (!selectedCourtId) {
      Alert.alert('Error', 'Por favor selecciona una cancha');
      return false;
    }
    if (datetime < new Date()) {
      Alert.alert('Error', 'La fecha del partido debe ser futura');
      return false;
    }
    const players = parseInt(maxPlayers);
    if (isNaN(players) || players < 2) {
      Alert.alert('Error', 'El número de jugadores debe ser al menos 2');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para crear un partido');
        return;
      }

      const { data, error } = await supabase
        .from('matches')
        .insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            datetime: datetime.toISOString(),
            court_id: selectedCourtId,
            max_players: parseInt(maxPlayers),
            match_type: matchType,
            game_mode: gameMode,
            price: parseInt(price),
            created_by: user.id,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add creator as first player
      if (data) {
        await supabase
          .from('match_players')
          .insert([
            {
              match_id: data.id,
              player_id: user.id,
              is_captain: true
            }
          ]);
      }

      Alert.alert(
        'Éxito', 
        'Partido creado exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating match:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el partido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedCourtInfo = () => {
    if (!selectedCourtId) return null;
    return filteredCourts.find(c => c.id === selectedCourtId);
  };

  const selectedCourt = getSelectedCourtInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Crear Partido</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Pichanga de los viernes"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* Descripción */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tu partido..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>

        {/* Tipo de partido */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de partido</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={matchType}
              onValueChange={(value) => setMatchType(value)}
              style={styles.picker}
            >
              <Picker.Item label="⚽ Fútbol" value="futbol" />
              <Picker.Item label="🏀 Basketball" value="basketball" />
              <Picker.Item label="🏐 Volleyball" value="volleyball" />
              <Picker.Item label="🎾 Tenis" value="tenis" />
              <Picker.Item label="🏓 Pádel" value="paddle" />
              <Picker.Item label="⚾ Otro" value="otro" />
            </Picker>
          </View>
        </View>

        {/* Región */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Región *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedRegionId}
              onValueChange={(value) => setSelectedRegionId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona una región" value={null} />
              {regions.map((region) => (
                <Picker.Item 
                  key={region.id} 
                  label={region.name} 
                  value={region.id}
                />
              ))}
            </Picker>
          </View>
          {userRegionId && selectedRegionId === userRegionId && (
            <Text style={styles.helperText}>✓ Tu región</Text>
          )}
        </View>

        {/* Recinto/Complejo Deportivo */}
        {selectedRegionId && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Recinto / Complejo Deportivo * {isLoadingAdminUsers && '(Cargando...)'}</Text>
            {isLoadingAdminUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : adminUsers.length > 0 ? (
              <>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedAdminUserId}
                    onValueChange={(value) => setSelectedAdminUserId(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selecciona un recinto" value={null} />
                    {adminUsers.map((admin) => (
                      <Picker.Item 
                        key={admin.user_id} 
                        label={`${admin.business_name} - ${admin.cities?.name || ''}`}
                        value={admin.user_id}
                      />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.helperText}>
                  💡 En futuras versiones podrás ver los recintos en un mapa
                </Text>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                  No hay recintos deportivos en esta región
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Intenta seleccionar otra región
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Info del recinto seleccionado */}
        {selectedAdminUserId && adminUsers.find(a => a.user_id === selectedAdminUserId) && (
          <View style={styles.venueInfoCard}>
            <View style={styles.venueInfoHeader}>
              <Ionicons name="business" size={20} color="#10B981" />
              <Text style={styles.venueInfoTitle}>
                {adminUsers.find(a => a.user_id === selectedAdminUserId)?.business_name}
              </Text>
            </View>
            <View style={styles.venueInfoRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.venueInfoText}>
                {adminUsers.find(a => a.user_id === selectedAdminUserId)?.address}
              </Text>
            </View>
            <View style={styles.venueInfoRow}>
              <Ionicons name="pin-outline" size={16} color="#6B7280" />
              <Text style={styles.venueInfoText}>
                {adminUsers.find(a => a.user_id === selectedAdminUserId)?.cities?.name}
              </Text>
            </View>
          </View>
        )}

        {/* Cancha */}
        {selectedAdminUserId && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Cancha * {isLoadingCourts && '(Cargando...)'}</Text>
            {isLoadingCourts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : filteredCourts.length > 0 ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCourtId}
                  onValueChange={(value) => setSelectedCourtId(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona una cancha" value={null} />
                  {filteredCourts.map((court) => (
                    <Picker.Item 
                      key={court.id} 
                      label={court.name}
                      value={court.id}
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                  No hay canchas de {matchType} en este recinto
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Intenta seleccionar otro recinto u otro tipo de deporte
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Info de la cancha seleccionada */}
        {selectedCourt && (
          <View style={styles.courtInfoCard}>
            <View style={styles.courtInfoHeader}>
              <Ionicons name="trophy" size={20} color="#10B981" />
              <Text style={styles.courtInfoTitle}>{selectedCourt.name}</Text>
            </View>
            <View style={styles.courtInfoRow}>
              <Text style={styles.courtInfoLabel}>Superficie:</Text>
              <Text style={styles.courtInfoValue}>
                {selectedCourt.surface_type === 'synthetic_grass' ? 'Césped sintético' :
                 selectedCourt.surface_type === 'natural_grass' ? 'Césped natural' :
                 selectedCourt.surface_type === 'clay' ? 'Arcilla' :
                 selectedCourt.surface_type === 'concrete' ? 'Cemento' :
                 selectedCourt.surface_type}
              </Text>
            </View>
            <View style={styles.courtInfoRow}>
              <Text style={styles.courtInfoLabel}>Capacidad:</Text>
              <Text style={styles.courtInfoValue}>{selectedCourt.capacity} jugadores</Text>
            </View>
            <View style={styles.courtFeatures}>
              {selectedCourt.has_lighting && (
                <View style={styles.featureBadge}>
                  <Ionicons name="bulb" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Iluminación</Text>
                </View>
              )}
              {selectedCourt.has_parking && (
                <View style={styles.featureBadge}>
                  <Ionicons name="car" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Estacionamiento</Text>
                </View>
              )}
              {selectedCourt.has_changing_rooms && (
                <View style={styles.featureBadge}>
                  <Ionicons name="shirt" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Vestidores</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Fecha y Hora */}
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Fecha *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#10B981" />
              <Text style={styles.dateButtonText}>
                {datetime.toLocaleDateString('es-CL')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Hora *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#10B981" />
              <Text style={styles.dateButtonText}>
                {datetime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={datetime}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={datetime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Modo de juego */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Modo de juego</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={gameMode}
              onValueChange={(value) => setGameMode(value)}
              style={styles.picker}
            >
              <Picker.Item label="Mixto" value="mixed" />
              <Picker.Item label="Masculino" value="male" />
              <Picker.Item label="Femenino" value="female" />
            </Picker>
          </View>
        </View>

        {/* Número de jugadores y precio */}
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Jugadores máx.</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Precio ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Botón de crear */}
        <TouchableOpacity 
          style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.createButtonText}>
            {isSubmitting ? 'Creando...' : 'Crear Partido'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  venueInfoCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  venueInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  venueInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    flex: 1,
  },
  venueInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  venueInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    flex: 1,
  },
  courtInfoCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  courtInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  courtInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  courtInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  courtInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 90,
  },
  courtInfoValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  courtFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  createButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#000',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  bottomSpacer: {
    height: 40,
  },
});
