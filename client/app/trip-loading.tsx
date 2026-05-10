// app/trip-loading.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/styles/colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useTripStore } from '@/stores/tripStore';
import { generateTripPlan } from '@/services/openaiService';
import { styles } from '@/styles/trip.loading.styles';

const STEPS = [
  { id: 'flights',     text: 'Szukam najlepszych lotów...' },
  { id: 'hotels',      text: 'Analizuję opcje hoteli...' },
  { id: 'attractions', text: 'Dobieram atrakcje do budżetu...' },
  { id: 'schedule',    text: 'Układam harmonogram dni...' },
  { id: 'routes',      text: 'Wyznaczam trasy na mapie...' },
  { id: 'final',       text: 'Tworzę gotowy plan ✨' },
];

const STEP_INTERVAL = 1200;

export default function TripLoadingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(-1);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { formData, setTripPlan, setError } = useTripStore();

  // Refs — nie powodują re-renderu, bezpieczne w domknięciach
  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);

  // Wyciągnięte POZA useEffect — jedno domknięcie, zawsze świeże refs
  const tryNavigate = useCallback(() => {
    if (apiDoneRef.current && animDoneRef.current) {
      router.replace('/trip-result');
    }
  }, [router]);

  // Animacja progress bara
  useEffect(() => {
    const targetProgress = (currentStep + 1) / STEPS.length;
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    // ── Animacja kroków ──
    let stepIndex = 0;
    const timer = setInterval(() => {
      setCurrentStep(stepIndex);
      stepIndex++;

      if (stepIndex >= STEPS.length) {
        clearInterval(timer);
        // Daj 400ms na ostatnią animację progress bara
        setTimeout(() => {
          animDoneRef.current = true;
          tryNavigate();
        }, 400);
      }
    }, STEP_INTERVAL);

    // ── Wywołanie API ──
    const fetchPlan = async () => {
      try {
        if (!formData) throw new Error('Brak danych formularza');
        const plan = await generateTripPlan(formData);
        setTripPlan(plan);
        apiDoneRef.current = true;
        tryNavigate();
      } catch (err: any) {
        setError(err.message);
        console.error('❌ Błąd agenta:', err.message);
      }
    };

    fetchPlan();

    return () => clearInterval(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background, paddingTop: insets.top + 20 }]}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: '#6366f120' }]}>
          <Text style={styles.icon}>✈️</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: currentColors.text }]}>
        Generuję Twój plan
      </Text>
      <Text style={[styles.subtitle, { color: currentColors.subtext }]}>
        Sztuczna inteligencja dopasowuje idealne opcje
      </Text>

      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <View key={step.id} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isDone
                      ? '#10b981'
                      : isCurrent
                      ? '#6366f1'
                      : currentColors.border,
                  },
                ]}
              >
                {isDone && <Text style={styles.checkmark}>✓</Text>}
                {isCurrent && <View style={styles.stepDotInner} />}
              </View>

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

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: currentColors.border }]}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}