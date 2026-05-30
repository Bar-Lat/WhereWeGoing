import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  useColorScheme,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import ScheduleDayTimeline, { type TimelineActivityItem } from '@/components/ScheduleDayTimeline';
import TripMapTab from '@/components/TripMapTab';
import { useTripStore, TripPlan, DayPlan } from '@/stores/tripStore';
import { useAuth } from '@/providers/auth.provider';
import { useNetwork } from '@/providers/network.provider';
import DateRangePicker from '@/components/DateRangePicker';
import TimePickerSheet from '@/components/TimePickerSheet';
import {
  computeEndTime,
  durationFromTimes,
  activityRangeOverlapsOthers,
  type ActivityTimeRangeInput,
} from '@/utils/activityTime';
import { deleteTrip, updateTrip, refineTripPlanSchedule } from '@/services/trip.api';
import {
  getTripSchedule,
  createTripScheduleActivity,
  updateTripScheduleActivity,
} from '@/services/trips.api';
import type { TripScheduleDayDto } from '@/types/trips';
import { normalizeTripPlanNumbers } from '@/utils/normalizeTripPlan';
import { validateTripPlanSchedule } from '@/utils/scheduleValidation';
import { buildTransitsForActivities, mapDayTransitsToOverrides } from '@/utils/scheduleTransit';
import { parseActivityCoordinates } from '@/utils/activityMap';

// ─── HELPERY ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  transport: 'bus-outline',
  jedzenie: 'restaurant-outline',
  atrakcja: 'business-outline',
  nocleg: 'bed-outline',
  inne: 'bookmark-outline',
  food: 'restaurant-outline',
  attraction: 'business-outline',
  accommodation: 'bed-outline',
  other: 'bookmark-outline',
};

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[category?.toLowerCase()] ?? 'location-outline';
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    transport: '#f59e0b',
    jedzenie: '#10b981',
    food: '#10b981',
    atrakcja: Colors.brand.blue,
    attraction: Colors.brand.blue,
    nocleg: '#3b82f6',
    accommodation: '#3b82f6',
    inne: '#8b5cf6',
    other: '#8b5cf6',
  };
  return map[category?.toLowerCase()] ?? Colors.brand.blue;
}

const findScheduleDay = (scheduleDays: TripScheduleDayDto[], dayNumber: number) =>
  scheduleDays.find((item) => item.dayNumber === dayNumber);

const assignActivityIdsForDay = (
  day: DayPlan,
  scheduleDay: TripScheduleDayDto | undefined
): DayPlan['activities'] => {
  if (!scheduleDay?.activities?.length) return day.activities;
  const usedIds = new Set<string>();
  return day.activities.map((activity) => {
    const match =
      scheduleDay.activities.find(
        (item) => !usedIds.has(item.id) && item.name === activity.name && item.time === activity.time
      ) ||
      scheduleDay.activities.find((item) => !usedIds.has(item.id) && item.name === activity.name);
    if (!match) return activity;
    usedIds.add(match.id);
    return { ...activity, id: match.id };
  });
};

