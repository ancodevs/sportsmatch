import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RankingHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FutMatch</Text>
      </View>

      {/* Mensaje de bienvenida */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeEmoji}>🏆</Text>
        <Text style={styles.welcomeText}>
          Revisa el ranking de los mejores jugadores o equipos en la{' '}
          <Text style={styles.highlightText}>Región de O'Higgins</Text>
        </Text>
      </View>

      {/* Botones principales */}
      <View style={styles.actionsContainer}>
        {/* Ranking Jugador */}
        <TouchableOpacity
          style={[styles.actionButton, styles.playersButton]}
          onPress={() => router.push('/(tabs)/ranking/players')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Ranking Jugador</Text>
            <Text style={styles.actionSubtitle}>
              Mira el ranking de los mejores jugadores
            </Text>
          </View>
        </TouchableOpacity>

        {/* Ranking Equipos */}
        <TouchableOpacity
          style={[styles.actionButton, styles.teamsButton]}
          onPress={() => router.push('/(tabs)/ranking/teams')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Ranking Equipos</Text>
            <Text style={styles.actionSubtitle}>
              Mira el ranking de los mejores equipos
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
  playersButton: {
    backgroundColor: '#10B981',
  },
  teamsButton: {
    backgroundColor: '#F97316',
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
});
