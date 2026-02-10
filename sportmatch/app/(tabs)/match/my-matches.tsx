import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getMyMatches, getMyBookings, type Match, type Booking } from '@/services/my-matches.service';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function MyMatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [matchesData, bookingsData] = await Promise.all([
        getMyMatches(user.id),
        getMyBookings(user.id),
      ]);
      setMatches(matchesData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading matches/bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        setLoading(true);
        loadData();
      }
    }, [user?.id, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleBack = useSafeBack('/(tabs)/match');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timeStr: string) => {
    return String(timeStr).substring(0, 5);
  };

  const getStatusStyle = (status: string, isBooking: boolean) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#FEF3C7', text: '#92400E' },
      confirmed: { bg: '#D1FAE5', text: '#065F46' },
      cancelled: { bg: '#FEE2E2', text: '#991B1B' },
      completed: { bg: '#DBEAFE', text: '#1E40AF' },
    };
    return styles[status] || { bg: '#F3F4F6', text: '#374151' };
  };

  const isEmpty = matches.length === 0 && bookings.length === 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Mis Partidos</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Partidos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
        }
      >
        {isEmpty ? (
          <View style={styles.emptySection}>
            <Ionicons name="calendar" size={80} color="#10B981" />
            <Text style={styles.emptySubtitle}>Tus Partidos y Reservas</Text>
            <Text style={styles.emptyDescription}>
              Aquí aparecerán los partidos donde estás inscrito y las reservas de cancha que hayas
              realizado. Los demás usuarios podrán unirse a tus reservas.
            </Text>
          </View>
        ) : (
          <>
            {/* Sección: Mis Reservas de Cancha (sportmatch-admin) */}
            {bookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mis Reservas de Cancha</Text>
                <Text style={styles.sectionSubtitle}>
                  Canchas reservadas por ti. Otros usuarios pueden unirse.
                </Text>
                {bookings.map((booking) => {
                  const statusStyle = getStatusStyle(booking.status, true);
                  return (
                    <View key={booking.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{booking.courts?.name || 'Cancha'}</Text>
                        <View style={[styles.reservedTag, { backgroundColor: '#10B981' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                          <Text style={styles.reservedTagText}>Reservada por ti</Text>
                        </View>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardInfo}>
                          {formatDate(booking.booking_date)} ·{' '}
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {STATUS_LABELS[booking.status] || booking.status}
                          </Text>
                        </View>
                        <Text style={styles.priceText}>
                          ${Number(booking.total_price).toLocaleString('es-CL')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sección: Mis Partidos (sportmatch) */}
            {matches.length > 0 && (
              <View style={[styles.section, bookings.length > 0 && styles.sectionSpaced]}>
                <Text style={styles.sectionTitle}>Mis Partidos</Text>
                <Text style={styles.sectionSubtitle}>
                  Partidos donde eres organizador o participante.
                </Text>
                {matches.map((match) => {
                  const statusStyle = getStatusStyle(match.status, false);
                  const isOrganizer = match.created_by === user?.id;
                  return (
                    <View key={match.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{match.title}</Text>
                        {isOrganizer && (
                          <View style={[styles.reservedTag, { backgroundColor: '#1F2937' }]}>
                            <Ionicons name="person" size={14} color="#FFF" />
                            <Text style={styles.reservedTagText}>Organizador</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="location-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardInfo}>
                          {match.courts?.name || 'Sin cancha'} · {match.match_type}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        <Text style={styles.cardInfo}>
                          {formatDate(match.datetime)} ·{' '}
                          {new Date(match.datetime).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {MATCH_STATUS_LABELS[match.status] || match.status}
                          </Text>
                        </View>
                        {match.price > 0 && (
                          <Text style={styles.priceText}>
                            ${match.price.toLocaleString('es-CL')}/persona
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptySubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionSpaced: {
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  reservedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reservedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardInfo: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
