import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // <-- DODANO IMPORT IKON
import { Colors } from '@/styles/colors';
import GradientButton from '../../components/GradientButton';
import { useTripStore } from '@/stores/tripStore';
import { useAuth } from '@/providers/auth.provider';
import { styles } from '@/styles/create.styles';
import { Step1, Step2, Step3, Step4, Step5, TripFormData } from '../../components/CreateSteps';

const TOTAL_STEPS = 5;

const STEP_TITLES: Record<number, string> = {
  1: 'Dokąd?',
  2: 'Kiedy?',
  3: 'Kto & Budżet',
  4: 'Preferencje',
  5: 'Intensywność',
};

export default function Create() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TripFormData>({
    destination: '',
    departureDate: '',
    returnDate: '',
    travelers: 1,
    budget: 3000,
    interests: [],
    transport: [],
    attractionsPerDay: 4,
    selectedFriendIds: [],
  });

  const errorAnim = useRef(new Animated.Value(0)).current;
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const setStoreFormData = useTripStore((s) => s.setFormData);
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;

  // --- Błędy ---

  const showError = useCallback((message: string) => {
    setErrorMessages([message]);
    Animated.sequence([
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => setErrorMessages([]));
  }, []);

  // --- Walidacja ---

  const validateStep1 = () => {
    if (!formData.destination.trim()) {
      showError('Podaj miejsce docelowe');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;

    if (!formData.departureDate || !dateRegex.test(formData.departureDate)) {
      showError('Podaj prawidłową datę wylotu');
      return false;
    }
    if (!formData.returnDate || !dateRegex.test(formData.returnDate)) {
      showError('Podaj prawidłową datę powrotu');
      return false;
    }

    const [dayD, monthD, yearD] = formData.departureDate.split('.').map(Number);
    const [dayR, monthR, yearR] = formData.returnDate.split('.').map(Number);
    if (new Date(yearR, monthR - 1, dayR) < new Date(yearD, monthD - 1, dayD)) {
      showError('Data powrotu musi być późniejsza niż wylotu');
      return false;
    }

    return true;
  };

  const validateStep4 = () => {
    if (formData.interests.length === 0) {
      showError('Wybierz co najmniej jedno zainteresowanie');
      return false;
    }
    return true;
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 4: return validateStep4();
      default: return true;
    }
  };

  // --- Nawigacja ---

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const handleGeneratePlan = () => {
    if (validateStep4()) { // Tu warto upewnić się, czy na pewno chcesz tu walidować Step 4, zazwyczaj to Step 5 (jeśli ma walidację) lub ogólna.
      setStoreFormData(formData);
      useTripStore.getState().setSavedTripId(null);
      router.push('/trip-loading');
    }
  };

  // --- Progress bar ---

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        return (
          <React.Fragment key={index}>
            <View
              style={[
                styles.progressDot,
                { backgroundColor: isActive || isCompleted ? Colors.brand.blue : currentColors.border },
                isActive && styles.progressDotActive,
              ]}
            >
              {isActive && <View style={styles.progressDotInner} />}
            </View>
            {index < TOTAL_STEPS - 1 && (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: isCompleted ? Colors.brand.blue : currentColors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // --- Render ---

  const stepProps = { formData, setFormData, currentColors, accessToken };
  const bottomOffset = 65 + (insets.bottom > 0 ? insets.bottom : 10);

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header */}
      <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={[styles.backButtonTop, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
        >
          {/* ZAMIAST TEKSTU UŻYWAMY IKONY */}
          <Ionicons name="chevron-back" size={22} color={currentColors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTextContainer}>
          <Text style={[styles.stepIndicator, { color: currentColors.subtext }]}>
            Krok {currentStep} z {TOTAL_STEPS}
          </Text>
          <Text style={[styles.headerTitle, { color: currentColors.text }]}>
            {STEP_TITLES[currentStep]}
          </Text>
        </View>
        
        {/* Spacer dla zachowania proporcji (żeby tytuł był na środku) */}
        <View style={{ width: 40 }} /> 
      </View>

      {/* Treść */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomOffset + 70 + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderProgressBar()}
        {currentStep === 1 && <Step1 {...stepProps} />}
        {currentStep === 2 && <Step2 {...stepProps} />}
        {currentStep === 3 && <Step3 {...stepProps} />}
        {currentStep === 4 && <Step4 {...stepProps} />}
        {currentStep === 5 && <Step5 {...stepProps} />}
      </ScrollView>

      {/* Dymek z błędem */}
      {errorMessages.length > 0 && (
        <Animated.View
          style={[
            styles.errorContainer,
            {
              opacity: errorAnim,
              bottom: bottomOffset + 70,
              flexDirection: 'row', // Wyrównanie ikony z tekstem
              alignItems: 'center',
              gap: 8,
              shadowColor: '#EF4444', // Delikatny cień dla błędu
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            },
          ]}
        >
          {/* IKONA BŁĘDU */}
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          <Text style={[styles.errorContainerText, { flexShrink: 1 }]}>
            {errorMessages[0]}
          </Text>
        </Animated.View>
      )}

      {/* Pływający przycisk na dole */}
      <View
        style={[
          styles.fixedButtonContainer,
          {
            backgroundColor: currentColors.background,
            bottom: bottomOffset,
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.03)'
          },
        ]}
      >
        {currentStep < TOTAL_STEPS ? (
          <GradientButton onPress={handleNext} title="Dalej" />
        ) : (
          <GradientButton onPress={handleGeneratePlan} title="Wygeneruj plan" />
        )}
      </View>
    </View>
  );
}