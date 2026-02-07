import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const BIOMETRIC_KEY = 'biometric_enabled';
const STORED_CREDENTIALS = 'stored_credentials';

// Wrapper para SecureStore que funciona en web y móvil
const SecureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends AuthCredentials {
  fullName: string;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  telefono?: string;
  gender?: 'masculino' | 'femenino' | 'otro' | null;
  birth_date?: string;
  country_id?: number;
  region_id?: number;
  city_id?: number;
  premiumstatus?: boolean;
  premiumfinalizedat?: string;
  extra_matches_balance?: number;
  team_creation_tokens?: number;
  created_at?: string;
  updated_at?: string;
}

class AuthService {
  // Configuración de Google OAuth
  private googleConfig = {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };

  // Sign Up con email y contraseña
  async signUp(data: SignUpData) {
    const { email, password, fullName } = data;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return authData;
  }

  // Login con email y contraseña
  async signIn(credentials: AuthCredentials) {
    const { email, password } = credentials;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Guardar credenciales para biométricos
    await this.storeCredentials(credentials);
    
    return data;
  }

  // Login con Google
  async signInWithGoogle() {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'sportmatch',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      // En móvil, abre el navegador
      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          const url = result.url;
          const params = new URL(url).searchParams;
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error en Google Sign In:', error);
      throw error;
    }
  }

  // Login con Apple
  async signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;
        return data;
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // El usuario canceló el login
        return null;
      }
      throw error;
    }
  }

  // Cerrar sesión
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpiar credenciales almacenadas
    await SecureStorage.deleteItemAsync(STORED_CREDENTIALS);
  }

  // Obtener sesión actual
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  // Obtener usuario actual
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Obtener perfil del usuario
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }

    return data;
  }

  // Actualizar perfil
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Subir avatar
  async uploadAvatar(userId: string, imageUri: string) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Actualizar perfil con nueva URL
      await this.updateProfile(userId, { avatar_url: publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('Error al subir avatar:', error);
      throw error;
    }
  }

  // Cambiar contraseña
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  // === FUNCIONES BIOMÉTRICAS ===

  // Verificar si el dispositivo soporta biométricos
  async isBiometricSupported(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  }

  // Verificar si hay biométricos registrados
  async hasBiometricRecords(): Promise<boolean> {
    const hasRecords = await LocalAuthentication.isEnrolledAsync();
    return hasRecords;
  }

  // Obtener tipo de biométrico disponible
  async getBiometricType(): Promise<string[]> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Huella dactilar';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Reconocimiento facial';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Reconocimiento de iris';
        default:
          return 'Biométrico';
      }
    });
  }

  // Autenticar con biométricos
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentícate para continuar',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
      });

      return result.success;
    } catch (error) {
      console.error('Error en autenticación biométrica:', error);
      return false;
    }
  }

  // Habilitar/deshabilitar biométricos
  async setBiometricEnabled(enabled: boolean) {
    await SecureStorage.setItemAsync(BIOMETRIC_KEY, enabled.toString());
  }

  // Verificar si biométricos están habilitados
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStorage.getItemAsync(BIOMETRIC_KEY);
    return enabled === 'true';
  }

  // Guardar credenciales para login biométrico
  private async storeCredentials(credentials: AuthCredentials) {
    const biometricEnabled = await this.isBiometricEnabled();
    if (biometricEnabled) {
      await SecureStorage.setItemAsync(
        STORED_CREDENTIALS,
        JSON.stringify(credentials)
      );
    }
  }

  // Obtener credenciales guardadas
  async getStoredCredentials(): Promise<AuthCredentials | null> {
    const stored = await SecureStorage.getItemAsync(STORED_CREDENTIALS);
    if (!stored) return null;
    return JSON.parse(stored);
  }

  // Login con biométricos
  async signInWithBiometrics(): Promise<boolean> {
    try {
      const authenticated = await this.authenticateWithBiometrics();
      if (!authenticated) return false;

      const credentials = await this.getStoredCredentials();
      if (!credentials) return false;

      await this.signIn(credentials);
      return true;
    } catch (error) {
      console.error('Error en login biométrico:', error);
      return false;
    }
  }
}

export const authService = new AuthService();

// Importar AuthSession correctamente
import * as AuthSession from 'expo-auth-session';
