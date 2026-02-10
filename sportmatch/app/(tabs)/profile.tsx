import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { locationService } from '@/services/location.service';
import { playerStatsService } from '@/services/player-stats.service';
import { Country, Region, City, PlayerStats } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUserProfile, uploadAvatar, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [gender, setGender] = useState<string>(user?.gender || '');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
  
  // Estados para ubicación
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(user?.country_id || null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(user?.region_id || null);
  const [selectedCity, setSelectedCity] = useState<number | null>(user?.city_id || null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Estados para estadísticas
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Cargar países y estadísticas al montar el componente
  useEffect(() => {
    loadCountries();
    loadPlayerStats();
  }, [user?.id]);

  // Cargar regiones cuando cambia el país
  useEffect(() => {
    if (selectedCountry) {
      loadRegions(selectedCountry);
    } else {
      setRegions([]);
      setCities([]);
      setSelectedRegion(null);
      setSelectedCity(null);
    }
  }, [selectedCountry]);

  // Cargar ciudades cuando cambia la región
  useEffect(() => {
    if (selectedRegion) {
      loadCities(selectedRegion);
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedRegion]);

  const loadCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Error al cargar países:', error);
    }
  };

  const loadPlayerStats = async () => {
    if (!user?.id) return;
    
    setLoadingStats(true);
    try {
      const playerStats = await playerStatsService.getPlayerStats(user.id);
      setStats(playerStats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRegions = async (countryId: number) => {
    setLoadingLocation(true);
    try {
      const data = await locationService.getRegionsByCountry(countryId);
      setRegions(data);
    } catch (error) {
      console.error('Error al cargar regiones:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadCities = async (regionId: number) => {
    setLoadingLocation(true);
    try {
      const data = await locationService.getCitiesByRegion(regionId);
      setCities(data);
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        bio,
        telefono,
        gender: gender as any,
        birth_date: birthDate,
        country_id: selectedCountry || undefined,
        region_id: selectedRegion || undefined,
        city_id: selectedCity || undefined,
      });
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setBio(user?.bio || '');
    setTelefono(user?.telefono || '');
    setGender(user?.gender || '');
    setBirthDate(user?.birth_date || '');
    setSelectedCountry(user?.country_id || null);
    setSelectedRegion(user?.region_id || null);
    setSelectedCity(user?.city_id || null);
    setIsEditing(false);
  };

  const handleChangeAvatar = async () => {
    Alert.alert(
      'Cambiar foto de perfil',
      'Elige una opción',
      [
        {
          text: 'Cámara',
          onPress: handleTakePhoto,
        },
        {
          text: 'Galería',
          onPress: handlePickImage,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingAvatar(true);
        await uploadAvatar(result.assets[0].uri);
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // El layout redirige automáticamente a login cuando isAuthenticated cambia
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  const onPressSignOut = () => {
    if (Platform.OS === 'web') {
      // Alert.alert no ejecuta onPress en web, usar confirm
      if (typeof window !== 'undefined' && window.confirm('¿Estás seguro que quieres cerrar sesión?')) {
        handleSignOut();
      }
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesión', style: 'destructive', onPress: handleSignOut },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={60} color="#CCC" />
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarEditButton}
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <Ionicons name="hourglass" size={20} color="#FFF" />
            ) : (
              <Ionicons name="camera" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.premiumstatus && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Sección de Estadísticas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          {stats && (
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.levelText}>Nivel {stats.current_level}</Text>
            </View>
          )}
        </View>

        {loadingStats ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statsLoadingText}>Cargando estadísticas...</Text>
          </View>
        ) : stats ? (
          <>
            {/* Estadísticas principales en cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="football" size={24} color="#007AFF" />
                <Text style={styles.statValue}>{stats.total_matches}</Text>
                <Text style={styles.statLabel}>Partidos</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="trophy" size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{stats.wins}</Text>
                <Text style={styles.statLabel}>Victorias</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="close-circle" size={24} color="#F44336" />
                <Text style={styles.statValue}>{stats.losses}</Text>
                <Text style={styles.statLabel}>Derrotas</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="git-compare" size={24} color="#FF9800" />
                <Text style={styles.statValue}>{stats.draws}</Text>
                <Text style={styles.statLabel}>Empates</Text>
              </View>
            </View>

            {/* Win Rate */}
            {stats.total_matches > 0 && (
              <View style={styles.winRateContainer}>
                <View style={styles.winRateHeader}>
                  <Text style={styles.winRateLabel}>Porcentaje de Victorias</Text>
                  <Text style={styles.winRateValue}>
                    {playerStatsService.calculateWinRate(stats).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${playerStatsService.calculateWinRate(stats)}%` }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* MVP y Posiciones */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statItemIcon}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.statItemValue}>{stats.mvp_count}</Text>
                  <Text style={styles.statItemLabel}>MVP</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statItemIcon}>
                  <Ionicons name="shield" size={20} color="#007AFF" />
                </View>
                <View>
                  <Text style={styles.statItemValue}>
                    {playerStatsService.getFavoritePosition(stats)}
                  </Text>
                  <Text style={styles.statItemLabel}>Posición Favorita</Text>
                </View>
              </View>
            </View>

            {/* Posiciones detalladas */}
            <View style={styles.positionsContainer}>
              <Text style={styles.positionsTitle}>Partidos por Posición</Text>
              <View style={styles.positionsGrid}>
                <View style={styles.positionItem}>
                  <Text style={styles.positionEmoji}>🧤</Text>
                  <Text style={styles.positionValue}>{stats.gk_count}</Text>
                  <Text style={styles.positionLabel}>Portero</Text>
                </View>
                <View style={styles.positionItem}>
                  <Text style={styles.positionEmoji}>🛡️</Text>
                  <Text style={styles.positionValue}>{stats.df_count}</Text>
                  <Text style={styles.positionLabel}>Defensa</Text>
                </View>
                <View style={styles.positionItem}>
                  <Text style={styles.positionEmoji}>⚙️</Text>
                  <Text style={styles.positionValue}>{stats.mf_count}</Text>
                  <Text style={styles.positionLabel}>Medio</Text>
                </View>
                <View style={styles.positionItem}>
                  <Text style={styles.positionEmoji}>⚡</Text>
                  <Text style={styles.positionValue}>{stats.fw_count}</Text>
                  <Text style={styles.positionLabel}>Delantero</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noStats}>
            <Ionicons name="bar-chart-outline" size={48} color="#CCC" />
            <Text style={styles.noStatsText}>No hay estadísticas disponibles</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <Input
              label="Nombre"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Tu nombre"
            />
            <Input
              label="Apellido"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Tu apellido"
            />
            <Select
              label="Género"
              value={gender}
              onValueChange={(value) => setGender(value as string)}
              placeholder="Selecciona tu género"
              options={[
                { label: 'Masculino', value: 'masculino' },
                { label: 'Femenino', value: 'femenino' },
                { label: 'Otro', value: 'otro' },
              ]}
            />
            <Input
              label="Fecha de Nacimiento"
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="AAAA-MM-DD"
            />
            <Input
              label="Biografía"
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntanos sobre ti..."
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />
            <Input
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              placeholder="+56 9 1234 5678"
              keyboardType="phone-pad"
            />
            
            <Text style={styles.sectionSubtitle}>Ubicación</Text>
            
            <Select
              label="País"
              value={selectedCountry}
              onValueChange={(value) => setSelectedCountry(value as number)}
              placeholder="Selecciona tu país"
              options={countries.map(c => ({ label: c.name, value: c.id }))}
            />
            
            {selectedCountry && (
              <Select
                label="Región"
                value={selectedRegion}
                onValueChange={(value) => setSelectedRegion(value as number)}
                placeholder="Selecciona tu región"
                options={regions.map(r => ({ label: r.name, value: r.id }))}
                disabled={loadingLocation}
              />
            )}
            
            {selectedRegion && (
              <Select
                label="Ciudad"
                value={selectedCity}
                onValueChange={(value) => setSelectedCity(value as number)}
                placeholder="Selecciona tu ciudad"
                options={cities.map(c => ({ label: c.name, value: c.id }))}
                disabled={loadingLocation}
              />
            )}
            
            <View style={styles.editButtons}>
              <Button
                title="Cancelar"
                onPress={handleCancelEdit}
                variant="outline"
                style={styles.editButton}
              />
              <Button
                title="Guardar"
                onPress={handleSaveProfile}
                loading={loading}
                style={styles.editButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>
                {user?.first_name} {user?.last_name || ''}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Género</Text>
              <Text style={styles.infoValue}>
                {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'No especificado'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
              <Text style={styles.infoValue}>{user?.birth_date || 'No especificado'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Biografía</Text>
              <Text style={styles.infoValue}>{user?.bio || 'No especificado'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{user?.telefono || 'No especificado'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ubicación</Text>
              <Text style={styles.infoValue}>
                {user?.city_id ? 'Configurado' : 'No especificado'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="settings-outline" size={24} color="#000" />
            <Text style={styles.menuItemText}>Configuración</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onPressSignOut}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
              Cerrar Sesión
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  settingsButton: {
    padding: 8,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 8,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
  },
  menuItemDanger: {
    color: '#FF3B30',
  },
  // Estilos para estadísticas
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  statsLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  statsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  winRateContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  winRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  winRateLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  winRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  statItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#666',
  },
  positionsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  positionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  positionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionItem: {
    alignItems: 'center',
    gap: 4,
  },
  positionEmoji: {
    fontSize: 24,
  },
  positionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  positionLabel: {
    fontSize: 11,
    color: '#666',
  },
  noStats: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noStatsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
});
