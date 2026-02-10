import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function MatchHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FutMatch</Text>
      </View>

      {/* Mensaje de bienvenida */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeEmoji}>⚽</Text>
        <Text style={styles.welcomeText}>
          ¡{user?.first_name}, tu próxima oportunidad te espera en la{' '}
          <Text style={styles.highlightText}>Región de O'Higgins</Text>!{' '}
          ¿Listo para jugar?
        </Text>
      </View>

      {/* Botones principales */}
      <View style={styles.actionsContainer}>
        {/* Crear Partido */}
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={() => router.push('/(tabs)/match/create')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="add-circle" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Crear partido</Text>
            <Text style={styles.actionSubtitle}>
              Organiza tu propio partido y recluta jugadores
            </Text>
          </View>
        </TouchableOpacity>

        {/* Unirse a un Partido */}
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => router.push('/(tabs)/match/join')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Unirse a un partido</Text>
            <Text style={styles.actionSubtitle}>
              Encuentra y únete a partidos cerca de ti
            </Text>
          </View>
        </TouchableOpacity>

        {/* Mis Partidos */}
        <TouchableOpacity
          style={[styles.actionButton, styles.myMatchesButton]}
          onPress={() => router.push('/(tabs)/match/my-matches')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={32} color="#10B981" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, styles.myMatchesTitle]}>
              Mis Partidos
            </Text>
            <Text style={[styles.actionSubtitle, styles.myMatchesSubtitle]}>
              Visualiza los partidos donde estás inscrito
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#064E3B',
  },
  welcomeSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  highlightText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  createButton: {
    backgroundColor: '#10B981',
  },
  joinButton: {
    backgroundColor: '#1F2937',
  },
  myMatchesButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  myMatchesTitle: {
    color: '#1F2937',
  },
  myMatchesSubtitle: {
    color: '#6B7280',
  },
});
