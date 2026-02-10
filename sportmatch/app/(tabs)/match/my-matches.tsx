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
import { supabase } from '../../../services/supabase';

interface Match {
  id: string;
  title: string;
  description: string;
  datetime: string;
  status: string;
  match_type: string;
  game_mode: string;
  gender_mode: string;
  max_players: number;
  price: number;
  created_by: string;
  courts: {
    name: string;
    admin_users: {
      business_name: string;
      address: string;
      cities: {
        name: string;
        regions: {
          name: string;
        };
      };
    } | null;
  } | null;
  match_players: any[];
}

type TabType = 'upcoming' | 'confirmed' | 'finished' | 'organized';

export default function MyMatchesScreen() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>('upcoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadMatches();
    }
  }, [currentUserId, selectedTab]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadMatches = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);

      // Paso 1: Obtener matches básicos
      let matchQuery = supabase
        .from('matches')
        .select(`
          id,
          title,
          description,
          datetime,
          status,
          match_type,
          game_mode,
          gender_mode,
          max_players,
          price,
          created_by,
          court_id
        `);

      // Filtrar según el tab seleccionado
      switch (selectedTab) {
        case 'upcoming':
          matchQuery = matchQuery.in('status', ['open', 'full']);
          break;
        case 'confirmed':
          matchQuery = matchQuery.eq('status', 'confirmed');
          break;
        case 'finished':
          matchQuery = matchQuery.eq('status', 'finished');
          break;
        case 'organized':
          matchQuery = matchQuery
            .eq('created_by', currentUserId)
            .neq('status', 'cancelled');
          break;
      }

      // Ordenar por fecha
      matchQuery = matchQuery.order('datetime', { ascending: selectedTab === 'finished' ? false : true });

      const { data: matchesData, error: matchesError } = await matchQuery;

      if (matchesError) throw matchesError;
      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        return;
      }

      // Paso 2: Obtener match_players para filtrar
      const { data: playersData, error: playersError } = await supabase
        .from('match_players')
        .select('id, match_id, player_id, team')
        .in('match_id', matchesData.map((m: any) => m.id));

      if (playersError) throw playersError;

      // Paso 3: Obtener courts
      const courtIds = matchesData
        .map((m: any) => m.court_id)
        .filter((id: any) => id !== null);

      let courtsData: any[] = [];
      if (courtIds.length > 0) {
        const { data: courts, error: courtsError } = await supabase
          .from('courts')
          .select('id, name, admin_id')
          .in('id', courtIds);

        if (courtsError) throw courtsError;
        courtsData = courts || [];
      }

      // Paso 4: Obtener admin_users
      const adminIds = courtsData
        .map((c: any) => c.admin_id)
        .filter((id: any) => id !== null);

      let adminsData: any[] = [];
      if (adminIds.length > 0) {
        const { data: admins, error: adminsError } = await supabase
          .from('admin_users')
          .select('id, business_name, address, city_id')
          .in('id', adminIds);

        if (adminsError) throw adminsError;
        adminsData = admins || [];
      }

      // Paso 5: Obtener cities
      const cityIds = adminsData
        .map((a: any) => a.city_id)
        .filter((id: any) => id !== null);

      let citiesData: any[] = [];
      if (cityIds.length > 0) {
        const { data: cities, error: citiesError } = await supabase
          .from('cities')
          .select('id, name, region_id')
          .in('id', cityIds);

        if (citiesError) throw citiesError;
        citiesData = cities || [];
      }

      // Paso 6: Obtener regions
      const regionIds = citiesData
        .map((c: any) => c.region_id)
        .filter((id: any) => id !== null);

      let regionsData: any[] = [];
      if (regionIds.length > 0) {
        const { data: regions, error: regionsError } = await supabase
          .from('regions')
          .select('id, name')
          .in('id', regionIds);

        if (regionsError) throw regionsError;
        regionsData = regions || [];
      }

      // Combinar todos los datos
      const enrichedMatches = matchesData.map((match: any) => {
        const court = courtsData.find((c: any) => c.id === match.court_id);
        const admin = court ? adminsData.find((a: any) => a.id === court.admin_id) : null;
        const city = admin ? citiesData.find((c: any) => c.id === admin.city_id) : null;
        const region = city ? regionsData.find((r: any) => r.id === city.region_id) : null;

        return {
          ...match,
          courts: court ? {
            name: court.name,
            admin_users: admin ? {
              business_name: admin.business_name,
              address: admin.address,
              cities: city ? {
                name: city.name,
                regions: region ? {
                  name: region.name
                } : null
              } : null
            } : null
          } : null,
          match_players: playersData?.filter((p: any) => p.match_id === match.id) || []
        };
      });

      // Filtrar en el cliente según participación (excepto para organized)
      let filteredMatches = enrichedMatches;
      if (selectedTab !== 'organized') {
        filteredMatches = enrichedMatches.filter((match: any) => 
          match.match_players.some((p: any) => p.player_id === currentUserId)
        );
      }

      setMatches(filteredMatches as any);
    } catch (error: any) {
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

  const formatDate = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Hoy ${timeStr}`;
    if (diffDays === 1) return `Mañana ${timeStr}`;
    if (diffDays === -1) return `Ayer ${timeStr}`;
    if (diffDays > 1 && diffDays < 7) return `En ${diffDays} días ${timeStr}`;
    
    return date.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10B981';
      case 'full': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'finished': return '#059669';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '✅ Abierto';
      case 'full': return '🔒 Lleno';
      case 'confirmed': return '✔️ Confirmado';
      case 'finished': return '🏆 Finalizado';
      default: return status;
    }
  };

  const renderMatchCard = (match: Match) => {
    const playerCount = match.match_players.length;
    const isOrganizer = match.created_by === currentUserId;

    return (
      <TouchableOpacity
        key={match.id}
        style={styles.matchCard}
        onPress={() => router.push(`/match/${match.id}`)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>
              {match.match_type === 'futbol' && '⚽ Fútbol'}
              {match.match_type === 'basketball' && '🏀 Basketball'}
              {match.match_type === 'volleyball' && '🏐 Volleyball'}
              {match.match_type === 'tenis' && '🎾 Tenis'}
              {match.match_type === 'paddle' && '🎾 Pádel'}
            </Text>
          </View>
          {isOrganizer && (
            <View style={styles.organizerBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.organizerBadgeText}>Organizador</Text>
            </View>
          )}
        </View>

        {/* Título */}
        <Text style={styles.matchTitle}>{match.title}</Text>

        {/* Estado */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(match.status) }]}>
            {getStatusLabel(match.status)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{formatDate(match.datetime)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {match.courts?.admin_users?.business_name || 'Ubicación'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {playerCount}/{match.max_players} jugadores
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Ver detalles →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Partidos</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
            onPress={() => setSelectedTab('upcoming')}
          >
            <Ionicons 
              name="calendar-outline" 
              size={20} 
              color={selectedTab === 'upcoming' ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}>
              Próximos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'confirmed' && styles.tabActive]}
            onPress={() => setSelectedTab('confirmed')}
          >
            <Ionicons 
              name="checkmark-circle-outline" 
              size={20} 
              color={selectedTab === 'confirmed' ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[styles.tabText, selectedTab === 'confirmed' && styles.tabTextActive]}>
              Confirmados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'finished' && styles.tabActive]}
            onPress={() => setSelectedTab('finished')}
          >
            <Ionicons 
              name="trophy-outline" 
              size={20} 
              color={selectedTab === 'finished' ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[styles.tabText, selectedTab === 'finished' && styles.tabTextActive]}>
              Historial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'organized' && styles.tabActive]}
            onPress={() => setSelectedTab('organized')}
          >
            <Ionicons 
              name="star-outline" 
              size={20} 
              color={selectedTab === 'organized' ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[styles.tabText, selectedTab === 'organized' && styles.tabTextActive]}>
              Organizados
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Cargando partidos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {matches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={
                  selectedTab === 'upcoming' ? 'calendar-outline' :
                  selectedTab === 'confirmed' ? 'checkmark-circle-outline' :
                  selectedTab === 'finished' ? 'trophy-outline' :
                  'star-outline'
                } 
                size={80} 
                color="#E5E7EB" 
              />
              <Text style={styles.emptyTitle}>
                {selectedTab === 'upcoming' && 'No tienes partidos próximos'}
                {selectedTab === 'confirmed' && 'No tienes partidos confirmados'}
                {selectedTab === 'finished' && 'Aún no has jugado partidos'}
                {selectedTab === 'organized' && 'No has organizado partidos'}
              </Text>
              <Text style={styles.emptyDescription}>
                {selectedTab === 'upcoming' && 'Únete a un partido desde la pestaña "Unirse"'}
                {selectedTab === 'confirmed' && 'Los partidos confirmados aparecerán aquí'}
                {selectedTab === 'finished' && 'Tu historial aparecerá aquí'}
                {selectedTab === 'organized' && 'Crea un partido desde la pestaña "Crear"'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                  {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
                </Text>
              </View>
              {matches.map(renderMatchCard)}
            </>
          )}
        </ScrollView>
      )}
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
  tabsContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statsBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeChip: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  organizerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardInfo: {
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
    color: '#6B7280',
    flex: 1,
  },
  cardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
