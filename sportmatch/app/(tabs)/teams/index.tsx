import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamsHomeScreen() {
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
        <Text style={styles.welcomeEmoji}>🤝</Text>
        <Text style={styles.welcomeText}>
          ¡<Text style={styles.boldText}>Jugador</Text>, encuentra tu equipo ideal en la{' '}
          <Text style={styles.highlightText}>tu región</Text> o crea uno propio y compite!
        </Text>
      </View>

      {/* Botones principales */}
      <View style={styles.actionsContainer}>
        {/* Crear Equipo */}
        <TouchableOpacity
          style={[styles.actionButton, styles.createButton]}
          onPress={() => router.push('/(tabs)/teams/create')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Crear equipo</Text>
            <Text style={styles.actionSubtitle}>
              Forma tu propio equipo y recluta jugadores
            </Text>
          </View>
        </TouchableOpacity>

        {/* Equipos en tu Región */}
        <TouchableOpacity
          style={[styles.actionButton, styles.regionButton]}
          onPress={() => router.push('/(tabs)/teams/region')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={32} color="#FFF" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Equipos en tu región</Text>
            <Text style={styles.actionSubtitle}>
              Si no puedes contra ellos, únete a ellos
            </Text>
          </View>
        </TouchableOpacity>

        {/* Mis Equipos */}
        <TouchableOpacity
          style={[styles.actionButton, styles.myTeamsButton]}
          onPress={() => router.push('/(tabs)/teams/my-teams')}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="shield" size={32} color="#F97316" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionTitle, styles.myTeamsTitle]}>
              Mis Equipos
            </Text>
            <Text style={[styles.actionSubtitle, styles.myTeamsSubtitle]}>
              Visualiza los equipos donde eres creador o jugador
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
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  highlightText: {
    color: '#F97316',
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
    backgroundColor: '#F97316',
  },
  regionButton: {
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#F97316',
  },
  myTeamsButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F97316',
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
  myTeamsTitle: {
    color: '#1F2937',
  },
  myTeamsSubtitle: {
    color: '#6B7280',
  },
});