const mergePlanWithSchedule = (
  plan: TripPlan,
  scheduleDays: TripScheduleDayDto[],
  preserveLocalOrder: boolean
): TripPlan => ({
  ...plan,
  days: plan.days.map((day) => {
    const scheduleDay = findScheduleDay(scheduleDays, day.day);
    if (!scheduleDay) return day;
    if (preserveLocalOrder) {
      return { ...day, activities: assignActivityIdsForDay(day, scheduleDay) };
    }
    const usedPlanIndices = new Set<number>();
    const activities: DayPlan['activities'] = scheduleDay.activities.map((scheduleActivity) => {
      const planIndex = day.activities.findIndex(
        (activity, index) =>
          !usedPlanIndices.has(index) &&
          activity.name === scheduleActivity.name &&
          activity.time === scheduleActivity.time
      );
      const fallbackIndex =
        planIndex >= 0
          ? planIndex
          : day.activities.findIndex(
              (activity, index) => !usedPlanIndices.has(index) && activity.name === scheduleActivity.name
            );
      const planActivity = fallbackIndex >= 0 ? day.activities[fallbackIndex] : null;
      if (fallbackIndex >= 0) usedPlanIndices.add(fallbackIndex);
      return {
        ...(planActivity || {
          name: scheduleActivity.name,
          time: scheduleActivity.time,
          description: scheduleActivity.description,
          category: scheduleActivity.category,
          estimatedCost: scheduleActivity.cost,
          location: scheduleActivity.location,
          durationMinutes: scheduleActivity.durationMinutes ?? undefined,
        }),
        id: scheduleActivity.id,
        durationMinutes:
          scheduleActivity.durationMinutes ??
          planActivity?.durationMinutes ??
          undefined,
        coordinates:
          planActivity?.coordinates ??
          parseActivityCoordinates((scheduleActivity as { coordinates?: unknown }).coordinates) ??
          undefined,
        imageUrl: planActivity?.imageUrl ?? undefined,
      };
    });
    day.activities.forEach((activity, index) => {
      if (!usedPlanIndices.has(index)) activities.push(activity);
    });
    return { ...day, activities, transits: day.transits || scheduleDay.transits };
  }),
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length < 2) return dateStr;
  const [day, month] = parts;
  const months = ['', 'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  return `${parseInt(day)} ${months[parseInt(month)] ?? ''}`;
}

// ─── KOMPONENT DNIA ───────────────────────────────────────────────────────────
function DayCardView({
                       day,
                       index,
                       tripDestination,
                       currentColors,
                       isEditingMode,
                       preferredTransport,
                       onAddActivity,
                       onEditActivity,
                       onDeleteActivity,
                       onDeleteDay,
                       onReorderActivities,
                       onShowAlert,
                       parentScrollRef,
                       scrollOffsetRef,
                     }: {
  day: DayPlan;
  index: number;
  tripDestination: string;
  currentColors: any;
  isEditingMode: boolean;
  preferredTransport?: string[];
  onAddActivity: (dayIndex: number) => void;
  onEditActivity: (dayIndex: number, actIndex: number, act: any) => void;
  onDeleteActivity: (dayIndex: number, actIndex: number) => void;
  onDeleteDay: (dayIndex: number) => void;
  onReorderActivities: (dayIndex: number, orderedItems: TimelineActivityItem[]) => void | Promise<void>;
  onShowAlert: (title: string, msg: string, actions: any[]) => void;
  parentScrollRef?: React.RefObject<ScrollView | null>;
  scrollOffsetRef?: React.RefObject<number>;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  const textColor = expanded ? '#fff' : currentColors.text;
  const subtextColor = expanded ? 'rgba(255,255,255,0.85)' : currentColors.subtext;
  const iconColor = expanded ? '#fff' : currentColors.subtext;
  const numberBgColor = expanded ? 'rgba(255,255,255,0.25)' : currentColors.background;
  const numberTextColor = expanded ? '#fff' : Colors.brand.blue;

  const renderHeaderContent = () => (
      <>
        <View style={[styles.dayNumber, { backgroundColor: numberBgColor }]}>
          <Text style={[styles.dayNumberText, { color: numberTextColor }]}>
            {day.day}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <Text style={[styles.dayDate, {
            color: textColor,
            textShadowColor: expanded ? 'rgba(0,0,0,0.15)' : 'transparent',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2
          }]}>
            {formatDate(day.date)}
          </Text>
          <Text style={[styles.dayWeekday, { color: subtextColor }]}>
            {day.activities?.length || 0} punktów w planie
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 3 }}>
          {isEditingMode && (
              <TouchableOpacity
                  style={{ padding: 8, marginRight: 4 }}
                  onPress={() => {
                    onShowAlert('Usuwanie', `Czy na pewno chcesz usunąć dzień ${day.day}?`, [
                      { text: 'Anuluj', style: 'cancel' },
                      { text: 'Usuń', style: 'destructive', onPress: () => onDeleteDay(index) }
                    ]);
                  }}
              >
                <Ionicons name="trash" size={20} color={expanded ? '#fff' : '#ef4444'} />
              </TouchableOpacity>
          )}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={iconColor} style={{ marginRight: 4 }} />
        </View>
      </>
  );

  return (
      <View style={styles.dayWrapper}>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.85}
              style={[styles.dayHeaderWrapper, expanded && styles.gradientShadow]}
          >
            {expanded ? (
                <LinearGradient
                    colors={Colors.brand.logoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dayHeaderShared}
                >
                  {renderHeaderContent()}
                  <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.gloss} />
                </LinearGradient>
            ) : (
                <View style={[styles.dayHeaderShared, { backgroundColor: currentColors.card }]}>
                  {renderHeaderContent()}
                </View>
            )}
          </TouchableOpacity>
        </View>

        {expanded && (
            <View style={[styles.dayContent, { backgroundColor: currentColors.background }]}>
              {day.tips && (
                  <View style={{ padding: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="bulb-outline" size={16} color={Colors.brand.blue} />
                    <Text style={{ fontSize: 13, color: Colors.brand.blue, fontStyle: 'italic', flex: 1 }}>
                      {day.tips}
                    </Text>
                  </View>
              )}

              {day.activities?.length ? (
                <ScheduleDayTimeline
                  destination={tripDestination}
                  activities={day.activities.map((activity, actIndex): TimelineActivityItem => ({
                    key: activity.id ?? `${index}-${actIndex}`,
                    name: activity.name,
                    time: activity.time,
                    description: activity.description,
                    category: activity.category,
                    location: activity.location,
                    cost: activity.estimatedCost,
                    durationMinutes: activity.durationMinutes ?? null,
                    coordinates: activity.coordinates,
                    imageUrl: activity.imageUrl,
                  }))}
                  editable={isEditingMode}
                  showTransits={!isEditingMode}
                  transitOverrides={mapDayTransitsToOverrides(day.transits)}
                  preferredTransport={preferredTransport}
                  currentColors={currentColors}
                  parentScrollRef={parentScrollRef}
                  scrollOffsetRef={scrollOffsetRef}
                  onEdit={(actIndex) => onEditActivity(index, actIndex, day.activities[actIndex])}
                  onDelete={(activityKey) => {
                    const actIndexById = day.activities.findIndex((activity) => activity.id === activityKey);
                    if (actIndexById >= 0) {
                      onDeleteActivity(index, actIndexById);
                      return;
                    }
                    const actIndex = Number(activityKey.split('-').pop());
                    if (!Number.isNaN(actIndex)) onDeleteActivity(index, actIndex);
                  }}
                  onOrderConfirm={(orderedItems) => {
                    void onReorderActivities(index, orderedItems);
                  }}
                />
              ) : (
                <Text style={{ color: currentColors.subtext, fontSize: 14, paddingVertical: 8 }}>
                  Brak punktów w tym dniu.
                </Text>
              )}

              {isEditingMode && (
                  <TouchableOpacity style={[styles.addActivityBtn, { borderColor: Colors.brand.blue }]} onPress={() => onAddActivity(index)}>
                    <Ionicons name="add" size={18} color={Colors.brand.blue} />
                    <Text style={{ color: Colors.brand.blue, fontWeight: '600' }}>Dodaj atrakcję</Text>
                  </TouchableOpacity>
              )}
            </View>
        )}
      </View>
  );
}

