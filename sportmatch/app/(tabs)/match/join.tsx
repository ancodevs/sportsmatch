import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { Picker } from '@react-native-picker/picker';

interface Match {
  id: string;
  title: string;
  description: string;
  datetime: string;
  match_type: string;
  game_mode: string;
  gender_mode: string;
  max_players: number;
  price: number;
  status: string;
  court_id: string;
  created_by: string;
  courts: {
    name: string;
    admin_users: {
      business_name: string;
      address: string;
      cities: {
        name: string;
        region_id: number;
      };
    };
  };
  match_players: Array<{
    id: string;
    player_id: string;
  }>;
}

export default function JoinMatchScreen() {
  const router = useRouter();
  
  // State
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRegionId, setUserRegionId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<'my_region' | 'all'>('my_region');

  useEffect(() => {
    loadUserData();
    loadMatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [matches, filterType, filterRegion, userRegionId]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('region_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserRegionId(data?.region_id || null);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      
      // Paso 1: Cargar partidos con canchas
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          description,
          datetime,
          match_type,
          game_mode,
          gender_mode,
          max_players,
          price,
          status,
          court_id,
          created_by,
          courts (
            id,
            name
          ),
          match_players (
            id,
            player_id
          )
        `)
        .in('status', ['open', 'full', 'confirmed'])
        .gte('datetime', new Date().toISOString())
        .order('datetime', { ascending: true });

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        console.log('📋 No hay partidos disponibles');
        setMatches([]);
        return;
      }

      // Paso 2: Obtener IDs únicos de admin_users de las canchas
      const courtIds = [...new Set(matchesData.map(m => m.court_id).filter(Boolean))];
      
      const { data: courtsData, error: courtsError } = await supabase
        .from('courts')
        .select('id, name, admin_id')
        .in('id', courtIds);

      if (courtsError) throw courtsError;

      const adminIds = [...new Set(courtsData?.map(c => c.admin_id).filter(Boolean))];

      // Paso 3: Obtener admin_users con ubicación
      const { data: adminUsersData, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          business_name,
          address,
          city_id,
          cities (
            name,
            region_id
          )
        `)
        .in('user_id', adminIds);

      if (adminError) throw adminError;

      // Paso 4: Combinar todos los datos
      const enrichedMatches = matchesData.map(match => {
        const court = courtsData?.find(c => c.id === match.court_id);
        const admin = adminUsersData?.find(a => a.user_id === court?.admin_id);
        
        return {
          ...match,
          courts: court ? {
            name: court.name,
            admin_users: admin ? {
              business_name: admin.business_name,
              address: admin.address,
              cities: admin.cities
            } : null
          } : null
        };
      });

      console.log('📋 Partidos cargados y enriquecidos:', enrichedMatches.length);
      setMatches(enrichedMatches as any);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', 'No se pudieron cargar los partidos');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMatches();
    setIsRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...matches];

    // Filtrar partidos cancelados y finalizados (no mostrar en lista principal)
    filtered = filtered.filter(match => 
      match.status !== 'cancelled' && match.status !== 'finished'
    );

    // Filtrar por tipo de deporte
    if (filterType !== 'all') {
      const sportTypeMap: { [key: string]: string[] } = {
        'futbol': ['football', 'soccer', 'futbol'],
        'basketball': ['basketball'],
        'volleyball': ['volleyball'],
        'tenis': ['tennis', 'tenis'],
        'paddle': ['paddle', 'padel'],
      };

      const acceptedTypes = sportTypeMap[filterType] || [];
      filtered = filtered.filter(match => 
        acceptedTypes.includes(match.match_type?.toLowerCase() || '')
      );
    }

    // Filtrar por región
    if (filterRegion === 'my_region' && userRegionId) {
      filtered = filtered.filter(match => 
        match.courts?.admin_users?.cities?.region_id === userRegionId
      );
    }

    console.log('🔍 Filtros aplicados:', {
      total: matches.length,
      filtered: filtered.length,
      type: filterType,
      region: filterRegion
    });

    setFilteredMatches(filtered);
  };

  const handleJoinMatch = async (matchId: string) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Debes iniciar sesión para unirte a un partido');
      return;
    }

    try {
      // Verificar si ya está en el partido
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const isAlreadyJoined = match.match_players.some(
        player => player.player_id === currentUserId
      );

      if (isAlreadyJoined) {
        Alert.alert('Info', 'Ya estás en este partido');
        return;
      }

      // Verificar si el partido está lleno
      if (match.match_players.length >= match.max_players) {
        Alert.alert('Partido Lleno', 'Este partido ya alcanzó el máximo de jugadores');
        return;
      }

      const { error } = await supabase
        .from('match_players')
        .insert([
          {
            match_id: matchId,
            player_id: currentUserId
          }
        ]);

      if (error) throw error;

      Alert.alert(
        '¡Éxito!', 
        'Te has unido al partido exitosamente',
        [
          {
            text: 'OK',
            onPress: () => loadMatches()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error joining match:', error);
      Alert.alert('Error', error.message || 'No se pudo unir al partido');
    }
  };

  const getMatchTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'futbol': 'football',
      'football': 'football',
      'soccer': 'football',
      'basketball': 'basketball',
      'volleyball': 'tennisball',
      'tenis': 'tennisball',
      'tennis': 'tennisball',
      'paddle': 'tennisball',
      'padel': 'tennisball',
    };
    return icons[type?.toLowerCase()] || 'fitness';
  };

  const getMatchTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'futbol': 'Fútbol',
      'football': 'Fútbol',
      'soccer': 'Fútbol',
      'basketball': 'Basketball',
      'volleyball': 'Volleyball',
      'tenis': 'Tenis',
      'tennis': 'Tenis',
      'paddle': 'Pádel',
      'padel': 'Pádel',
    };
    return labels[type?.toLowerCase()] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Hoy, ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Mañana, ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-CL', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const isUserInMatch = (match: Match) => {
    return match.match_players.some(player => player.player_id === currentUserId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Partidos Disponibles</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Deporte</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterType}
                onValueChange={(value) => setFilterType(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="all" />
                <Picker.Item label="⚽ Fútbol" value="futbol" />
                <Picker.Item label="🏀 Basketball" value="basketball" />
                <Picker.Item label="🏐 Volleyball" value="volleyball" />
                <Picker.Item label="🎾 Tenis" value="tenis" />
                <Picker.Item label="🏓 Pádel" value="paddle" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Ubicación</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterRegion}
                onValueChange={(value) => setFilterRegion(value as 'my_region' | 'all')}
                style={styles.picker}
              >
                <Picker.Item label="Mi región" value="my_region" />
                <Picker.Item label="Todas" value="all" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.resultsCounter}>
          <Text style={styles.resultsText}>
            {filteredMatches.length} {filteredMatches.length === 1 ? 'partido' : 'partidos'}
          </Text>
        </View>
      </View>

      {/* Lista de partidos */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Cargando partidos...</Text>
          </View>
        ) : filteredMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No hay partidos disponibles</Text>
            <Text style={styles.emptyStateText}>
              {filterRegion === 'my_region' 
                ? 'No hay partidos en tu región. Intenta buscar en todas las regiones.'
                : 'Sé el primero en crear un partido'
              }
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/match/create')}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Crear Partido</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMatches.map((match) => {
            const currentPlayers = match.match_players.length;
            const spotsLeft = match.max_players - currentPlayers;
            const isJoined = isUserInMatch(match);
            const isFull = currentPlayers >= match.max_players;

            return (
              <TouchableOpacity 
                key={match.id} 
                style={styles.matchCard}
                onPress={() => router.push(`/match/${match.id}`)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.matchHeader}>
                  <View style={styles.chipContainer}>
                    <View style={styles.matchTypeChip}>
                      <Ionicons 
                        name={getMatchTypeIcon(match.match_type) as any} 
                        size={16} 
                        color="#10B981" 
                      />
                      <Text style={styles.matchTypeText}>
                        {getMatchTypeLabel(match.match_type)}
                      </Text>
                    </View>
                    <View style={[styles.modeChip, styles.gameModeChip]}>
                      <Text style={styles.modeChipText}>
                        {match.game_mode === 'selection' && '🎯 Selección'}
                        {match.game_mode === 'random' && '🎲 Aleatorio'}
                        {match.game_mode === 'teams' && '👥 Equipos'}
                      </Text>
                    </View>
                    <View style={[styles.modeChip, styles.genderChip]}>
                      <Text style={styles.modeChipText}>
                        {match.gender_mode === 'mixed' && '👫'}
                        {match.gender_mode === 'male' && '👨'}
                        {match.gender_mode === 'female' && '👩'}
                      </Text>
                    </View>
                  </View>
                  {match.price > 0 && (
                    <View style={styles.priceChip}>
                      <Text style={styles.priceText}>${match.price}</Text>
                    </View>
                  )}
                </View>

                {/* Badge de Estado */}
                {match.status !== 'open' && (
                  <View style={[
                    styles.statusBadge,
                    match.status === 'full' && styles.statusBadgeFull,
                    match.status === 'confirmed' && styles.statusBadgeConfirmed
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {match.status === 'full' && '🔒 Lleno'}
                      {match.status === 'confirmed' && '✔️ Confirmado'}
                    </Text>
                  </View>
                )}

                {/* Título */}
                <Text style={styles.matchTitle}>{match.title}</Text>

                {/* Descripción */}
                {match.description && (
                  <Text style={styles.matchDescription} numberOfLines={2}>
                    {match.description}
                  </Text>
                )}

                {/* Info */}
                <View style={styles.matchInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <Text style={styles.infoText}>{formatDate(match.datetime)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {match.courts?.name} - {match.courts?.admin_users?.cities?.name}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={18} color="#6B7280" />
                    <Text style={styles.infoText}>
                      {currentPlayers}/{match.max_players} jugadores
                    </Text>
                    {spotsLeft > 0 && spotsLeft <= 3 && (
                      <Text style={styles.spotsLeftText}>
                        ({spotsLeft} {spotsLeft === 1 ? 'cupo' : 'cupos'})
                      </Text>
                    )}
                  </View>
                </View>

                {/* Botón */}
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    isJoined && styles.joinedButton,
                    isFull && styles.fullButton
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleJoinMatch(match.id);
                  }}
                  disabled={isJoined || isFull}
                >
                  <Ionicons 
                    name={isJoined ? "checkmark-circle" : isFull ? "close-circle" : "add-circle"} 
                    size={20} 
                    color="#FFF" 
                  />
                  <Text style={styles.joinButtonText}>
                    {isJoined ? 'Ya estás en este partido' : 
                     isFull ? 'Partido lleno' : 
                     'Unirme al partido'}
                  </Text>
                </TouchableOpacity>

                {/* Indicador de ver más */}
                <View style={styles.viewMoreIndicator}>
                  <Text style={styles.viewMoreText}>Toca para ver detalles</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
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
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  resultsCounter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  matchTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameModeChip: {
    backgroundColor: '#E0E7FF',
  },
  genderChip: {
    backgroundColor: '#FCE7F3',
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  priceChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeFull: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeConfirmed: {
    backgroundColor: '#DBEAFE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  matchDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  matchInfo: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  spotsLeftText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  joinedButton: {
    backgroundColor: '#6B7280',
  },
  fullButton: {
    backgroundColor: '#EF4444',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  viewMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewMoreText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  bottomSpacer: {
    height: 24,
  },
});
