import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Button } from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { locationService } from '@/services/location.service';
import { Country, Region, City } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: '1',
    title: '¡Bienvenido a SportMatch!',
    description: 'Completa tu perfil para comenzar',
    icon: 'hand-right',
  },
  {
    id: '2',
    title: '¿Cómo te llamas?',
    description: 'Ingresa tu nombre y apellido',
    icon: 'person',
    field: 'name',
  },
  {
    id: '3',
    title: 'Fecha de nacimiento',
    description: 'Cuéntanos cuándo naciste',
    icon: 'calendar',
    field: 'birthdate',
  },
  {
    id: '4',
    title: 'Género',
    description: 'Selecciona tu género',
    icon: 'male-female',
    field: 'gender',
  },
  {
    id: '5',
    title: 'Ubicación',
    description: 'Selecciona tu país, región y ciudad',
    icon: 'location',
    field: 'location',
  },
  {
    id: '6',
    title: '¡Todo listo!',
    description: 'Tu perfil está completo. ¡Comencemos!',
    icon: 'checkmark-circle',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUserProfile, setBiometricEnabled, isBiometricAvailable } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('');
  
  // Estados para ubicación
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);

  // Cargar países al montar
  useEffect(() => {
    loadCountries();
  }, []);

  // Cargar regiones cuando cambia el país
  useEffect(() => {
    if (selectedCountry) {
      loadRegions(selectedCountry);
    } else {
      setRegions([]);
      setCities([]);
      setSelectedRegion(null);
      setSelectedCity(null);
    }
  }, [selectedCountry]);

  // Cargar ciudades cuando cambia la región
  useEffect(() => {
    if (selectedRegion) {
      loadCities(selectedRegion);
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedRegion]);

  const loadCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Error al cargar países:', error);
    }
  };

  const loadRegions = async (countryId: number) => {
    setLoadingLocation(true);
    try {
      const data = await locationService.getRegionsByCountry(countryId);
      setRegions(data);
    } catch (error) {
      console.error('Error al cargar regiones:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadCities = async (regionId: number) => {
    setLoadingLocation(true);
    try {
      const data = await locationService.getCitiesByRegion(regionId);
      setCities(data);
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    } finally {
      setLoadingLocation(false);
    }
  };


  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollViewRef.current?.scrollTo({
        x: prevStep * SCREEN_WIDTH,
        animated: true,
      });
    }
  };


  const validateCurrentStep = (): boolean => {
    const step = ONBOARDING_STEPS[currentStep];
    
    switch (step.field) {
      case 'name':
        if (!firstName.trim() || !lastName.trim()) {
          Alert.alert('Error', 'Por favor ingresa tu nombre y apellido');
          return false;
        }
        return true;
      case 'birthdate':
        if (!birthDate) {
          Alert.alert('Error', 'Por favor ingresa tu fecha de nacimiento');
          return false;
        }
        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          Alert.alert('Error', 'Formato de fecha inválido. Usa AAAA-MM-DD');
          return false;
        }
        return true;
      case 'gender':
        if (!gender) {
          Alert.alert('Error', 'Por favor selecciona tu género');
          return false;
        }
        return true;
      case 'location':
        if (!selectedCountry || !selectedRegion || !selectedCity) {
          Alert.alert('Error', 'Por favor completa tu ubicación');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    // Validar el paso actual antes de continuar
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Actualizar perfil con todos los datos
      const updates: any = {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender: gender as any,
        country_id: selectedCountry,
        region_id: selectedRegion,
        city_id: selectedCity,
        extra_matches_balance: 1, // Dar 1 match extra al completar perfil
      };

      await updateUserProfile(updates);

      // Configurar biométricos si está disponible
      if (isBiometricAvailable && enableBiometric) {
        await setBiometricEnabled(true);
      }

      router.replace('/(tabs)/profile');
    } catch (error) {
      console.error('Error al completar onboarding:', error);
      Alert.alert('Error', 'No se pudo guardar tu información. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };


  const renderStepContent = (step: typeof ONBOARDING_STEPS[0]) => {
    switch (step.field) {
      case 'name':
        return (
          <View style={styles.inputContainer}>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Input
              label="Apellido"
              placeholder="Tu apellido"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        );

      case 'birthdate':
        return (
          <View style={styles.inputContainer}>
            <Input
              label="Fecha de Nacimiento"
              placeholder="AAAA-MM-DD (ej: 1990-01-15)"
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.helperText}>
              Formato: Año-Mes-Día (AAAA-MM-DD)
            </Text>
          </View>
        );

      case 'gender':
        return (
          <View style={styles.inputContainer}>
            <Select
              label="Género"
              value={gender}
              onValueChange={(value) => setGender(value as string)}
              placeholder="Selecciona tu género"
              options={[
                { label: 'Masculino', value: 'masculino' },
                { label: 'Femenino', value: 'femenino' },
                { label: 'Otro', value: 'otro' },
              ]}
            />
          </View>
        );

      case 'location':
        return (
          <View style={styles.inputContainer}>
            <Select
              label="País"
              value={selectedCountry}
              onValueChange={(value) => setSelectedCountry(value as number)}
              placeholder="Selecciona tu país"
              options={countries.map(c => ({ label: c.name, value: c.id }))}
            />
            
            {selectedCountry && (
              <Select
                label="Región"
                value={selectedRegion}
                onValueChange={(value) => setSelectedRegion(value as number)}
                placeholder="Selecciona tu región"
                options={regions.map(r => ({ label: r.name, value: r.id }))}
                disabled={loadingLocation}
              />
            )}
            
            {selectedRegion && (
              <Select
                label="Ciudad"
                value={selectedCity}
                onValueChange={(value) => setSelectedCity(value as number)}
                placeholder="Selecciona tu ciudad"
                options={cities.map(c => ({ label: c.name, value: c.id }))}
                disabled={loadingLocation}
              />
            )}

            {currentStep === ONBOARDING_STEPS.length - 2 && isBiometricAvailable && (
              <TouchableOpacity
                style={styles.biometricOption}
                onPress={() => setEnableBiometric(!enableBiometric)}
              >
                <View style={styles.biometricCheckbox}>
                  {enableBiometric && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </View>
                <View style={styles.biometricTextContainer}>
                  <Text style={styles.biometricTitle}>
                    Habilitar desbloqueo biométrico
                  </Text>
                  <Text style={styles.biometricDescription}>
                    Usa Face ID o huella dactilar para acceder rápidamente
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.iconContainer}>
            <Ionicons name={step.icon as any} size={120} color="#007AFF" />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={step.id} style={styles.slide}>
            <View style={styles.header}>
              <View style={styles.indicators}>
                {ONBOARDING_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.indicator,
                      i === currentStep && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
              
              {renderStepContent(step)}
            </View>

            <View style={styles.footer}>
              <View style={styles.navigationButtons}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                  >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
                
                <Button
                  title={
                    currentStep === ONBOARDING_STEPS.length - 1
                      ? 'Comenzar'
                      : 'Continuar'
                  }
                  onPress={handleNext}
                  loading={loading}
                  style={styles.nextButton}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  indicatorActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  avatarButton: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    minWidth: 100,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputContainer: {
    gap: 16,
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 12,
  },
  biometricCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  biometricDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingTop: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
  },
});
