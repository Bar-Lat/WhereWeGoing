import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '@/styles/colors';
import { useRouter } from 'expo-router';
import { useTripStore, type TripPlan } from '@/stores/tripStore';
import { generateTripPlan, acceptTripPlan } from '@/services/openaiService';
import { getTripSchedule } from '@/services/trips.api';
import { mapScheduleDaysToPlanDays } from '@/utils/mapScheduleToPlan';
import { buildTransitsForActivities } from '@/utils/scheduleTransit';
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

const getRetryAfterMinutes = (message: string) => {
  const match = message.match(/try again in\s+(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?/i);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalMinutes = Math.max(1, Math.ceil(hours * 60 + minutes + seconds / 60));

  return totalMinutes;
};

const formatRetryAfter = (minutes: number) => {
  if (minutes === 1) return '1 minutę';
  if (minutes % 10 >= 2 && minutes % 10 <= 4 && (minutes % 100 < 12 || minutes % 100 > 14)) {
    return `${minutes} minuty`;
  }

  return `${minutes} minut`;
};

const resolveGenerationOrigin = async () => {
  if (Platform.OS === 'web') return {};

  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') return {};

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const originCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    const reverse = await Location.reverseGeocodeAsync(originCoordinates);
    const first = reverse[0];
    const originLabel = [first?.city, first?.region, first?.country].filter(Boolean).join(', ');

    return {
      originCoordinates,
      originLabel: originLabel || null,
    };
  } catch {
    return {};
  }
};

export default function TripLoadingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(-1);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // Animacja pulsującej ikony

  const { formData, setTripPlan, setError, setSavedTripId, setTripAccessRole } = useTripStore();
  const { session } = useAuth();
  const { refreshNotifications } = useNotifications();

  const apiDoneRef = useRef(false);
  const animDoneRef = useRef(false);
  const generationFailedRef = useRef(false);

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
      if (generationFailedRef.current) {
        clearInterval(timer);
        return;
      }

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
        const origin = await resolveGenerationOrigin();
        const generationFormData = { ...formData, ...origin };
        
        // 1. Generowanie planu przez AI
        const plan = await generateTripPlan(generationFormData, session?.access_token ?? undefined);
        
        // --- 🛠️ FIX NA BŁĄD BAZY DANYCH (BIGINT) ---
        // Baza danych odrzuca ułamki. Wymuszamy liczby całkowite dla wszystkich kosztów.
        plan.estimatedTotalCost = Math.round(Number(plan.estimatedTotalCost) || 0);
        plan.travelCost = Math.round(Number(plan.travelCost) || 0);
        plan.returnCost = Math.round(Number(plan.returnCost) || 0);
        
        if (plan.days && Array.isArray(plan.days)) {
          plan.days = plan.days.map(day => ({
            ...day,
            estimatedDayCost: Math.round(Number(day.estimatedDayCost) || 0),
            activities: (day.activities || []).map(act => ({
              ...act,
              estimatedCost: Math.round(Number(act.estimatedCost) || 0)
            }))
          }));
        }
        
        // Upewniamy się, że z samego formularza też idzie pełna liczba
        const safeFormData = {
          ...generationFormData,
          budget: Math.round(Number(formData.budget) || 0)
        };
        // -------------------------------------------

        const planWithLocalTransits: TripPlan = {
          ...plan,
          days: (plan.days || []).map((day) => ({
            ...day,
            transits: day.transits?.length
              ? day.transits
              : buildTransitsForActivities(
                  (day.activities || []).map((activity) => ({
                    name: activity.name,
                    location: activity.location,
                    category: activity.category,
                    time: activity.time,
                    durationMinutes: activity.durationMinutes,
                  })),
                  safeFormData.transport || []
                ),
          })),
        };

        // 2. Automatyczny zapis w tle 
        let savedPlan = planWithLocalTransits;

        if (session?.access_token) {
          const response = await acceptTripPlan(safeFormData, planWithLocalTransits, session.access_token);
          savedPlan = (response.tripPlan as typeof planWithLocalTransits) ?? planWithLocalTransits;
          savedPlan.id = response.tripId;

          if (!savedPlan.days?.every((day) => day.activities?.every((act) => act.coordinates))) {
            const schedule = await getTripSchedule(session.access_token, response.tripId);
            savedPlan = {
              ...savedPlan,
              id: response.tripId,
            days: mapScheduleDaysToPlanDays(schedule.days || []),
            travelCost: schedule.travelCost,
            returnCost: schedule.returnCost,
            travelWay: schedule.travelWay,
            returnWay: schedule.returnWay,
          };
          }

          setSavedTripId(response.tripId);
          setTripAccessRole('owner');
          await refreshNotifications();
        }

        setTripPlan(savedPlan);
        apiDoneRef.current = true;
        tryNavigate();
      } catch (err: any) {
        const message = err?.message || 'Nie udało się wygenerować planu. Spróbuj ponownie później.';
        generationFailedRef.current = true;
        clearInterval(timer);
        setGenerationError(message);
        setError(message);
        console.error('❌ Błąd generatora lub błąd zapisu:', message);
      }
    };

    fetchPlan();

    return () => clearInterval(timer);
  }, [formData, session, setTripPlan, setSavedTripId, setError, refreshNotifications, tryNavigate]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const retryAfterMinutes = generationError ? getRetryAfterMinutes(generationError) : null;
  const userFriendlyError = retryAfterMinutes
    ? `Za duża ilość prób. Spróbuj ponownie za: ${formatRetryAfter(retryAfterMinutes)}.`
    : 'Nie udało się wygenerować planu. Spróbuj ponownie później.';

  if (generationError) {
    return (
      <View style={[styles.container, { backgroundColor: currentColors.background, paddingTop: insets.top + 40 }]}>
        <View style={styles.iconWrapper}>
          <View style={[styles.errorIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          </View>
        </View>

        <Text style={[styles.title, { color: currentColors.text }]}>
          Nie udało się wygenerować planu
        </Text>
        <Text style={[styles.subtitle, styles.errorSubtitle, { color: currentColors.subtext }]}>
          {userFriendlyError}
        </Text>

        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: Colors.brand.blue }]}
          activeOpacity={0.85}
          onPress={() => router.replace('/(main)/create')}
        >
          <Ionicons name="close-outline" size={20} color="#fff" />
          <Text style={styles.closeButtonText}>Zamknij</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  errorIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorSubtitle: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 28,
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
  closeButton: {
    minHeight: 48,
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
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
