import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';

export default function SettingsScreen() {
  const router = useRouter();
  const { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } = useAuth();

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleToggleBiometric = async (value: boolean) => {
    setBiometricLoading(true);
    try {
      if (value) {
        // Verificar autenticación biométrica antes de habilitar
        const authenticated = await authService.authenticateWithBiometrics();
        if (!authenticated) {
          Alert.alert(
            'Autenticación fallida',
            'No se pudo verificar tu identidad'
          );
          return;
        }
      }
      
      await setBiometricEnabled(value);
      Alert.alert(
        'Éxito',
        value
          ? 'Autenticación biométrica habilitada'
          : 'Autenticación biométrica deshabilitada'
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar la configuración');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(newPassword);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>

        {isBiometricAvailable && (
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="finger-print" size={24} color="#000" />
              <View style={styles.settingItemText}>
                <Text style={styles.settingItemTitle}>
                  Autenticación Biométrica
                </Text>
                <Text style={styles.settingItemDescription}>
                  Usa Face ID o huella dactilar para iniciar sesión
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={biometricLoading}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
              thumbColor="#FFF"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowPasswordSection(!showPasswordSection)}
        >
          <View style={styles.settingItemLeft}>
            <Ionicons name="lock-closed" size={24} color="#000" />
            <View style={styles.settingItemText}>
              <Text style={styles.settingItemTitle}>Cambiar Contraseña</Text>
              <Text style={styles.settingItemDescription}>
                Actualiza tu contraseña de acceso
              </Text>
            </View>
          </View>
          <Ionicons
            name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#CCC"
          />
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={styles.passwordForm}>
            <Input
              label="Nueva Contraseña"
              placeholder="Al menos 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              rightIcon={
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#666"
                />
              }
              onRightIconPress={() => setShowNewPassword(!showNewPassword)}
            />

            <Input
              label="Confirmar Nueva Contraseña"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              rightIcon={
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#666"
                />
              }
              onRightIconPress={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />

            <Button
              title="Actualizar Contraseña"
              onPress={handleChangePassword}
              loading={loading}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="document-text" size={24} color="#000" />
            <Text style={styles.settingItemTitle}>Términos y Condiciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="shield-checkmark" size={24} color="#000" />
            <Text style={styles.settingItemTitle}>Política de Privacidad</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerButton}>
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
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
  section: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  passwordForm: {
    paddingTop: 16,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#000',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
