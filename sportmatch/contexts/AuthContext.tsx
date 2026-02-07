import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/services/supabase';
import { authService, UserProfile } from '@/services/auth.service';
import { AuthState } from '@/types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithBiometrics: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (imageUri: string) => Promise<string>;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabledState] = useState(false);

  useEffect(() => {
    // Verificar biométricos disponibles
    checkBiometricAvailability();
    
    // Cargar sesión inicial
    loadSession();

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          setState({
            user: profile,
            session,
            loading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkBiometricAvailability = async () => {
    const supported = await authService.isBiometricSupported();
    const enrolled = await authService.hasBiometricRecords();
    const enabled = await authService.isBiometricEnabled();
    
    setIsBiometricAvailable(supported && enrolled);
    setIsBiometricEnabledState(enabled);
  };

  const loadSession = async () => {
    try {
      const session = await authService.getSession();
      
      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id);
        setState({
          user: profile,
          session,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          session: null,
          loading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      setState({
        user: null,
        session: null,
        loading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { session, user } = await authService.signIn({ email, password });
      const profile = await authService.getUserProfile(user.id);
      
      setState({
        user: profile,
        session,
        loading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error en sign in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Dividir el nombre completo en first_name y last_name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await authService.signUp({ email, password, fullName });
      // La sesión se actualizará automáticamente con onAuthStateChange
    } catch (error) {
      console.error('Error en sign up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
      // La sesión se actualizará automáticamente con onAuthStateChange
    } catch (error) {
      console.error('Error en Google sign in:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      await authService.signInWithApple();
      // La sesión se actualizará automáticamente con onAuthStateChange
    } catch (error) {
      console.error('Error en Apple sign in:', error);
      throw error;
    }
  };

  const signInWithBiometrics = async (): Promise<boolean> => {
    try {
      const success = await authService.signInWithBiometrics();
      return success;
    } catch (error) {
      console.error('Error en biometric sign in:', error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setState({
        user: null,
        session: null,
        loading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error en sign out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user?.id) throw new Error('No hay usuario autenticado');
    
    try {
      const updatedProfile = await authService.updateProfile(state.user.id, updates);
      setState(prev => ({
        ...prev,
        user: updatedProfile,
      }));
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      throw error;
    }
  };

  const uploadAvatar = async (imageUri: string): Promise<string> => {
    if (!state.user?.id) throw new Error('No hay usuario autenticado');
    
    try {
      const avatarUrl = await authService.uploadAvatar(state.user.id, imageUri);
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, avatar_url: avatarUrl } : null,
      }));
      return avatarUrl;
    } catch (error) {
      console.error('Error al subir avatar:', error);
      throw error;
    }
  };

  const setBiometricEnabled = async (enabled: boolean) => {
    await authService.setBiometricEnabled(enabled);
    setIsBiometricEnabledState(enabled);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signInWithBiometrics,
        signOut,
        updateUserProfile,
        uploadAvatar,
        isBiometricAvailable,
        isBiometricEnabled,
        setBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
