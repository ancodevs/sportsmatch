import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

interface Player {
  id: string;
  player_id: string;
  team: string | null;
  position: string | null;
  is_captain: boolean;
  joined_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface TeamInfo {
  name: string;
  players: Player[];
}

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
  created_by: string;
  court_id: string;
  score_team_a: number | null;
  score_team_b: number | null;
  winning_team: string | null;
  mvp_player_id: string | null;
  courts: {
    name: string;
    surface_type: string;
    has_lighting: boolean;
    has_parking: boolean;
    has_changing_rooms: boolean;
    capacity: number;
    admin_users: {
      business_name: string;
      address: string;
      cities: {
        name: string;
        region_id: number;
        regions: {
          name: string;
        };
      };
    };
  };
  creator: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Componente auxiliar para renderizar avatares
const PlayerAvatar: React.FC<{ 
  avatarUrl: string | null; 
  size?: number;
  style?: any;
}> = ({ avatarUrl, size = 48, style }) => {
  if (avatarUrl) {
    return (
      <Image 
        source={{ uri: avatarUrl }} 
        style={[
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2 
          },
          style
        ]}
      />
    );
  }
  
  return (
    <View style={[
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center'
      },
      style
    ]}>
      <Ionicons name="person" size={size * 0.5} color="#FFF" />
    </View>
  );
};

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [teamsAssigned, setTeamsAssigned] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [scoreTeamA, setScoreTeamA] = useState('');
  const [scoreTeamB, setScoreTeamB] = useState('');
  const [winningTeam, setWinningTeam] = useState<string>('');
  const [mvpPlayerId, setMvpPlayerId] = useState<string>('');
  
  // Estados para compartir resultado
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePhoto, setSharePhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareViewRef = useRef<ViewShot>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMatchDetail();
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadMatchDetail = async () => {
    try {
      setIsLoading(true);

      // Asegurar que id sea un string simple
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);

      // Paso 1: Cargar partido con cancha
      const { data: matchData, error: matchError } = await supabase
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
          created_by,
          court_id,
          score_team_a,
          score_team_b,
          winning_team,
          mvp_player_id,
          courts (
            name,
            surface_type,
            has_lighting,
            has_parking,
            has_changing_rooms,
            capacity,
            admin_id
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error('Error cargando partido:', matchError);
        throw new Error('No se encontró el partido');
      }

      console.log('✅ Partido cargado:', matchData);

      // Paso 2: Cargar admin_user de la cancha
      if (!matchData.courts?.admin_id) {
        throw new Error('La cancha no tiene un administrador asignado');
      }

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          business_name,
          address,
          city_id,
          cities (
            name,
            region_id,
            regions (
              name
            )
          )
        `)
        .eq('user_id', matchData.courts.admin_id)
        .maybeSingle();

      console.log('🏢 Admin data:', adminData);

      if (adminError) {
        console.error('Error cargando admin:', adminError);
      }

      // Paso 3: Cargar creador del partido
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, avatar_url')
        .eq('id', matchData.created_by)
        .maybeSingle();

      console.log('👤 Creator data:', creatorData);

      if (creatorError) {
        console.error('Error cargando creador:', creatorError);
      }

      // Combinar datos (con valores por defecto si faltan)
      const enrichedMatch = {
        ...matchData,
        courts: {
          ...matchData.courts,
          admin_users: adminData || {
            business_name: 'Complejo no disponible',
            address: 'Dirección no disponible',
            cities: {
              name: 'Ciudad no disponible',
              region_id: 0,
              regions: {
                name: 'Región no disponible'
              }
            }
          }
        },
        creator: creatorData || {
          first_name: null,
          last_name: null,
          avatar_url: null,
          email: 'Usuario no disponible'
        }
      };

      console.log('✅ Match enriquecido:', enrichedMatch);
      setMatch(enrichedMatch as Match);

      // Paso 4: Cargar jugadores
      await loadPlayers();
    } catch (error: any) {
      console.error('❌ Error loading match detail:', error);
      Alert.alert(
        'Error', 
        error.message || 'No se pudo cargar el partido',
        [
          {
            text: 'Volver',
            onPress: () => router.back()
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      // Asegurar que id sea un string simple
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      const { data, error } = await supabase
        .from('match_players')
        .select(`
          id,
          player_id,
          team,
          position,
          is_captain,
          joined_at,
          profiles (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('match_id', matchId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setPlayers((data || []) as Player[]);
      
      // Check if teams have been assigned for random mode
      if (match?.game_mode === 'random' && data && data.length > 0) {
        const hasTeams = data.some(p => p.team !== null);
        setTeamsAssigned(hasTeams);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMatchDetail();
    setIsRefreshing(false);
  };

  const handleJoinMatch = async (selectedTeam?: string) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    if (!match) return;

    // Validar estado del partido
    if (match.status === 'cancelled') {
      Alert.alert('Partido Cancelado', 'Este partido ha sido cancelado');
      return;
    }

    if (match.status === 'confirmed') {
      Alert.alert('Partido Confirmado', 'Este partido ya está confirmado y no acepta más jugadores');
      return;
    }

    if (match.status === 'finished') {
      Alert.alert('Partido Finalizado', 'Este partido ya terminó');
      return;
    }

    if (match.status !== 'open' && match.status !== 'full') {
      Alert.alert('No Disponible', 'Este partido no está disponible para unirse');
      return;
    }

    const isAlreadyJoined = players.some(p => p.player_id === currentUserId);
    if (isAlreadyJoined) {
      Alert.alert('Info', 'Ya estás en este partido');
      return;
    }

    if (players.length >= match.max_players) {
      Alert.alert('Partido Lleno', 'No hay cupos disponibles');
      return;
    }

    // Para modo "selection", mostrar selector de equipo
    if (match.game_mode === 'selection' && !selectedTeam) {
      setShowTeamSelector(true);
      return;
    }

    // Para modo "teams", validar que el jugador pertenezca a un equipo
    if (match.game_mode === 'teams') {
      Alert.alert('Próximamente', 'La funcionalidad de equipos estará disponible pronto');
      return;
    }

    try {
      // Asegurar que id sea un string simple, no un array ni objeto
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      // Asegurar que selectedTeam sea un string o null, no un evento
      const teamValue = (typeof selectedTeam === 'string' && selectedTeam) ? selectedTeam : null;
      
      const { data, error } = await supabase
        .from('match_players')
        .insert({ 
          match_id: matchId, 
          player_id: currentUserId,
          team: teamValue
        })
        .select();

      if (error) {
        console.error('Supabase error:', error.message);
        throw new Error(error.message || 'Error al unirse al partido');
      }
      
      Alert.alert('¡Éxito!', 'Te has unido al partido');
      setShowTeamSelector(false);
      await loadPlayers();
      await loadMatchDetail(); // Recargar para actualizar estado
      
      // Si es modo random y se llenó el partido, asignar equipos automáticamente
      if (match.game_mode === 'random' && players.length + 1 >= match.max_players) {
        await assignRandomTeams();
      }
    } catch (error: any) {
      console.error('Error joining match:', error.message || error);
      Alert.alert('Error', error.message || 'No se pudo unir');
    }
  };

  const assignRandomTeams = async () => {
    if (!match || !isCreator) return;

    try {
      // Asegurar que id sea un string simple
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      // Obtener todos los jugadores
      const { data: allPlayers, error: fetchError } = await supabase
        .from('match_players')
        .select('id, player_id')
        .eq('match_id', matchId);

      if (fetchError) throw fetchError;
      if (!allPlayers || allPlayers.length === 0) return;

      // Mezclar array aleatoriamente (Fisher-Yates shuffle)
      const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
      
      // Dividir en dos equipos
      const midpoint = Math.ceil(shuffled.length / 2);
      const teamA = shuffled.slice(0, midpoint);
      const teamB = shuffled.slice(midpoint);

      // Actualizar equipos en la base de datos
      for (const player of teamA) {
        await supabase
          .from('match_players')
          .update({ team: 'A' })
          .eq('id', player.id);
      }

      for (const player of teamB) {
        await supabase
          .from('match_players')
          .update({ team: 'B' })
          .eq('id', player.id);
      }

      Alert.alert('¡Equipos Formados!', 'Los equipos se han asignado aleatoriamente');
      setTeamsAssigned(true);
      await loadPlayers();
    } catch (error: any) {
      console.error('Error assigning teams:', error);
      Alert.alert('Error', 'No se pudieron asignar los equipos');
    }
  };

  const changeTeam = async (playerId: string, newTeam: string) => {
    if (!match || match.game_mode !== 'selection') return;

    try {
      // Asegurar que id sea un string simple
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      const { error } = await supabase
        .from('match_players')
        .update({ team: newTeam })
        .eq('match_id', matchId)
        .eq('player_id', playerId);

      if (error) throw error;
      await loadPlayers();
    } catch (error: any) {
      console.error('Error changing team:', error);
      Alert.alert('Error', 'No se pudo cambiar de equipo');
    }
  };

  const handleConfirmMatch = async () => {
    if (!match || !isCreator) return;

    // Validaciones
    if (match.status === 'confirmed') {
      Alert.alert('Info', 'El partido ya está confirmado');
      return;
    }

    if (match.status === 'cancelled') {
      Alert.alert('Error', 'No se puede confirmar un partido cancelado');
      return;
    }

    if (players.length < 4) {
      Alert.alert(
        'Pocos Jugadores',
        'Se recomienda tener al menos 4 jugadores antes de confirmar. ¿Deseas confirmar de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Confirmar',
            onPress: async () => await confirmMatch()
          }
        ]
      );
      return;
    }

    await confirmMatch();
  };

  const confirmMatch = async () => {
    try {
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      const { error } = await supabase
        .from('matches')
        .update({ status: 'confirmed' })
        .eq('id', matchId)
        .eq('created_by', currentUserId);

      if (error) throw error;

      Alert.alert('¡Confirmado!', 'El partido ha sido confirmado. Los jugadores no podrán unirse ni salir.');
      await loadMatchDetail();
    } catch (error: any) {
      console.error('Error confirming match:', error);
      Alert.alert('Error', 'No se pudo confirmar el partido');
    }
  };

  const handleCancelMatch = async () => {
    if (!match || !isCreator) return;

    if (match.status === 'cancelled') {
      Alert.alert('Info', 'El partido ya está cancelado');
      return;
    }

    Alert.alert(
      'Cancelar Partido',
      '¿Estás seguro que quieres cancelar este partido? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const matchId = Array.isArray(id) ? String(id[0]) : String(id);
              
              const { error } = await supabase
                .from('matches')
                .update({ status: 'cancelled' })
                .eq('id', matchId)
                .eq('created_by', currentUserId);

              if (error) throw error;

              Alert.alert('Cancelado', 'El partido ha sido cancelado');
              await loadMatchDetail();
            } catch (error: any) {
              console.error('Error cancelling match:', error);
              Alert.alert('Error', 'No se pudo cancelar el partido');
            }
          }
        }
      ]
    );
  };

  const handleFinishMatch = async () => {
    if (!match || !isCreator) return;

    if (match.status === 'finished') {
      Alert.alert('Info', 'El partido ya está finalizado');
      return;
    }

    if (match.status !== 'confirmed') {
      Alert.alert('Error', 'Solo se pueden finalizar partidos confirmados');
      return;
    }

    // Mostrar modal con formulario de resultados
    setShowFinishModal(true);
  };

  const submitFinishMatch = async () => {
    try {
      const matchId = Array.isArray(id) ? String(id[0]) : String(id);
      
      // Validaciones básicas
      if (scoreTeamA && isNaN(parseInt(scoreTeamA))) {
        Alert.alert('Error', 'Score Equipo A debe ser un número');
        return;
      }
      
      if (scoreTeamB && isNaN(parseInt(scoreTeamB))) {
        Alert.alert('Error', 'Score Equipo B debe ser un número');
        return;
      }

      const updateData: any = {
        status: 'finished',
        updated_at: new Date().toISOString()
      };

      // Agregar datos opcionales si se proporcionaron
      if (scoreTeamA) updateData.score_team_a = parseInt(scoreTeamA);
      if (scoreTeamB) updateData.score_team_b = parseInt(scoreTeamB);
      if (winningTeam) updateData.winning_team = winningTeam;
      if (mvpPlayerId) updateData.mvp_player_id = mvpPlayerId;

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .eq('created_by', currentUserId);

      if (error) throw error;

      // Limpiar formulario
      setScoreTeamA('');
      setScoreTeamB('');
      setWinningTeam('');
      setMvpPlayerId('');
      setShowFinishModal(false);

      Alert.alert('¡Finalizado!', 'El partido ha sido marcado como finalizado con los resultados');
      await loadMatchDetail();
    } catch (error: any) {
      console.error('Error finishing match:', error);
      Alert.alert('Error', error.message || 'No se pudo finalizar el partido');
    }
  };

  // Funciones para compartir resultado
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSharePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSharePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const captureResultCard = async () => {
    if (!shareViewRef.current) return null;
    
    try {
      setIsCapturing(true);
      const uri = await shareViewRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Error capturing view:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShareResult = async () => {
    try {
      // Capturar la tarjeta de resultado
      const resultImageUri = await captureResultCard();
      if (!resultImageUri) {
        Alert.alert('Error', 'No se pudo generar la imagen');
        return;
      }

      // Verificar si se puede compartir
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        return;
      }

      // Compartir
      await Sharing.shareAsync(resultImageUri, {
        mimeType: 'image/png',
        dialogTitle: '¡Comparte tu partido!',
      });

      Alert.alert('¡Listo!', 'Resultado compartido exitosamente');
      setShowShareModal(false);
      setSharePhoto(null);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'No se pudo compartir el resultado');
    }
  };

  const handleLeaveMatch = async () => {
    if (!currentUserId || !match) return;

    // Validar estado del partido
    if (match.status === 'confirmed') {
      Alert.alert('Partido Confirmado', 'No puedes salir de un partido confirmado. Contacta al organizador.');
      return;
    }

    if (match.status === 'finished') {
      Alert.alert('Partido Finalizado', 'No puedes salir de un partido que ya terminó');
      return;
    }

    if (match.status === 'cancelled') {
      Alert.alert('Partido Cancelado', 'Este partido ya está cancelado');
      return;
    }

    Alert.alert(
      'Salir del Partido',
      '¿Estás seguro que quieres salir de este partido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              const matchId = Array.isArray(id) ? String(id[0]) : String(id);
              
              const { error } = await supabase
                .from('match_players')
                .delete()
                .eq('match_id', matchId)
                .eq('player_id', currentUserId);

              if (error) throw error;

              Alert.alert('Éxito', 'Has salido del partido');
              await loadPlayers();
              await loadMatchDetail(); // Recargar para actualizar estado
            } catch (error: any) {
              console.error('Error leaving match:', error);
              Alert.alert('Error', error.message || 'No se pudo salir');
            }
          }
        }
      ]
    );
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

  const getSurfaceLabel = (surface: string) => {
    const labels: { [key: string]: string } = {
      'synthetic_grass': 'Césped sintético',
      'natural_grass': 'Césped natural',
      'clay': 'Arcilla',
      'concrete': 'Cemento',
      'parquet': 'Parquet',
    };
    return labels[surface] || surface;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerName = (player: Player) => {
    if (!player.profiles) return 'Usuario';
    const { first_name, last_name, email } = player.profiles;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (first_name) return first_name;
    if (email) return email.split('@')[0];
    return 'Usuario';
  };

  const getTeamsData = (): { teamA: TeamInfo; teamB: TeamInfo; noTeam: Player[] } => {
    const teamA: Player[] = [];
    const teamB: Player[] = [];
    const noTeam: Player[] = [];

    players.forEach(player => {
      if (player.team === 'A') {
        teamA.push(player);
      } else if (player.team === 'B') {
        teamB.push(player);
      } else {
        noTeam.push(player);
      }
    });

    return {
      teamA: { name: 'Equipo A', players: teamA },
      teamB: { name: 'Equipo B', players: teamB },
      noTeam
    };
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalle del Partido</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Partido no encontrado</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
    );
  }

  const isJoined = players.some(p => p.player_id === currentUserId);
  const isFull = players.length >= match.max_players;
  const isCreator = currentUserId === match.created_by;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle del Partido</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.matchTypeChip}>
            <Text style={styles.matchTypeText}>{getMatchTypeLabel(match.match_type)}</Text>
          </View>
          <Text style={styles.matchTitle}>{match.title}</Text>
          {match.description && (
            <Text style={styles.matchDescription}>{match.description}</Text>
          )}
        </View>

        {/* Resultados del Partido (solo si está finalizado) */}
        {match.status === 'finished' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultados del Partido</Text>
            
            {(match.score_team_a !== null && match.score_team_b !== null) ? (
              <View style={styles.resultsCard}>
                <View style={styles.scoreContainer}>
                  <View style={[styles.teamScoreBox, match.winning_team === 'A' && styles.winnerTeam]}>
                    <Text style={styles.teamScoreLabel}>Equipo A</Text>
                    <Text style={styles.teamScore}>{match.score_team_a}</Text>
                    {match.winning_team === 'A' && (
                      <View style={styles.winnerBadge}>
                        <Ionicons name="trophy" size={16} color="#F59E0B" />
                        <Text style={styles.winnerBadgeText}>Ganador</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.scoreSeparatorDisplay}>-</Text>
                  
                  <View style={[styles.teamScoreBox, match.winning_team === 'B' && styles.winnerTeam]}>
                    <Text style={styles.teamScoreLabel}>Equipo B</Text>
                    <Text style={styles.teamScore}>{match.score_team_b}</Text>
                    {match.winning_team === 'B' && (
                      <View style={styles.winnerBadge}>
                        <Ionicons name="trophy" size={16} color="#F59E0B" />
                        <Text style={styles.winnerBadgeText}>Ganador</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {match.winning_team === 'empate' && (
                  <View style={styles.tieMessage}>
                    <Ionicons name="hand-left-outline" size={20} color="#6B7280" />
                    <Text style={styles.tieMessageText}>Empate</Text>
                  </View>
                )}
                
                {match.mvp_player_id && (
                  <View style={styles.mvpCard}>
                    <Ionicons name="trophy" size={24} color="#F59E0B" />
                    <View style={styles.mvpInfo}>
                      <Text style={styles.mvpLabel}>Jugador MVP</Text>
                      <Text style={styles.mvpName}>
                        {(() => {
                          const mvpPlayer = players.find(p => p.player_id === match.mvp_player_id);
                          return mvpPlayer 
                            ? `${mvpPlayer.profiles?.first_name || ''} ${mvpPlayer.profiles?.last_name || ''}`.trim()
                            : 'Jugador MVP';
                        })()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noResultsCard}>
                <Ionicons name="information-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noResultsText}>
                  No se registraron resultados para este partido
                </Text>
              </View>
            )}
            
            {/* Botón de compartir resultado (solo para jugadores del partido) */}
            {isJoined && (
              <TouchableOpacity
                style={styles.shareResultButtonInline}
                onPress={() => setShowShareModal(true)}
              >
                <Ionicons name="share-social" size={20} color="#10B981" />
                <Text style={styles.shareResultButtonInlineText}>Compartir Resultado en Redes Sociales</Text>
                <Ionicons name="chevron-forward" size={20} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Partido</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#10B981" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha y Hora</Text>
                <Text style={styles.infoValue}>{formatDate(match.datetime)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#10B981" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Jugadores</Text>
                <Text style={styles.infoValue}>
                  {players.length} / {match.max_players} inscritos
                </Text>
              </View>
            </View>
          </View>

          {match.price > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="cash" size={20} color="#10B981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Precio por jugador</Text>
                  <Text style={styles.infoValue}>${match.price}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="game-controller" size={20} color="#10B981" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Modo de juego</Text>
                <Text style={styles.infoValue}>
                  {match.game_mode === 'selection' ? '🎯 Selección de Equipos' :
                   match.game_mode === 'random' ? '🎲 Aleatorio' :
                   match.game_mode === 'teams' ? '👥 Equipos Creados' : match.game_mode}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="male-female" size={20} color="#10B981" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Género</Text>
                <Text style={styles.infoValue}>
                  {match.gender_mode === 'mixed' ? '👫 Mixto' :
                   match.gender_mode === 'male' ? '👨 Masculino' :
                   match.gender_mode === 'female' ? '👩 Femenino' : match.gender_mode}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons 
                name={
                  match.status === 'open' ? 'checkmark-circle' :
                  match.status === 'full' ? 'people' :
                  match.status === 'confirmed' ? 'shield-checkmark' :
                  match.status === 'finished' ? 'trophy' :
                  match.status === 'cancelled' ? 'close-circle' :
                  'help-circle'
                } 
                size={20} 
                color={
                  match.status === 'open' ? '#10B981' :
                  match.status === 'full' ? '#F59E0B' :
                  match.status === 'confirmed' ? '#3B82F6' :
                  match.status === 'finished' ? '#059669' :
                  match.status === 'cancelled' ? '#EF4444' :
                  '#6B7280'
                } 
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text style={[
                  styles.infoValue,
                  match.status === 'open' && styles.statusOpen,
                  match.status === 'full' && styles.statusFull,
                  match.status === 'confirmed' && styles.statusConfirmed,
                  match.status === 'finished' && styles.statusFinished,
                  match.status === 'cancelled' && styles.statusCancelled
                ]}>
                  {match.status === 'draft' ? '📝 Borrador' :
                   match.status === 'open' ? '✅ Abierto' :
                   match.status === 'full' ? '🔒 Lleno' :
                   match.status === 'confirmed' ? '✔️ Confirmado' :
                   match.status === 'finished' ? '🏆 Finalizado' :
                   match.status === 'cancelled' ? '❌ Cancelado' : match.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cancha */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          
          <View style={styles.venueCard}>
            <View style={styles.venueHeader}>
              <Ionicons name="business" size={24} color="#3B82F6" />
              <Text style={styles.venueName}>
                {match.courts?.admin_users?.business_name || 'Complejo deportivo'}
              </Text>
            </View>

            <View style={styles.venueInfo}>
              <View style={styles.venueRow}>
                <Ionicons name="locate" size={18} color="#6B7280" />
                <Text style={styles.venueText}>{match.courts?.name || 'Cancha'}</Text>
              </View>
              
              <View style={styles.venueRow}>
                <Ionicons name="location" size={18} color="#6B7280" />
                <Text style={styles.venueText}>
                  {match.courts?.admin_users?.address || 'Dirección no disponible'}
                </Text>
              </View>

              <View style={styles.venueRow}>
                <Ionicons name="pin" size={18} color="#6B7280" />
                <Text style={styles.venueText}>
                  {match.courts?.admin_users?.cities?.name || 'Ciudad'}, {match.courts?.admin_users?.cities?.regions?.name || 'Región'}
                </Text>
              </View>

              <View style={styles.venueRow}>
                <Ionicons name="leaf" size={18} color="#6B7280" />
                <Text style={styles.venueText}>
                  {match.courts?.surface_type ? getSurfaceLabel(match.courts.surface_type) : 'Superficie no especificada'}
                </Text>
              </View>
            </View>

            <View style={styles.venueFeatures}>
              {match.courts?.has_lighting && (
                <View style={styles.featureBadge}>
                  <Ionicons name="bulb" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Iluminación</Text>
                </View>
              )}
              {match.courts?.has_parking && (
                <View style={styles.featureBadge}>
                  <Ionicons name="car" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Estacionamiento</Text>
                </View>
              )}
              {match.courts?.has_changing_rooms && (
                <View style={styles.featureBadge}>
                  <Ionicons name="shirt" size={14} color="#10B981" />
                  <Text style={styles.featureBadgeText}>Vestidores</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Organizador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizador</Text>
          <View style={styles.creatorCard}>
            <PlayerAvatar 
              avatarUrl={match.creator?.avatar_url || null} 
              style={styles.avatarPlaceholder}
            />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>
                {match.creator?.first_name && match.creator?.last_name
                  ? `${match.creator.first_name} ${match.creator.last_name}`
                  : match.creator?.email ? match.creator.email.split('@')[0] : 'Usuario'
                }
              </Text>
              {isCreator && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>Tú</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Lista de Jugadores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Jugadores Inscritos ({players.length}/{match.max_players})
          </Text>

          {players.length === 0 ? (
            <View style={styles.emptyPlayers}>
              <Ionicons name="person-add-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyPlayersText}>
                Sé el primero en unirte
              </Text>
            </View>
          ) : (
            <>
              {/* MODO SELECCIÓN: Mostrar equipos A y B */}
              {match.game_mode === 'selection' && (() => {
                const { teamA, teamB, noTeam } = getTeamsData();
                return (
                  <View>
                    {/* Equipo A */}
                    <View style={styles.teamSection}>
                      <View style={[styles.teamHeader, styles.teamAHeader]}>
                        <Ionicons name="shield" size={20} color="#3B82F6" />
                        <Text style={styles.teamTitle}>Equipo A ({teamA.players.length})</Text>
                      </View>
                      {teamA.players.map((player) => (
                        <View key={player.id} style={styles.playerCard}>
                          <PlayerAvatar 
                            avatarUrl={player.profiles?.avatar_url || null}
                            style={[styles.avatarPlaceholder, styles.teamAAvatar]}
                          />
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                            <Text style={styles.playerJoinDate}>
                              Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                            </Text>
                          </View>
                          {player.is_captain && (
                            <View style={styles.captainBadge}>
                              <Ionicons name="star" size={14} color="#F59E0B" />
                              <Text style={styles.captainBadgeText}>Capitán</Text>
                            </View>
                          )}
                          {player.player_id === currentUserId && (
                            <>
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>Tú</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.changeTeamButton}
                                onPress={() => changeTeam(player.player_id, 'B')}
                              >
                                <Ionicons name="swap-horizontal" size={16} color="#3B82F6" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))}
                      {teamA.players.length === 0 && (
                        <View style={styles.emptyTeam}>
                          <Text style={styles.emptyTeamText}>Sin jugadores aún</Text>
                        </View>
                      )}
                    </View>

                    {/* Equipo B */}
                    <View style={styles.teamSection}>
                      <View style={[styles.teamHeader, styles.teamBHeader]}>
                        <Ionicons name="shield" size={20} color="#EF4444" />
                        <Text style={styles.teamTitle}>Equipo B ({teamB.players.length})</Text>
                      </View>
                      {teamB.players.map((player) => (
                        <View key={player.id} style={styles.playerCard}>
                          <PlayerAvatar 
                            avatarUrl={player.profiles?.avatar_url || null}
                            style={[styles.avatarPlaceholder, styles.teamBAvatar]}
                          />
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                            <Text style={styles.playerJoinDate}>
                              Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                            </Text>
                          </View>
                          {player.is_captain && (
                            <View style={styles.captainBadge}>
                              <Ionicons name="star" size={14} color="#F59E0B" />
                              <Text style={styles.captainBadgeText}>Capitán</Text>
                            </View>
                          )}
                          {player.player_id === currentUserId && (
                            <>
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>Tú</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.changeTeamButton}
                                onPress={() => changeTeam(player.player_id, 'A')}
                              >
                                <Ionicons name="swap-horizontal" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      ))}
                      {teamB.players.length === 0 && (
                        <View style={styles.emptyTeam}>
                          <Text style={styles.emptyTeamText}>Sin jugadores aún</Text>
                        </View>
                      )}
                    </View>

                    {/* Jugadores sin equipo */}
                    {noTeam.length > 0 && (
                      <View style={styles.teamSection}>
                        <View style={[styles.teamHeader, styles.noTeamHeader]}>
                          <Ionicons name="help-circle" size={20} color="#9CA3AF" />
                          <Text style={styles.teamTitle}>Sin equipo ({noTeam.length})</Text>
                        </View>
                        {noTeam.map((player) => (
                          <View key={player.id} style={styles.playerCard}>
                            <PlayerAvatar 
                              avatarUrl={player.profiles?.avatar_url || null}
                              style={styles.avatarPlaceholder}
                            />
                            <View style={styles.playerInfo}>
                              <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                              <Text style={styles.playerJoinDate}>
                                Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* MODO ALEATORIO: Lista simple o equipos sorteados */}
              {match.game_mode === 'random' && (
                <View>
                  {!teamsAssigned ? (
                    // Lista simple antes del sorteo
                    <View>
                      <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color="#3B82F6" />
                        <Text style={styles.infoBoxText}>
                          Los equipos se sortearán automáticamente cuando el partido se llene
                        </Text>
                      </View>
                      {players.map((player) => (
                        <View key={player.id} style={styles.playerCard}>
                          <PlayerAvatar 
                            avatarUrl={player.profiles?.avatar_url || null}
                            style={styles.avatarPlaceholder}
                          />
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                            <Text style={styles.playerJoinDate}>
                              Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                            </Text>
                          </View>
                          {player.is_captain && (
                            <View style={styles.captainBadge}>
                              <Ionicons name="star" size={14} color="#F59E0B" />
                              <Text style={styles.captainBadgeText}>Capitán</Text>
                            </View>
                          )}
                          {player.player_id === currentUserId && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>Tú</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {/* Botón manual para sortear (solo organizador) */}
                      {isCreator && players.length >= 4 && (
                        <TouchableOpacity
                          style={styles.shuffleButton}
                          onPress={assignRandomTeams}
                        >
                          <Ionicons name="shuffle" size={20} color="#FFF" />
                          <Text style={styles.shuffleButtonText}>Sortear Equipos Ahora</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    // Equipos ya sorteados
                    (() => {
                      const { teamA, teamB } = getTeamsData();
                      return (
                        <View>
                          <View style={styles.successBox}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.successBoxText}>
                              ¡Equipos formados aleatoriamente!
                            </Text>
                          </View>

                          {/* Equipo A */}
                          <View style={styles.teamSection}>
                            <View style={[styles.teamHeader, styles.teamAHeader]}>
                              <Ionicons name="shield" size={20} color="#3B82F6" />
                              <Text style={styles.teamTitle}>Equipo A ({teamA.players.length})</Text>
                            </View>
                            {teamA.players.map((player) => (
                              <View key={player.id} style={styles.playerCard}>
                                <PlayerAvatar 
                                  avatarUrl={player.profiles?.avatar_url || null}
                                  style={[styles.avatarPlaceholder, styles.teamAAvatar]}
                                />
                                <View style={styles.playerInfo}>
                                  <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                                  <Text style={styles.playerJoinDate}>
                                    Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                                  </Text>
                                </View>
                                {player.is_captain && (
                                  <View style={styles.captainBadge}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={styles.captainBadgeText}>Capitán</Text>
                                  </View>
                                )}
                                {player.player_id === currentUserId && (
                                  <View style={styles.youBadge}>
                                    <Text style={styles.youBadgeText}>Tú</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>

                          {/* Equipo B */}
                          <View style={styles.teamSection}>
                            <View style={[styles.teamHeader, styles.teamBHeader]}>
                              <Ionicons name="shield" size={20} color="#EF4444" />
                              <Text style={styles.teamTitle}>Equipo B ({teamB.players.length})</Text>
                            </View>
                            {teamB.players.map((player) => (
                              <View key={player.id} style={styles.playerCard}>
                                <PlayerAvatar 
                                  avatarUrl={player.profiles?.avatar_url || null}
                                  style={[styles.avatarPlaceholder, styles.teamBAvatar]}
                                />
                                <View style={styles.playerInfo}>
                                  <Text style={styles.playerName}>{getPlayerName(player)}</Text>
                                  <Text style={styles.playerJoinDate}>
                                    Unido {new Date(player.joined_at).toLocaleDateString('es-CL')}
                                  </Text>
                                </View>
                                {player.is_captain && (
                                  <View style={styles.captainBadge}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={styles.captainBadgeText}>Capitán</Text>
                                  </View>
                                )}
                                {player.player_id === currentUserId && (
                                  <View style={styles.youBadge}>
                                    <Text style={styles.youBadgeText}>Tú</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })()
                  )}
                </View>
              )}

              {/* MODO EQUIPOS: Para equipos creados (próximamente) */}
              {match.game_mode === 'teams' && (
                <View style={styles.comingSoonBox}>
                  <Ionicons name="construct" size={48} color="#9CA3AF" />
                  <Text style={styles.comingSoonText}>
                    La funcionalidad de equipos creados estará disponible pronto
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botón fijo abajo */}
      {!isCreator && match.status !== 'cancelled' && match.status !== 'confirmed' && match.status !== 'finished' && (
        <View style={styles.footer}>
          {isJoined ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.leaveButton]}
              onPress={handleLeaveMatch}
            >
              <Ionicons name="exit-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Salir del Partido</Text>
            </TouchableOpacity>
          ) : isFull ? (
            <View style={[styles.actionButton, styles.fullButton]}>
              <Ionicons name="close-circle" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Partido Lleno</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleJoinMatch()}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Unirme al Partido</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Botones de Organizador */}
      {isCreator && match.status !== 'cancelled' && match.status !== 'finished' && (
        <View style={styles.footer}>
          {match.status === 'confirmed' ? (
            <View style={styles.organizerActions}>
              <TouchableOpacity
                style={[styles.organizerButton, styles.finishButton]}
                onPress={handleFinishMatch}
              >
                <Ionicons name="trophy" size={20} color="#FFF" />
                <Text style={styles.organizerButtonText}>Finalizar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.organizerButton, styles.cancelButton]}
                onPress={handleCancelMatch}
              >
                <Ionicons name="close-circle" size={20} color="#FFF" />
                <Text style={styles.organizerButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.organizerActions}>
              <TouchableOpacity
                style={[styles.organizerButton, styles.confirmButton]}
                onPress={handleConfirmMatch}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.organizerButtonText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.organizerButton, styles.cancelButton]}
                onPress={handleCancelMatch}
              >
                <Ionicons name="close-circle" size={20} color="#FFF" />
                <Text style={styles.organizerButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Banner si el partido está finalizado - Con botón de compartir */}
      {match.status === 'finished' && isJoined && (
        <View style={styles.finishedBanner}>
          <View style={styles.finishedBannerContent}>
            <Ionicons name="trophy" size={24} color="#059669" />
            <Text style={styles.finishedText}>Este partido ha finalizado</Text>
          </View>
          <TouchableOpacity
            style={styles.shareResultButton}
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share-social" size={20} color="#FFF" />
            <Text style={styles.shareResultButtonText}>Compartir Resultado</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Banner si el partido está cancelado */}
      {match.status === 'cancelled' && (
        <View style={styles.cancelledBanner}>
          <Ionicons name="close-circle" size={24} color="#EF4444" />
          <Text style={styles.cancelledText}>Este partido ha sido cancelado</Text>
        </View>
      )}

      {/* Modal de Selección de Equipo */}
      {showTeamSelector && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setShowTeamSelector(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu equipo</Text>
            <Text style={styles.modalSubtitle}>
              Elige el equipo al que quieres unirte
            </Text>

            <TouchableOpacity
              style={[styles.teamSelectButton, styles.teamAButton]}
              onPress={() => handleJoinMatch('A')}
            >
              <Ionicons name="shield" size={32} color="#3B82F6" />
              <View style={styles.teamSelectInfo}>
                <Text style={styles.teamSelectName}>Equipo A</Text>
                <Text style={styles.teamSelectCount}>
                  {players.length > 0 ? getTeamsData().teamA.players.length : 0} jugadores
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teamSelectButton, styles.teamBButton]}
              onPress={() => handleJoinMatch('B')}
            >
              <Ionicons name="shield" size={32} color="#EF4444" />
              <View style={styles.teamSelectInfo}>
                <Text style={styles.teamSelectName}>Equipo B</Text>
                <Text style={styles.teamSelectCount}>
                  {players.length > 0 ? getTeamsData().teamB.players.length : 0} jugadores
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTeamSelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal de Finalización con Resultados */}
      <Modal
        visible={showFinishModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            onPress={() => setShowFinishModal(false)}
            activeOpacity={1}
          />
          <View style={styles.finishModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.finishModalTitle}>Finalizar Partido</Text>
              <Text style={styles.finishModalSubtitle}>
                Registra los resultados del partido (opcional)
              </Text>

              {/* Scores */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Marcador</Text>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreInput}>
                    <Text style={styles.scoreLabel}>Equipo A</Text>
                    <TextInput
                      style={styles.scoreTextInput}
                      value={scoreTeamA}
                      onChangeText={setScoreTeamA}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInput}>
                    <Text style={styles.scoreLabel}>Equipo B</Text>
                    <TextInput
                      style={styles.scoreTextInput}
                      value={scoreTeamB}
                      onChangeText={setScoreTeamB}
                      placeholder="0"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>

              {/* Equipo Ganador */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Equipo Ganador</Text>
                <View style={styles.teamOptions}>
                  <TouchableOpacity
                    style={[
                      styles.teamOption,
                      winningTeam === 'A' && styles.teamOptionSelected
                    ]}
                    onPress={() => setWinningTeam('A')}
                  >
                    <Ionicons 
                      name={winningTeam === 'A' ? 'radio-button-on' : 'radio-button-off'} 
                      size={24} 
                      color={winningTeam === 'A' ? '#3B82F6' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.teamOptionText,
                      winningTeam === 'A' && styles.teamOptionTextSelected
                    ]}>
                      Equipo A
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.teamOption,
                      winningTeam === 'B' && styles.teamOptionSelected
                    ]}
                    onPress={() => setWinningTeam('B')}
                  >
                    <Ionicons 
                      name={winningTeam === 'B' ? 'radio-button-on' : 'radio-button-off'} 
                      size={24} 
                      color={winningTeam === 'B' ? '#3B82F6' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.teamOptionText,
                      winningTeam === 'B' && styles.teamOptionTextSelected
                    ]}>
                      Equipo B
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.teamOption,
                      winningTeam === 'empate' && styles.teamOptionSelected
                    ]}
                    onPress={() => setWinningTeam('empate')}
                  >
                    <Ionicons 
                      name={winningTeam === 'empate' ? 'radio-button-on' : 'radio-button-off'} 
                      size={24} 
                      color={winningTeam === 'empate' ? '#3B82F6' : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.teamOptionText,
                      winningTeam === 'empate' && styles.teamOptionTextSelected
                    ]}>
                      Empate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* MVP */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Jugador MVP (Mejor Jugador)</Text>
                <ScrollView style={styles.playersList} nestedScrollEnabled>
                  {players.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerOption,
                        mvpPlayerId === player.player_id && styles.playerOptionSelected
                      ]}
                      onPress={() => setMvpPlayerId(player.player_id)}
                    >
                      <Ionicons 
                        name={mvpPlayerId === player.player_id ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={mvpPlayerId === player.player_id ? '#3B82F6' : '#9CA3AF'}
                      />
                      <View style={styles.playerOptionInfo}>
                        <Text style={[
                          styles.playerOptionName,
                          mvpPlayerId === player.player_id && styles.playerOptionNameSelected
                        ]}>
                          {player.profiles?.first_name} {player.profiles?.last_name || ''}
                        </Text>
                        {player.team && (
                          <Text style={styles.playerOptionTeam}>
                            Equipo {player.team}
                          </Text>
                        )}
                      </View>
                      {mvpPlayerId === player.player_id && (
                        <Ionicons name="trophy" size={20} color="#F59E0B" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Botones */}
              <View style={styles.finishModalActions}>
                <TouchableOpacity
                  style={[styles.finishModalButton, styles.finishModalCancelButton]}
                  onPress={() => {
                    setShowFinishModal(false);
                    setScoreTeamA('');
                    setScoreTeamB('');
                    setWinningTeam('');
                    setMvpPlayerId('');
                  }}
                >
                  <Text style={styles.finishModalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.finishModalButton, styles.finishModalSubmitButton]}
                  onPress={submitFinishMatch}
                >
                  <Ionicons name="trophy" size={20} color="#FFF" />
                  <Text style={styles.finishModalSubmitButtonText}>Finalizar Partido</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Compartir Resultado */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            onPress={() => setShowShareModal(false)}
            activeOpacity={1}
          />
          <View style={styles.shareModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.shareModalHeader}>
                <Text style={styles.shareModalTitle}>¡Comparte tu Partido!</Text>
                <TouchableOpacity onPress={() => setShowShareModal(false)}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.shareModalSubtitle}>
                Comparte los resultados en tus redes sociales
              </Text>

              {/* Tarjeta de Resultado - Esta se capturará */}
              <ViewShot ref={shareViewRef} options={{ format: 'png', quality: 1.0 }}>
                <View style={styles.resultCard}>
                  {/* Imagen de fondo si existe */}
                  {sharePhoto && (
                    <Image 
                      source={{ uri: sharePhoto }} 
                      style={styles.resultCardBackground}
                      blurRadius={2}
                    />
                  )}
                  
                  {/* Overlay oscuro */}
                  <View style={styles.resultCardOverlay} />
                  
                  {/* Contenido de la tarjeta */}
                  <View style={styles.resultCardContent}>
                    <View style={styles.resultCardHeader}>
                      <Ionicons name="trophy" size={32} color="#F59E0B" />
                      <Text style={styles.resultCardTitle}>SportMatch</Text>
                    </View>

                    <Text style={styles.resultMatchTitle}>{match?.title || 'Partido'}</Text>
                    
                    {match && (match.score_team_a !== null && match.score_team_b !== null) ? (
                      <View style={styles.resultScoreContainer}>
                        <View style={styles.resultTeamScore}>
                          <View style={[styles.resultTeamBadge, styles.teamABadgeResult]}>
                            <Text style={styles.resultTeamName}>EQUIPO A</Text>
                          </View>
                          <Text style={styles.resultScore}>{match.score_team_a}</Text>
                        </View>
                        
                        <Text style={styles.resultScoreSeparator}>-</Text>
                        
                        <View style={styles.resultTeamScore}>
                          <View style={[styles.resultTeamBadge, styles.teamBBadgeResult]}>
                            <Text style={styles.resultTeamName}>EQUIPO B</Text>
                          </View>
                          <Text style={styles.resultScore}>{match.score_team_b}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.resultNoScoreContainer}>
                        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                        <Text style={styles.resultNoScoreText}>¡Partido Completado!</Text>
                      </View>
                    )}

                    {match?.winning_team && match.winning_team !== 'empate' && (
                      <View style={styles.resultWinnerBadge}>
                        <Ionicons name="trophy" size={20} color="#F59E0B" />
                        <Text style={styles.resultWinnerText}>
                          Ganador: Equipo {match.winning_team}
                        </Text>
                      </View>
                    )}

                    {match?.winning_team === 'empate' && (
                      <View style={styles.resultTieBadge}>
                        <Ionicons name="hand-left-outline" size={20} color="#6B7280" />
                        <Text style={styles.resultTieText}>Empate</Text>
                      </View>
                    )}

                    {match?.mvp_player_id && (
                      <View style={styles.resultMvpContainer}>
                        <Ionicons name="star" size={20} color="#FFD700" />
                        <Text style={styles.resultMvpText}>
                          MVP: {(() => {
                            const mvpPlayer = players.find(p => p.player_id === match.mvp_player_id);
                            return mvpPlayer 
                              ? `${mvpPlayer.profiles?.first_name || ''} ${mvpPlayer.profiles?.last_name || ''}`.trim()
                              : 'Jugador MVP';
                          })()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.resultCardFooter}>
                      <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.resultDate}>
                        {match?.datetime ? formatDate(match.datetime) : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </ViewShot>

              {/* Botones de Acción */}
              <View style={styles.sharePhotoActions}>
                <TouchableOpacity
                  style={styles.sharePhotoButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={24} color="#10B981" />
                  <Text style={styles.sharePhotoButtonText}>Tomar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sharePhotoButton}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images" size={24} color="#3B82F6" />
                  <Text style={styles.sharePhotoButtonText}>Galería</Text>
                </TouchableOpacity>
              </View>

              {sharePhoto && (
                <View style={styles.photoPreviewBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.photoPreviewText}>Foto agregada</Text>
                  <TouchableOpacity onPress={() => setSharePhoto(null)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareResult}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="share-social" size={24} color="#FFF" />
                    <Text style={styles.shareButtonText}>Compartir Resultado</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareLaterButton}
                onPress={() => {
                  setShowShareModal(false);
                  setSharePhoto(null);
                }}
              >
                <Text style={styles.shareLaterButtonText}>Tal vez después</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#FFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matchTypeChip: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  matchTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  matchDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  venueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  venueInfo: {
    gap: 12,
    marginBottom: 16,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  venueText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  venueFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  youBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  emptyPlayers: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyPlayersText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  playerJoinDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  captainBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  leaveButton: {
    backgroundColor: '#EF4444',
  },
  fullButton: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  bottomSpacer: {
    height: 100,
  },
  // Estilos para equipos
  teamSection: {
    marginBottom: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  teamAHeader: {
    backgroundColor: '#DBEAFE',
  },
  teamBHeader: {
    backgroundColor: '#FEE2E2',
  },
  noTeamHeader: {
    backgroundColor: '#F3F4F6',
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  teamAAvatar: {
    backgroundColor: '#3B82F6',
  },
  teamBAvatar: {
    backgroundColor: '#EF4444',
  },
  emptyTeam: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  emptyTeamText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  changeTeamButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginLeft: 8,
  },
  // Estilos para cajas de información
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successBoxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  comingSoonBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  shuffleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Estilos para modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
    elevation: 999,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 999,
    zIndex: 100000,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  teamSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  teamAButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  teamBButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  teamSelectInfo: {
    flex: 1,
  },
  teamSelectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamSelectCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Estilos para estados
  statusOpen: {
    color: '#10B981',
  },
  statusFull: {
    color: '#F59E0B',
  },
  statusConfirmed: {
    color: '#3B82F6',
  },
  statusFinished: {
    color: '#059669',
  },
  statusCancelled: {
    color: '#EF4444',
  },
  // Estilos para botones de organizador
  organizerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  organizerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  confirmedButton: {
    backgroundColor: '#3B82F6',
  },
  finishButton: {
    backgroundColor: '#059669',
  },
  organizerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  finishedBanner: {
    backgroundColor: '#D1FAE5',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#6EE7B7',
    gap: 12,
  },
  finishedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  finishedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  shareResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  shareResultButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  shareResultButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  shareResultButtonInlineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 12,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  cancelledText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Estilos para modal de finalización
  finishModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  finishModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  finishModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreInput: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  scoreTextInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    backgroundColor: '#F9FAFB',
  },
  scoreSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 24,
  },
  teamOptions: {
    gap: 12,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  teamOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  teamOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  teamOptionTextSelected: {
    color: '#3B82F6',
  },
  playersList: {
    maxHeight: 200,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  playerOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  playerOptionInfo: {
    flex: 1,
  },
  playerOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  playerOptionNameSelected: {
    color: '#3B82F6',
  },
  playerOptionTeam: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  finishModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  finishModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  finishModalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  finishModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  finishModalSubmitButton: {
    backgroundColor: '#059669',
  },
  finishModalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // Estilos para resultados del partido
  resultsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  teamScoreBox: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  winnerTeam: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  teamScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  teamScore: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  winnerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  scoreSeparatorDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: '#9CA3AF',
    marginHorizontal: 16,
  },
  tieMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  tieMessageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  mvpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  mvpInfo: {
    flex: 1,
  },
  mvpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  mvpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78350F',
  },
  noResultsCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  // Estilos para modal de compartir
  shareModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  shareModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  resultCard: {
    width: '100%',
    minHeight: 400,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#1F2937',
  },
  resultCardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultCardOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  resultCardContent: {
    padding: 32,
    justifyContent: 'center',
    minHeight: 400,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  resultCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  resultMatchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  resultScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
  },
  resultTeamScore: {
    alignItems: 'center',
    gap: 12,
  },
  resultTeamBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  teamABadgeResult: {
    backgroundColor: '#3B82F6',
  },
  teamBBadgeResult: {
    backgroundColor: '#EF4444',
  },
  resultTeamName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
  },
  resultScoreSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  resultNoScoreContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  resultNoScoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  resultWinnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignSelf: 'center',
  },
  resultWinnerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  resultTieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignSelf: 'center',
  },
  resultTieText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  resultMvpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  resultMvpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  resultCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  resultDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sharePhotoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sharePhotoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  sharePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  photoPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  photoPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    flex: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  shareLaterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  shareLaterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