// ─── GŁÓWNY EKRAN SZCZEGÓŁÓW ──────────────────────────────────────────────────
export default function TripDetails() {
  const {
    tripPlan,
    formData,
    deleteDay,
    addDay,
    addActivity,
    updateActivity,
    deleteActivity,
    setActivitiesOrder,
    setTripPlan,
    isEditingMode,
    setIsEditingMode,
  } = useTripStore();
  const { session } = useAuth();
  const { isOffline } = useNetwork();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<TripScheduleDayDto[]>([]);
  const [backupPlan, setBackupPlan] = useState<TripPlan | null>(null);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  React.useEffect(() => {
    const onBackPress = () => {
      if (isEditingMode) {
        handleBackPress();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isEditingMode, backupPlan]);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<'schedule' | 'budget' | 'map'>('schedule');
  const scrollY = useRef(new Animated.Value(0)).current;

  const HEADER_MAX_HEIGHT = 240;
  const HEADER_MIN_HEIGHT = insets.top + 120;
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const TAB_BAR_HEIGHT = 54;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const navTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const [datesModal, setDatesModal] = useState({ visible: false, startDate: '', endDate: '' });
  const [budgetModal, setBudgetModal] = useState({ visible: false, value: '' });
  const [actModal, setActModal] = useState({
    visible: false,
    mode: 'add' as 'add' | 'edit',
    dayIndex: -1,
    actIndex: -1,
    formData: {
      name: '',
      time: '09:00',
      endTime: '10:00',
      category: 'inne',
      description: '',
      estimatedCost: '0',
      location: '',
    }
  });
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: '',
    message: '',
    actions: [] as any[]
  });

  useEffect(() => {
    if (isOffline) {
      setIsEditingMode(false);
    }
  }, [isOffline, setIsEditingMode]);

  const resolveScheduleDay = React.useCallback(
    async (dayNumber: number): Promise<TripScheduleDayDto | undefined> => {
      const cached = findScheduleDay(scheduleDays, dayNumber);
      if (cached) return cached;

      const tripId = tripPlan?.id || useTripStore.getState().savedTripId;
      if (!tripId || !session?.access_token || isOffline) return undefined;

      const response = await getTripSchedule(session.access_token, tripId);
      const days = response.days || [];
      setScheduleDays(days);
      return findScheduleDay(days, dayNumber);
    },
    [isOffline, scheduleDays, session?.access_token, tripPlan?.id]
  );

  useEffect(() => {
    const tripId = tripPlan?.id || useTripStore.getState().savedTripId;
    if (!tripId || !session?.access_token || isOffline) {
      setScheduleDays([]);
      return;
    }

    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const response = await getTripSchedule(session.access_token, tripId);
        if (cancelled) return;
        const days = response.days || [];
        setScheduleDays(days);
        const currentPlan = useTripStore.getState().tripPlan;
        if (currentPlan?.days?.length) {
          const merged = mergePlanWithSchedule(currentPlan, days, useTripStore.getState().isEditingMode);
          setTripPlan(merged);
        }
      } catch (error) {
        console.warn('Nie udało się pobrać harmonogramu:', error);
      }
    };

    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [tripPlan?.id, session?.access_token, isOffline, setTripPlan]);

  const syncPlanWithDb = async (forcedPlan?: TripPlan) => {
    if (isOffline) {
      throw new Error('Zapis planu wymaga połączenia z internetem.');
    }

    const rawPlan = forcedPlan || useTripStore.getState().tripPlan;
    const tripId = rawPlan?.id || useTripStore.getState().savedTripId;
    if (!tripId) throw new Error('Brak identyfikatora wycieczki.');
    if (!session?.access_token) throw new Error('Brak sesji logowania.');

    const planToSave = normalizeTripPlanNumbers({ ...(rawPlan || {}), id: tripId } as TripPlan);
    await updateTrip(tripId, planToSave, session.access_token);
    setTripPlan(planToSave);
    useTripStore.getState().setSavedTripId(tripId);
  };

  const showAlert = (title: string, message: string, actions: any[]) => {
    setCustomAlert({ visible: true, title, message, actions });
  };

  const getOtherActivityRanges = (
    dayIndex: number,
    actIndex: number,
    mode: 'add' | 'edit'
  ): ActivityTimeRangeInput[] => {
    const day = tripPlan?.days[dayIndex];
    if (!day) return [];

    return day.activities
      .filter((_, index) => mode === 'add' || index !== actIndex)
      .map((activity) => ({
        startTime: activity.time,
        durationMinutes: activity.durationMinutes,
      }));
  };

  const validateActivityStartTime = (
    startTime: string,
    endTime: string,
    dayIndex: number,
    actIndex: number,
    mode: 'add' | 'edit'
  ) => {
    const resolvedEnd =
      durationFromTimes(startTime, endTime) === null ? computeEndTime(startTime, 60) : endTime;
    if (durationFromTimes(startTime, resolvedEnd) === null) return false;

    return !activityRangeOverlapsOthers(
      { startTime, endTime: resolvedEnd },
      getOtherActivityRanges(dayIndex, actIndex, mode)
    );
  };

  const validateActivityEndTime = (
    startTime: string,
    endTime: string,
    dayIndex: number,
    actIndex: number,
    mode: 'add' | 'edit'
  ) => {
    if (durationFromTimes(startTime, endTime) === null) return false;

    return !activityRangeOverlapsOthers(
      { startTime, endTime },
      getOtherActivityRanges(dayIndex, actIndex, mode)
    );
  };

  const persistActivityTimeRange = async (time: string, endTime: string) => {
    const durationMinutes = durationFromTimes(time, endTime);
    if (durationMinutes === null) return;

    const { dayIndex, actIndex, mode, formData } = actModal;
    const existing = tripPlan?.days[dayIndex]?.activities[actIndex];

    setActModal((prev) => ({
      ...prev,
      formData: { ...prev.formData, time, endTime },
    }));

    if (mode === 'edit' && existing) {
      updateActivity(dayIndex, actIndex, { ...existing, time, durationMinutes });
    }

    const tripId = tripPlan?.id || useTripStore.getState().savedTripId;
    if (mode !== 'edit' || !existing?.id || !tripId || !session?.access_token || isOffline) {
      return;
    }

    try {
      setIsSavingActivity(true);
      const response = await updateTripScheduleActivity(session.access_token, tripId, existing.id, {
        name: formData.name.trim() || existing.name,
        time,
        durationMinutes,
        description: formData.description || existing.description || '',
        category: formData.category || existing.category,
        location: formData.location.trim() || existing.location || '',
        cost: Number(formData.estimatedCost) || existing.estimatedCost || 0,
      });
      setScheduleDays(response.days || []);
      const currentPlan = useTripStore.getState().tripPlan;
      if (currentPlan) {
        setTripPlan(mergePlanWithSchedule(currentPlan, response.days || [], false));
      }
    } catch (error: any) {
      Alert.alert('Nie udało się zapisać godziny', error?.message || 'Spróbuj ponownie.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const openBudgetModal = () => {
    if (isOffline) return;
    setBudgetModal({ visible: true, value: String(tripPlan?.estimatedTotalCost || 0) });
  };

  const handleSaveBudget = async () => {
    const newBudget = Number(budgetModal.value.replace(/[^0-9]/g, '')) || 0;
    useTripStore.getState().updateBudget(newBudget);
    setBudgetModal({ visible: false, value: '' });
  };

  const openAddActivity = (dayIndex: number) => {
    if (isOffline) return;
    setActModal({
      visible: true,
      mode: 'add',
      dayIndex,
      actIndex: -1,
      formData: {
      name: '',
      time: '09:00',
      endTime: '10:00',
      category: 'inne',
      description: '',
      estimatedCost: '0',
      location: '',
    }
    });
  };

  const openEditActivity = (dayIndex: number, actIndex: number, activity: any) => {
    if (isOffline) return;
    setActModal({
      visible: true,
      mode: 'edit',
      dayIndex,
      actIndex,
      formData: {
        name: activity.name,
        time: activity.time,
        endTime: computeEndTime(activity.time, activity.durationMinutes),
        category: activity.category,
        description: activity.description || '',
        estimatedCost: String(activity.estimatedCost || 0),
        location: activity.location || '',
      }
    });
  };

  const handleSaveActivity = async () => {
    if (!actModal.formData.name.trim()) {
      Alert.alert('Błąd', 'Nazwa atrakcji jest wymagana');
      return;
    }

    const durationMinutes = durationFromTimes(actModal.formData.time, actModal.formData.endTime);
    if (durationMinutes === null) {
      Alert.alert('Błąd', 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.');
      return;
    }

    if (
      !validateActivityStartTime(
        actModal.formData.time,
        actModal.formData.endTime,
        actModal.dayIndex,
        actModal.actIndex,
        actModal.mode
      )
    ) {
      Alert.alert('Błąd', 'Wybrany przedział godzin koliduje z inną atrakcją w tym dniu.');
      return;
    }

    const payload = {
      name: actModal.formData.name.trim(),
      time: actModal.formData.time,
      durationMinutes,
      category: actModal.formData.category,
      description: actModal.formData.description,
      estimatedCost: Number(actModal.formData.estimatedCost) || 0,
      location: actModal.formData.location.trim(),
    };

    if (actModal.mode === 'add') {
      const day = tripPlan?.days[actModal.dayIndex];
      const tripId = tripPlan?.id || useTripStore.getState().savedTripId;

      if (day && tripId && session?.access_token && !isOffline) {
        try {
          setIsSavingActivity(true);
          const scheduleDay = await resolveScheduleDay(day.day);
          if (!scheduleDay) {
            Alert.alert('Błąd', 'Nie znaleziono dnia w harmonogramie — odśwież plan i spróbuj ponownie.');
            return;
          }

          const response = await createTripScheduleActivity(session.access_token, tripId, scheduleDay.id, {
            name: payload.name,
            time: payload.time,
            durationMinutes: payload.durationMinutes,
            description: payload.description,
            category: payload.category,
            location: payload.location,
            cost: payload.estimatedCost,
          });

          setScheduleDays(response.days || []);
          const currentPlan = useTripStore.getState().tripPlan;
          if (currentPlan) {
            setTripPlan(mergePlanWithSchedule(currentPlan, response.days || [], false));
          }
        } catch (error: any) {
          Alert.alert('Nie udało się dodać atrakcji', error?.message || 'Spróbuj ponownie.');
          return;
        } finally {
          setIsSavingActivity(false);
        }
      } else {
        addActivity(actModal.dayIndex, payload);
      }
    } else {
      const existing = tripPlan?.days[actModal.dayIndex]?.activities[actModal.actIndex];
      const merged = { ...existing, ...payload };
      const tripId = tripPlan?.id || useTripStore.getState().savedTripId;

      if (existing?.id && tripId && session?.access_token && !isOffline) {
        try {
          setIsSavingActivity(true);
          const response = await updateTripScheduleActivity(session.access_token, tripId, existing.id, {
            name: payload.name,
            time: payload.time,
            durationMinutes: payload.durationMinutes,
            description: payload.description,
            category: payload.category,
            location: payload.location,
            cost: payload.estimatedCost,
          });
          setScheduleDays(response.days || []);
          const currentPlan = useTripStore.getState().tripPlan;
          if (currentPlan) {
            setTripPlan(mergePlanWithSchedule(currentPlan, response.days || [], false));
          }
        } catch (error: any) {
          Alert.alert('Nie udało się zapisać atrakcji', error?.message || 'Spróbuj ponownie.');
          return;
        } finally {
          setIsSavingActivity(false);
        }
      } else {
        updateActivity(actModal.dayIndex, actModal.actIndex, merged);
      }
    }

    setActModal((prev) => ({ ...prev, visible: false }));
  };

  const handleAddDay = async () => {
    if (isOffline) return;

    const nextDayNum = (tripPlan?.days?.length || 0) + 1;
    let newDate = '';
    if (tripPlan?.days && tripPlan.days.length > 0) {
      const lastDateStr = tripPlan.days[tripPlan.days.length - 1].date;
      if (lastDateStr && lastDateStr.includes('.')) {
        const [d, m, y] = lastDateStr.split('.');
        const nextDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const dd = String(nextDateObj.getDate()).padStart(2, '0');
        const mm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = nextDateObj.getFullYear();
        newDate = `${dd}.${mm}.${yyyy}`;
      }
    }

    addDay({
      day: nextDayNum,
      date: newDate,
      title: 'Nowy dzień',
      activities: [],
      estimatedDayCost: 0,
      tips: ''
    });
  };

  const handleLocalDeleteDay = async (dayIndex: number) => {
    if (isOffline) return;
    deleteDay(dayIndex);
  };

  const handleLocalDeleteActivity = async (dayIndex: number, actIndex: number) => {
    if (isOffline) return;
    deleteActivity(dayIndex, actIndex);
  };

  const handleReorderActivities = async (dayIndex: number, orderedItems: TimelineActivityItem[]) => {
    const day = tripPlan?.days[dayIndex];
    if (!day) return;

    const activityByKey = new Map<string, DayPlan['activities'][number]>();
    day.activities.forEach((activity, actIndex) => {
      activityByKey.set(activity.id ?? `${dayIndex}-${actIndex}`, activity);
    });

    const reorderedActivities = orderedItems
      .map((item) => {
        const base = activityByKey.get(item.key);
        if (!base) return null;
        return { ...base, time: item.time };
      })
      .filter((activity): activity is DayPlan['activities'][number] => Boolean(activity));

    if (reorderedActivities.length !== day.activities.length) {
      Alert.alert('Błąd', 'Nie udało się ustalić nowej kolejności.');
      return;
    }

    setActivitiesOrder(dayIndex, reorderedActivities);
  };

  const enterEditMode = async () => {
    const tripId = tripPlan?.id || useTripStore.getState().savedTripId;
    let planForEdit = tripPlan;

    if (tripId && session?.access_token && !isOffline) {
      try {
        const response = await getTripSchedule(session.access_token, tripId);
        const days = response.days || [];
        setScheduleDays(days);
        if (planForEdit) {
          planForEdit = mergePlanWithSchedule(planForEdit, days, true);
          setTripPlan(planForEdit);
        }
      } catch (error) {
        console.warn('Nie udało się odświeżyć harmonogramu:', error);
      }
    }

    setBackupPlan(JSON.parse(JSON.stringify(planForEdit)));
    setIsEditingMode(true);
  };

  const cancelEditMode = () => {
    showAlert(
        "Niezapisane zmiany",
        "Czy na pewno chcesz odrzucić wszystkie wprowadzone zmiany?",
        [
          { text: "Wróć do edycji", style: "cancel" },
          {
            text: "Odrzuć",
            style: "destructive",
            onPress: () => {
              if (backupPlan) {
                useTripStore.getState().setTripPlan(backupPlan);
              }
              setIsEditingMode(false);
              setBackupPlan(null);
            }
          }
        ]
    );
  };

  const handleBackPress = () => {
    if (isEditingMode) {
      showAlert("Tryb edycji", "Masz niezapisane zmiany w planie!", [{ text: "Ok" }]);
    } else {
      router.back();
    }
  };

  const applyLocalTransitsToPlan = (plan: TripPlan, preferredTransport: string[]): TripPlan => ({
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      transits: buildTransitsForActivities(
        day.activities.map((activity) => ({
          name: activity.name,
          location: activity.location,
          category: activity.category,
          time: activity.time,
          durationMinutes: activity.durationMinutes,
        })),
        preferredTransport
      ),
    })),
  });

  const saveEditMode = async () => {
    const plan = useTripStore.getState().tripPlan;
    if (!plan) return;

    const validation = validateTripPlanSchedule(plan);
    if (!validation.valid) {
      Alert.alert('Nieprawidłowy harmonogram', validation.message);
      return;
    }

    try {
      setIsApplyingEdit(true);
      const preferredTransport = formData?.transport || [];
      const tripId = plan.id || useTripStore.getState().savedTripId;
      let planWithTransits: TripPlan = applyLocalTransitsToPlan(plan, preferredTransport);

      if (session?.access_token && !isOffline) {
        try {
          const refined = await refineTripPlanSchedule(
            normalizeTripPlanNumbers(plan),
            session.access_token,
            { tripId: tripId || undefined, preferredTransport }
          );
          if (refined?.tripPlan?.days) {
            planWithTransits = refined.tripPlan as TripPlan;
          }
        } catch (groqError) {
          console.warn('Groq refine failed, using local transits:', groqError);
        }
      }

      const planToSave = normalizeTripPlanNumbers(planWithTransits);
      await syncPlanWithDb(planToSave);
      setIsEditingMode(false);
      setBackupPlan(null);
    } catch (error: any) {
      Alert.alert('Nie udało się zapisać planu', error?.message || 'Spróbuj ponownie.');
    } finally {
      setIsApplyingEdit(false);
    }
  };

  const handleSaveDates = async () => {
    if (isOffline) return;

    if (!datesModal.startDate || !datesModal.endDate) {
      showAlert("Błąd", "Wybierz pełny zakres dat (wylot i powrót).", [{ text: "OK" }]);
      return;
    }

    const parseDate = (dStr: string) => {
      const [d, m, y] = dStr.split('.');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const start = parseDate(datesModal.startDate);
    const end = parseDate(datesModal.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      showAlert("Błąd", "Nieprawidłowy zakres dat.", [{ text: "OK" }]);
      return;
    }

    const newTotalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const newDays: DayPlan[] = [];

    for (let i = 0; i < newTotalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dd = String(currentDate.getDate()).padStart(2, '0');
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const yyyy = currentDate.getFullYear();
      const dateString = `${dd}.${mm}.${yyyy}`;

      if (i < (tripPlan?.days?.length || 0)) {
        newDays.push({ ...tripPlan!.days[i], date: dateString, day: i + 1 });
      } else {
        newDays.push({
          day: i + 1,
          date: dateString,
          title: 'Nowy dzień',
          activities: [],
          estimatedDayCost: 0,
          tips: ''
        });
      }
    }

    if ((tripPlan?.days?.length || 0) > newTotalDays) {
      showAlert(
          "Uwaga",
          `Nowy zakres dat jest krótszy. Usunięte zostaną ${tripPlan!.days.length - newTotalDays} dni z końca planu. Kontynuować?`,
          [
            { text: "Anuluj", style: "cancel" },
            {
              text: "Zastosuj",
              style: "destructive",
              onPress: async () => {
                const updated = { ...tripPlan!, days: newDays, totalDays: newTotalDays };
                useTripStore.getState().setTripPlan(updated);
                setDatesModal({ visible: false, startDate: '', endDate: '' });
              }
            }
          ]
      );
      return;
    }

    const updated = { ...tripPlan!, days: newDays, totalDays: newTotalDays };
    useTripStore.getState().setTripPlan(updated);
    setDatesModal({ visible: false, startDate: '', endDate: '' });
  };

  const handleDeleteTrip = () => {
    if (isOffline) return;

    const tripId = tripPlan?.id;
    if (!tripId) return;

    showAlert(
        "Usuwanie wycieczki",
        "Czy na pewno chcesz usunąć ten plan? Tej akcji nie można cofnąć.",
        [
          { text: "Anuluj", style: "cancel" },
          {
            text: "Usuń",
            style: "destructive",
            onPress: async () => {
              try {
                setIsDeleting(true);
                await deleteTrip(tripId, session!.access_token);
                useTripStore.getState().notifyTripDeleted(tripId);
                useTripStore.getState().removeTripFromList(tripId);
                useTripStore.getState().reset();
                router.replace('/(main)/trips');
              } catch (error: any) {
                showAlert('Błąd', error.message || 'Nie udało się usunąć wycieczki.', [{ text: 'OK' }]);
              } finally {
                setIsDeleting(false);
              }
            }
          }
        ]
    );
  };

  if (!tripPlan) {
    return (
        <View style={[styles.container, { backgroundColor: currentColors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: currentColors.subtext, fontSize: 16 }}>Nie znaleziono szczegółów wycieczki.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: Colors.brand.blue, fontSize: 16, fontWeight: '600' }}>← Wróć do listy</Text>
          </TouchableOpacity>
        </View>
    );
  }

  const heroImageUri = tripPlan.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600';
  const totalDays = tripPlan.days?.length || 0;
  const calculatedTotalCost = tripPlan.days?.reduce((sum, day) => sum + (day.estimatedDayCost || 0), 0) || 0;

  return (
      <View style={[styles.container, { backgroundColor: currentColors.background }]}>
        <Animated.ScrollView
            ref={scrollRef as any}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: HEADER_MAX_HEIGHT + TAB_BAR_HEIGHT + 16,
                paddingBottom: insets.bottom + 120
              }
            ]}
            showsVerticalScrollIndicator={false}
            scrollIndicatorInsets={{ top: HEADER_MAX_HEIGHT + TAB_BAR_HEIGHT }}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
              listener: (event: any) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              },
            })}
        >
          {activeTab === 'schedule' && (
              <View>
                {tripPlan.days?.map((day, index) => (
                    <DayCardView
                        key={index}
                        day={day}
                        index={index}
                        tripDestination={tripPlan.destination}
                        currentColors={currentColors}
                        isEditingMode={isEditingMode}
                        preferredTransport={formData?.transport}
                        onAddActivity={openAddActivity}
                        onEditActivity={openEditActivity}
                        onDeleteActivity={handleLocalDeleteActivity}
                        onDeleteDay={handleLocalDeleteDay}
                        onReorderActivities={handleReorderActivities}
                        onShowAlert={showAlert}
                        parentScrollRef={scrollRef}
                        scrollOffsetRef={scrollOffsetRef}
                    />
                ))}

                {isEditingMode && (
                    <TouchableOpacity style={[styles.addDayBtn, { backgroundColor: Colors.brand.blue }]} onPress={handleAddDay}>
                      <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Dodaj kolejny dzień</Text>
                    </TouchableOpacity>
                )}
              </View>
          )}

          {activeTab === 'map' && (
              <TripMapTab
                days={tripPlan.days || []}
                destination={tripPlan.destination}
                currentColors={currentColors}
              />
          )}

          {activeTab === 'budget' && (
              <View>
                <View style={[styles.budgetSummaryCard, { backgroundColor: currentColors.card }]}>
                  <Text style={{ color: currentColors.subtext, fontSize: 14 }}>Całkowity deklarowany budżet</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
                    <Text style={{ color: currentColors.text, fontSize: 28, fontWeight: '800' }}>
                      {tripPlan.estimatedTotalCost} {tripPlan.currency}
                    </Text>
                    {isEditingMode && (
                        <TouchableOpacity onPress={openBudgetModal} style={{ padding: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20 }}>
                          <Ionicons name="pencil" size={18} color={Colors.brand.blue} />
                        </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ height: 1, backgroundColor: currentColors.border, width: '100%', marginVertical: 12 }} />
                  <Text style={{ color: currentColors.subtext, fontSize: 14 }}>
                    Szacowany koszt planu: <Text style={{ color: Colors.brand.blue, fontWeight: 'bold' }}>{calculatedTotalCost} {tripPlan.currency}</Text>
                  </Text>
                </View>
                <Text style={{ color: currentColors.text, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 12 }}>
                  Rozbicie na dni
                </Text>
                {tripPlan.days?.map((day, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: currentColors.border }}>
                      <View>
                        <Text style={{ color: currentColors.text, fontWeight: '600' }}>Dzień {day.day} - {formatDate(day.date)}</Text>
                        <Text style={{ color: currentColors.subtext, fontSize: 12 }}>{day.activities.length} aktywności</Text>
                      </View>
                      <Text style={{ color: Colors.brand.blue, fontWeight: '700', fontSize: 16 }}>{day.estimatedDayCost} PLN</Text>
                    </View>
                ))}
              </View>
          )}
        </Animated.ScrollView>

        <Animated.View style={[styles.headerAbsoluteWrapper, { transform: [{ translateY: headerTranslateY }] }]}>
          <View style={styles.heroContainer}>
            <ImageBackground source={{ uri: heroImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover">
              <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(26,29,58,0.95)']} style={StyleSheet.absoluteFillObject} />

              <Animated.View style={[styles.heroNav, { paddingTop: insets.top + 8, transform: [{ translateY: navTranslateY }] }]}>
                <TouchableOpacity style={styles.heroNavBtn} onPress={handleBackPress}>
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {!isOffline && (
                      isEditingMode ? (
                          <>
                            <TouchableOpacity
                                style={[styles.heroNavBtn, { backgroundColor: '#ef4444' }]}
                                onPress={cancelEditMode}
                            >
                              <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.heroNavBtn, { backgroundColor: '#10b981' }]}
                                onPress={saveEditMode}
                                disabled={isApplyingEdit}
                            >
                              {isApplyingEdit ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons name="checkmark" size={20} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </>
                      ) : (
                          <>
                            <TouchableOpacity
                                style={[styles.heroNavBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                                onPress={enterEditMode}
                            >
                              <Ionicons name="pencil" size={18} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.heroNavBtn, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]}
                                onPress={handleDeleteTrip}
                                disabled={isDeleting}
                            >
                              {isDeleting ? (
                                  <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                  <Ionicons name="trash-outline" size={18} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </>
                      )
                  )}
                </View>
              </Animated.View>

              <View style={styles.heroInfo}>
                <Text style={styles.heroCity} numberOfLines={1}>{tripPlan.destination}</Text>
                <View style={styles.heroBadges}>
                  <TouchableOpacity
                      style={[styles.heroBadge, isEditingMode && { backgroundColor: Colors.brand.blue, borderColor: 'rgba(255,255,255,0.4)' }]}
                      disabled={!isEditingMode}
                      onPress={() => {
                        const firstDay = tripPlan.days?.[0]?.date || '';
                        const lastDay = tripPlan.days?.[tripPlan.days.length - 1]?.date || firstDay;
                        setDatesModal({ visible: true, startDate: firstDay, endDate: lastDay });
                      }}
                  >
                    <Ionicons name="calendar-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.heroBadgeText}>
                      {tripPlan.days?.[0]?.date ? `${formatDate(tripPlan.days[0].date)} • ` : ''}{totalDays} dni
                    </Text>
                    {isEditingMode && <Ionicons name="pencil" size={12} color="#fff" style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>

                  <View style={styles.heroBadge}>
                    <Ionicons name="wallet-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.heroBadgeText}>{tripPlan.estimatedTotalCost || 0} PLN</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          <View style={[styles.tabBar, { backgroundColor: currentColors.card, borderBottomColor: currentColors.border }]}>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('schedule')}>
              <Text style={[styles.tabText, { color: activeTab === 'schedule' ? Colors.brand.blue : currentColors.subtext }]}>Harmonogram</Text>
              {activeTab === 'schedule' && <View style={[styles.tabUnderline, { backgroundColor: Colors.brand.blue }]} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('budget')}>
              <Text style={[styles.tabText, { color: activeTab === 'budget' ? Colors.brand.blue : currentColors.subtext }]}>Budżet</Text>
              {activeTab === 'budget' && <View style={[styles.tabUnderline, { backgroundColor: Colors.brand.blue }]} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('map')}>
              <Text style={[styles.tabText, { color: activeTab === 'map' ? Colors.brand.blue : currentColors.subtext }]}>Mapa</Text>
              {activeTab === 'map' && <View style={[styles.tabUnderline, { backgroundColor: Colors.brand.blue }]} />}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Modal visible={actModal.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: currentColors.background }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>{actModal.mode === 'add' ? 'Nowa atrakcja' : 'Edytuj atrakcję'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Nazwa</Text>
                <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]} value={actModal.formData.name} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, name: t } }))} />
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Godziny</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: currentColors.subtext, marginBottom: 6 }]}>Początek</Text>
                    <TimePickerSheet
                      value={actModal.formData.time}
                      onChange={(time) => {
                        const endTime =
                          durationFromTimes(time, actModal.formData.endTime) === null
                            ? computeEndTime(time, 60)
                            : actModal.formData.endTime;
                        setActModal((p) => ({
                          ...p,
                          formData: { ...p.formData, time, endTime },
                        }));
                      }}
                      onConfirm={async (time) => {
                        const endTime =
                          durationFromTimes(time, actModal.formData.endTime) === null
                            ? computeEndTime(time, 60)
                            : actModal.formData.endTime;
                        await persistActivityTimeRange(time, endTime);
                      }}
                      validateDraft={(draft) =>
                        validateActivityStartTime(
                          draft,
                          actModal.formData.endTime,
                          actModal.dayIndex,
                          actModal.actIndex,
                          actModal.mode
                        )
                      }
                      label="Godzina rozpoczęcia"
                      textColor={currentColors.text}
                      subtextColor={currentColors.subtext}
                      borderColor={currentColors.border}
                      cardColor={currentColors.background}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: currentColors.subtext, marginBottom: 6 }]}>Koniec</Text>
                    <TimePickerSheet
                      value={actModal.formData.endTime}
                      onChange={(endTime) =>
                        setActModal((p) => ({ ...p, formData: { ...p.formData, endTime } }))
                      }
                      onConfirm={async (endTime) => {
                        await persistActivityTimeRange(actModal.formData.time, endTime);
                      }}
                      validateDraft={(draft) =>
                        validateActivityEndTime(
                          actModal.formData.time,
                          draft,
                          actModal.dayIndex,
                          actModal.actIndex,
                          actModal.mode
                        )
                      }
                      label="Godzina zakończenia"
                      textColor={currentColors.text}
                      subtextColor={currentColors.subtext}
                      borderColor={currentColors.border}
                      cardColor={currentColors.background}
                    />
                  </View>
                </View>
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Koszt (PLN)</Text>
                <TextInput
                  style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, marginBottom: 12 }]}
                  value={actModal.formData.estimatedCost}
                  onChangeText={(t) =>
                    setActModal((p) => ({ ...p, formData: { ...p.formData, estimatedCost: t.replace(/[^0-9]/g, '') } }))
                  }
                  keyboardType="numeric"
                />
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Lokalizacja (opcjonalnie)</Text>
                <TextInput
                  style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]}
                  value={actModal.formData.location}
                  onChangeText={(t) => setActModal((p) => ({ ...p, formData: { ...p.formData, location: t } }))}
                  placeholder="np. Stare Miasto"
                  placeholderTextColor={currentColors.subtext}
                />
                <Text style={[styles.inputLabel, { color: currentColors.subtext }]}>Opis</Text>
                <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, height: 80, textAlignVertical: 'top' }]} value={actModal.formData.description} onChangeText={t => setActModal(p => ({ ...p, formData: { ...p.formData, description: t } }))} multiline />
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setActModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveActivity}
                  disabled={isSavingActivity}
                  style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue, opacity: isSavingActivity ? 0.7 : 1 }]}
                >
                  {isSavingActivity ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={budgetModal.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: currentColors.background, paddingVertical: 32 }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text, marginBottom: 8 }]}>Edytuj budżet</Text>
              <TextInput style={[styles.input, { color: currentColors.text, borderColor: currentColors.border, width: '100%', fontSize: 24, textAlign: 'center', fontWeight: '700' }]} value={budgetModal.value} onChangeText={t => setBudgetModal(p => ({ ...p, value: t.replace(/[^0-9]/g, '') }))} keyboardType="numeric" />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setBudgetModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveBudget} style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={customAlert.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: currentColors.background, width: '85%', padding: 24 }]}>
              <Text style={[{ fontSize: 20, fontWeight: '800', textAlign: 'center', color: currentColors.text, marginBottom: 12 }]}>{customAlert.title}</Text>
              <Text style={[{ fontSize: 15, textAlign: 'center', color: currentColors.subtext, marginBottom: 24, lineHeight: 22 }]}>{customAlert.message}</Text>
              <View style={{ width: '100%', gap: 10 }}>
                {customAlert.actions.map((action, idx) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setCustomAlert(prev => ({ ...prev, visible: false }));
                          if (action.onPress) setTimeout(() => action.onPress(), 150);
                        }}
                        style={[styles.alertBtn, action.style === 'destructive' ? { backgroundColor: '#ef4444' } : action.style === 'cancel' ? { backgroundColor: currentColors.card, borderWidth: 1, borderColor: currentColors.border } : { backgroundColor: Colors.brand.blue }]}
                    >
                      <Text style={[styles.alertBtnText, action.style === 'cancel' ? { color: currentColors.text } : { color: '#fff' }]}>{action.text}</Text>
                    </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={datesModal.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: currentColors.background, paddingVertical: 24, width: '100%' }]}>
              <Text style={[styles.modalTitle, { color: currentColors.text, marginBottom: 16 }]}>Termin wycieczki</Text>
              <ScrollView style={{ width: '100%', flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                <DateRangePicker departureDate={datesModal.startDate} returnDate={datesModal.endDate} onDatesChange={(start, end) => setDatesModal(prev => ({ ...prev, startDate: start, endDate: end }))} />
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setDatesModal(p => ({ ...p, visible: false }))} style={styles.modalCancelBtn}><Text style={{ color: currentColors.subtext, fontWeight: '600' }}>Anuluj</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveDates} style={[styles.modalSaveBtn, { backgroundColor: Colors.brand.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Zapisz</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isApplyingEdit} transparent animationType="fade">
          <View style={styles.editOverlay}>
            <View style={[styles.editOverlayCard, { backgroundColor: currentColors.card }]}>
              <ActivityIndicator size="large" color={Colors.brand.blue} />
              <Text style={[styles.editOverlayText, { color: currentColors.text }]}>Zapisywanie ...</Text>
            </View>
          </View>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerAbsoluteWrapper: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  heroContainer: { height: 240, width: '100%', overflow: 'hidden' },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 20 },
  heroNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heroInfo: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroCity: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 10 },
  heroBadges: { flexDirection: 'row', gap: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabBar: { height: 54, flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  scrollContent: { paddingHorizontal: 16 },
  dayWrapper: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  dayNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14, zIndex: 2 },
  dayNumberText: { fontSize: 16, fontWeight: '800' },
  dayInfo: { flex: 1, zIndex: 2 },
  dayDate: { fontSize: 16, fontWeight: '800' },
  dayWeekday: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  dayContent: { paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4 },
  dayHeaderWrapper: { borderRadius: 16 },
  timelineRow: { flexDirection: 'row', marginTop: 12 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 16 },
  timelineLine: { flex: 1, width: 2, marginTop: 6 },
  activityCard: { flex: 1, borderRadius: 14, padding: 14, marginBottom: 2 },
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  activityIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  activityMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  activityMetaText: { fontSize: 12, fontWeight: '500' },
  activityCost: { fontSize: 12, fontWeight: '700' },
  activityDesc: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  budgetSummaryCard: { borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  gradientShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  dayHeaderGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 68 },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  addActivityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 12, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, gap: 6 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 10, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  editOverlayCard: { borderRadius: 20, paddingHorizontal: 32, paddingVertical: 28, alignItems: 'center', gap: 16, minWidth: 200 },
  editOverlayText: { fontSize: 16, fontWeight: '700' },
  modalCard: { width: '100%', maxHeight: '80%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  modalActions: { flexDirection: 'row', marginTop: 24, width: '100%', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  modalSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertBtnText: { fontSize: 16, fontWeight: '700' },
  dayHeaderShared: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 68 },
});