// app/trip-loading.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useTripStore } from '@/stores/tripStore';
import { generateTripPlan } from '@/services/openaiService';

interface TripLoadingScreenProps {
  onComplete?: () => void;
}

const STEPS = [
  { id: 'flights', text: 'Szukam najlepszych lotów...' },
  { id: 'hotels', text: 'Analizuję opcje hoteli...' },
  { id: 'attractions', text: 'Dobieram atrakcje do budżetu...' },
  { id: 'schedule', text: 'Układam harmonogram dni...' },
  { id: 'routes', text: 'Wyznaczam trasy na mapie...' },
  { id: 'final', text: 'Tworzę gotowy plan ✨' },
];

export default function TripLoadingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(-1); // Zaczynamy od -1 żeby progress był na 0
  const progressAnim = useState(new Animated.Value(0))[0];
  const { formData, setTripPlan, setError } = useTripStore();

  useEffect(() => {
    // Animacja progress bara przy każdej zmianie kroku
    const targetProgress = (currentStep + 1) / STEPS.length;
    
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    const startTimer = setTimeout(async () => {
      // Animacja kroków (bez zmian)
      const timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= STEPS.length - 1) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);

      // Równolegle — wywołanie agenta
      try {
        if (!formData) throw new Error('Brak danych formularza');
        const plan = await generateTripPlan(formData);
        setTripPlan(plan);
        console.log('✅ Plan wygenerowany:', JSON.stringify(plan, null, 2));
        router.replace('/trip-result');
      } catch (err: any) {
        setError(err.message);
        console.error('❌ Błąd agenta:', err.message);
      }

      return () => clearInterval(timer);
    }, 500);

    return () => clearTimeout(startTimer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background, paddingTop: insets.top + 20 }]}>
      {/* Ikona samolotu */}
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: '#6366f120' }]}>
          <Text style={styles.icon}>✈️</Text>
        </View>
      </View>

      {/* Tytuł */}
      <Text style={[styles.title, { color: currentColors.text }]}>
        Generuję Twój plan
      </Text>
      <Text style={[styles.subtitle, { color: currentColors.subtext }]}>
        Sztuczna inteligencja dopasowuje idealne opcje
      </Text>

      {/* Lista kroków */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => {
          const isDone = index <= currentStep;
          const isCurrent = index === currentStep;

          return (
            <View key={step.id} style={styles.stepRow}>
              {/* Kropka */}
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: isDone ? '#10b981' : isCurrent ? '#6366f1' : currentColors.border },
                ]}
              >
                {isDone && <Text style={styles.checkmark}>✓</Text>}
                {!isDone && isCurrent && <View style={styles.stepDotInner} />}
              </View>

              {/* Tekst */}
              <Text
                style={[
                  styles.stepText,
                  { color: currentColors.text },
                  isDone && styles.stepTextDone,
                  isCurrent && styles.stepTextCurrent,
                ]}
              >
                {step.text}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress bar na dole */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: currentColors.border }]}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepText: {
    fontSize: 16,
    flex: 1,
  },
  stepTextDone: {
    color: '#10b981',
    fontWeight: '500',
  },
  stepTextCurrent: {
    fontWeight: '600',
    opacity: 1,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
});