import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useTripStore } from '@/stores/tripStore';
import { generateTripPlan, acceptTripPlan } from '@/services/openaiService';
import { useAuth } from '@/providers/auth.provider';
import { useNotifications } from '@/providers/notifications.provider';

// Każdy krok ma teraz przypisaną wektorową ikonę
const STEPS = [
  { id: 'flights',     text: 'Szukam najlepszych lotów...', icon: 'airplane' as const },
  { id: 'hotels',      text: 'Analizuję opcje hoteli...', icon: 'bed' as const },
  { id: 'attractions', text: 'Dobieram atrakcje do budżetu...', icon: 'camera' as const },
  { id: 'schedule',    text: 'Układam harmonogram dni...', icon: 'calendar' as const },
  { id: 'routes',      text: 'Wyznaczam trasy na mapie...', icon: 'map' as const },
  { id: 'final',       text: 'Zapisuję gotowy plan', icon: 'sparkles' as const },
];

const STEP_INTERVAL = 1200;

export default function TripLoadingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(-1);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // Animacja pulsującej ikony

  const { formData, setTripPlan, setError, setSavedTripId } = useTripStore();
  const { session } = useAuth();
  const { refreshNotifications } = useNotifications();

  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);

  const tryNavigate = useCallback(() => {
    if (apiDoneRef.current && animDoneRef.current) {
      router.replace('/(main)/trip-details');
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
  }, [currentStep, progressAnim]);

  // Zapętlona animacja pulsowania dla głównej ikony
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    let stepIndex = 0;
    const timer = setInterval(() => {
      setCurrentStep(stepIndex);
      stepIndex++;

      if (stepIndex >= STEPS.length) {
        clearInterval(timer);
        setTimeout(() => {
          animDoneRef.current = true;
          tryNavigate();
        }, 400);
      }
    }, STEP_INTERVAL);

    const fetchPlan = async () => {
      try {
        if (!formData) throw new Error('Brak danych formularza');
        
        const plan = await generateTripPlan(formData, session?.access_token ?? undefined);
        
        if (session?.access_token) {
          const response = await acceptTripPlan(formData, plan, session.access_token);
          plan.id = response.tripId;
          setSavedTripId(response.tripId);
          await refreshNotifications();
        }

        setTripPlan(plan);
        apiDoneRef.current = true;
        tryNavigate();
      } catch (err: any) {
        setError(err.message);
        console.error('❌ Błąd generatora lub błąd zapisu:', err.message);
      }
    };

    fetchPlan();

    return () => clearInterval(timer);
  }, [formData, session, setTripPlan, setSavedTripId, setError, refreshNotifications, tryNavigate]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background, paddingTop: insets.top + 40 }]}>
      
      {/* Animowana, pulsująca główna ikona */}
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.iconInnerCircle}>
          <Ionicons name="planet" size={42} color="#fff" />
        </View>
      </View>

      <Text style={[styles.title, { color: currentColors.text }]}>
        Pracujemy nad Twoim planem
      </Text>
      <Text style={[styles.subtitle, { color: currentColors.subtext }]}>
        AI analizuje tysiące opcji, by znaleźć te idealne.
      </Text>

      {/* Box ze statusem ładowania */}
      <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => {
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <View key={step.id} style={styles.stepRow}>
                {/* Ikona danego kroku */}
                <View
                  style={[
                    styles.stepIconBox,
                    isDone && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
                    isCurrent && { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.4)' },
                    isPending && { backgroundColor: currentColors.background, borderColor: currentColors.border },
                  ]}
                >
                  <Ionicons 
                    name={isDone ? 'checkmark' : step.icon} 
                    size={16} 
                    color={
                      isDone ? '#10b981' : 
                      isCurrent ? Colors.brand.blue : 
                      currentColors.subtext
                    } 
                  />
                </View>

                {/* Tekst kroku */}
                <Text
                  style={[
                    styles.stepText,
                    isDone && [styles.stepTextDone, { color: currentColors.text }],
                    isCurrent && [styles.stepTextCurrent, { color: Colors.brand.blue }],
                    isPending && { color: currentColors.subtext },
                  ]}
                >
                  {step.text}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Pasek postępu osadzony wewnątrz karty */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: currentColors.background }]}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: Colors.brand.blue }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── STYLOWANIE ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  iconInnerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  stepsContainer: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  stepTextDone: {
    fontWeight: '400',
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  stepTextCurrent: {
    fontWeight: '700',
  },
  progressBarContainer: {
    marginTop: 32,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});