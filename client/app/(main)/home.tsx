import React, { useMemo, useState, useEffect } from 'react'; 
import { 
  View, Text, ScrollView, TouchableOpacity, 
  Image, useColorScheme, ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/home.styles';
import ScreenHeader from '../../components/ScreenHeader';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useNetwork } from '@/providers/network.provider';
import { useNotifications } from '@/providers/notifications.provider';
import { useTripStore, TripPlan } from '@/stores/tripStore';
import { getTripSchedule } from '@/services/trips.api';
import { mapScheduleDaysToPlanDays } from '@/utils/mapScheduleToPlan';
import { resolveHomeScheduleDay } from '@/utils/homeScheduleDay';
import { formatActivityTimeRange } from '@/utils/activityTime';
import { getCategoryIcon } from '@/utils/activityCategory';
import ActivityCostBadge, { formatPlnAmount } from '@/components/ActivityCostBadge';
import type { TripScheduleActivityDto, TripScheduleDayDto } from '@/types/trips';
import { useAuth } from '@/providers/auth.provider';
import { getCachedOfflineTrips, type CachedOfflineTrip } from '@/services/offlineTrip.storage';

// --- HELPERY DO DAT ---
// Zakładamy, że startDate przychodzi z bazy jako ISO string, np. "2024-06-12T00:00:00.000Z" lub "2024-06-12"
function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

const getTripStartTime = (trip: any) => {
  const parsed = new Date(`${trip.startDate || trip.start_date || ''}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const sortTripsByNearestDate = <T extends { trip: any }>(items: T[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  return [...items].sort((a, b) => {
    const aStart = getTripStartTime(a.trip);
    const bStart = getTripStartTime(b.trip);

    if (aStart === null && bStart === null) {
      return 0;
    }

    if (aStart === null) return 1;
    if (bStart === null) return -1;

    const aUpcoming = aStart >= todayTime;
    const bUpcoming = bStart >= todayTime;

    if (aUpcoming && bUpcoming) return aStart - bStart;
    if (!aUpcoming && !bUpcoming) return bStart - aStart;
    return aUpcoming ? -1 : 1;
  });
};


export default function Home() {
 const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();

  const { isOffline } = useNetwork();
  const { hasUnreadNotifications } = useNotifications();
  const { trips, setTripPlan, setTripAccessRole } = useTripStore();
  
  const { session } = useAuth(); 
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [cachedOfflineTrips, setCachedOfflineTrips] = useState<CachedOfflineTrip[]>([]);
  const [dynamicTravelCost, setDynamicTravelCost] = useState(0);
  


  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 20;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadOfflineTrips = async () => {
      if (!userId) {
        setCachedOfflineTrips([]);
        return;
      }

      const cached = await getCachedOfflineTrips(userId);
      if (isMounted) {
        setCachedOfflineTrips(sortTripsByNearestDate(cached));
      }
    };

    if (isOffline) {
      void loadOfflineTrips();
    }

    return () => {
      isMounted = false;
    };
  }, [isOffline, userId]);

  const homeTrips = useMemo(
    () => (isOffline ? cachedOfflineTrips.map((item) => item.trip) : trips),
    [cachedOfflineTrips, isOffline, trips]
  );

  // --- LOGIKA WYLICZANIA NAJBLIŻSZEJ WYCIECZKI (Bazuje na TripDto) ---
  const { upcomingTrip, daysLeft, isOngoing, isPast } = useMemo(() => {
    if (!homeTrips || homeTrips.length === 0) return { upcomingTrip: null, daysLeft: 0, isOngoing: false, isPast: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sortowanie wycieczek od najbliższej po polu startDate
    const sortedTrips = [...homeTrips].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aDate - bDate;
    });

    // Znajdź pierwszą, której endDate jest dzisiaj lub w przyszłości
    let closest = sortedTrips.find(t => {
      if (!t.endDate) return false;
      const endDate = new Date(t.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today;
    });

    let isPast = false;
    if (!closest) {
      closest = sortedTrips[sortedTrips.length - 1]; // Pokazuje ostatnią, jeśli nie ma planów na przyszłość
      isPast = true;
    }

    let daysLeft = 0;
    let isOngoing = false;

    if (closest?.startDate && closest?.endDate) {
      const startDate = new Date(closest.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(closest.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = startDate.getTime() - today.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (today >= startDate && today <= endDate) {
        isOngoing = true;
        daysLeft = 0;
      }
    }

    return { upcomingTrip: closest, daysLeft, isOngoing, isPast };
  }, [homeTrips]);

  const offlineUpcomingCache = useMemo(
    () => (isOffline && upcomingTrip ? cachedOfflineTrips.find((item) => item.trip.id === upcomingTrip.id) : null),
    [cachedOfflineTrips, isOffline, upcomingTrip]
  );

  useEffect(() => {
    setDynamicTravelCost(0);
  }, [upcomingTrip?.id]);

  // --- PRZYGOTOWANIE ZMIENNYCH DLA WIDOKU ---
  const heroImage = upcomingTrip?.imageUrl || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop';
  const startDateText = formatShortDate(upcomingTrip?.startDate);
  const endDateText = formatShortDate(upcomingTrip?.endDate);
  
  // Bezpośrednie czytanie budżetu z TripDto
  const budget = upcomingTrip?.totalBudget || 0;
  const spent = (upcomingTrip?.totalCost || 0) + dynamicTravelCost;
  const progressPercent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOverBudget = spent > budget;

  const handleOpenUpcomingTrip = async () => {
    if (!upcomingTrip) return;

    try {
      setIsLoadingTrip(true);

      const scheduleDays = isOffline
        ? offlineUpcomingCache?.scheduleDays || []
        : session?.access_token
          ? (await getTripSchedule(session.access_token, upcomingTrip.id)).days || []
          : [];

      const mappedPlan: TripPlan = {
        id: upcomingTrip.id,
        destination: upcomingTrip.destination,
        summary: upcomingTrip.notes || '',
        totalDays: scheduleDays.length || 0, 
        estimatedTotalCost: upcomingTrip.totalBudget || 0,
        currency: 'PLN',
        
        // Prawidłowe mapowanie danych z API do lokalnego TripStore
        days: mapScheduleDaysToPlanDays(scheduleDays),
        
        generalTips: [],
        bestTransport: '',
        imageUrl: upcomingTrip.imageUrl || undefined
      };

      setTripPlan(mappedPlan);
      setTripAccessRole(upcomingTrip.accessRole);
      router.push('/(main)/trip-details');

    } catch (error) {
        console.error("Błąd pobierania szczegółów planu:", error);
      // Jeśli API rzuci błąd, aplikacja zatrzyma się tutaj i NIE przeniesie Cię do pustego planu.
    } finally {
      setIsLoadingTrip(false);
    }
  };

  const [todayActivities, setTodayActivities] = useState<TripScheduleActivityDto[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesDayLabel, setActivitiesDayLabel] = useState('Harmonogram dnia');

  useEffect(() => {
    let isMounted = true;

    const fetchTodaySchedule = async () => {
      if (!upcomingTrip) {
        setTodayActivities([]);
        return;
      }

      try {
        setIsLoadingActivities(true);
        const scheduleDays = isOffline
          ? offlineUpcomingCache?.scheduleDays || []
          : session?.access_token
            ? (await getTripSchedule(session.access_token, upcomingTrip.id)).days || []
            : [];
        if (!isMounted) return;

        const { day: displayDay, label } = resolveHomeScheduleDay(scheduleDays, { isOngoing, isPast });
        setTodayActivities(displayDay?.activities || []);
        setActivitiesDayLabel(label);

      } catch (error) {
        console.error("Błąd pobierania harmonogramu w tle:", error);
      } finally {
        if (isMounted) setIsLoadingActivities(false);
      }
    };

    fetchTodaySchedule();

    return () => { isMounted = false; };
  }, [isOffline, offlineUpcomingCache, upcomingTrip?.id, session?.access_token, isPast, isOngoing]);
  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <ScreenHeader
          variant="dashboard"
          userInitials={userInitials}
          onSearchFocus={() => router.push('/(main)/create')}
          onNotificationPress={() => router.push('/notifications')}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
          hasUnreadNotifications={hasUnreadNotifications}
        />

        {/* --- NACHODZĄCA KARTA (LUB PUSTY STAN) --- */}
        <View style={[styles.heroSection]}>
          {!upcomingTrip ? (
            <TouchableOpacity 
              activeOpacity={isOffline ? 1 : 0.9}
              disabled={isOffline}
              accessibilityState={{ disabled: isOffline }}
              onPress={() => {
                router.push('/(main)/create');
              }}
              style={[styles.heroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }]}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="airplane" size={32} color={Colors.brand.blue} />
              </View>
              <Text style={{ color: currentColors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                {isOffline ? 'Brak zapisanej wycieczki offline' : 'Brak nadchodzących planów'}
              </Text>
              <Text style={{ color: currentColors.subtext, fontSize: 13, textAlign: 'center' }}>
                {isOffline ? 'Połącz się z internetem, aby pobrać plan do pamięci.' : 'Kliknij tutaj, aby utworzyć nową podróż'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={handleOpenUpcomingTrip}
              style={[styles.heroCard, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}
            >
              <Image source={{ uri: heroImage }} style={styles.heroImage} />
              <View style={styles.heroOverlay} />
              
              <View style={[styles.daysBadge, isPast && { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                {!isPast && <View style={[styles.pulseDot, isOngoing && { backgroundColor: '#FF3B30' }]} />}
                <Text style={styles.daysBadgeText}>
                  {isOngoing ? 'W trakcie' : isPast ? 'Zakończona' : `Za ${daysLeft} dni`}
                </Text>
              </View>

              <View style={styles.heroBottom}>
                <View style={styles.heroSubtitleRow}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.heroSubtitle}>
                    {isOngoing ? 'Aktualna podróż' : isPast ? 'Ostatnia podróż' : 'Nadchodząca podróż'}
                  </Text>
                </View>
                <View style={styles.heroMainRow}>
                  <View>
                    <Text style={styles.heroDestination}>{upcomingTrip.destination}</Text>
                    <Text style={styles.heroDates}>
                      {startDateText} – {endDateText} · {upcomingTrip.participantsCount} os.
                    </Text>
                  </View>
                  <View style={styles.heroArrow}>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* --- SEKCJA BUDŻETU --- */}
        {upcomingTrip && !isOffline && (
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.row}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.brand.blue} />
                  <Text style={[styles.cardTitle, { color: currentColors.text }]}>Szacowane koszty</Text>
                </View>
                <Text style={[styles.cardSubValue, { color: currentColors.subtext }]}>
                  {formatPlnAmount(spent)} / {formatPlnAmount(budget)} PLN
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: currentColors.border }]}>
                <LinearGradient 
                  colors={isOverBudget ? ['#FF3B30', '#FF453A'] : [Colors.brand.blue, '#7C3AED']} 
                  start={{x:0, y:0}} end={{x:1, y:0}}
                  style={[styles.progressBar, { width: `${progressPercent}%` }]} 
                />
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.statusOk, isOverBudget && { color: '#FF3B30' }]}>
                  {isOverBudget ? '⚠️ Przekroczony' : '✓ W normie'}
                </Text>
                <Text style={[styles.remainingText, { color: currentColors.subtext }]}>
                  {isOverBudget
                    ? `Przekroczono o: ${formatPlnAmount(spent - budget)} PLN`
                    : `Zostało: ${formatPlnAmount(budget - spent)} PLN`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* --- SZYBKIE AKCJE --- */}
        {!isOffline && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>Szybkie akcje</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionButton icon="airplane-outline" label="Nowy plan" color={Colors.brand.blue} bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push('/(main)/create')} />
              <QuickActionButton icon="bulb-outline" label="Inspiracje" color="#F59E0B" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push('/(main)/inspiration')} />
              <QuickActionButton icon="map-outline" label="Wszystkie" color="#10B981" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push('/(main)/trips')} />
              <QuickActionButton icon="people-outline" label="Zaproś" color="#8B5CF6" bg={currentColors.card} border={currentColors.border} textColor={currentColors.text} onPress={() => router.push({ pathname: '/(main)/profile', params: { panel: 'friends' } })} />
            </View>
          </View>
        )}

        {/* --- HARMONOGRAM / AKTYWNOŚCI --- */}
        {upcomingTrip && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: currentColors.text, marginBottom: 0 }]}>
                {activitiesDayLabel}
              </Text>
              <TouchableOpacity onPress={handleOpenUpcomingTrip} disabled={isLoadingTrip}>
                {isLoadingTrip ? (
                  <ActivityIndicator size="small" color={Colors.brand.blue} />
                ) : (
                  <Text style={styles.seeAllText}>Cały plan</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Jeśli ładujemy aktywności w tle */}
            {isLoadingActivities ? (
              <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1, alignItems: 'center', paddingVertical: 32 }]}>
                <ActivityIndicator size="large" color={Colors.brand.blue} style={{ marginBottom: 12 }} />
                <Text style={{ color: currentColors.subtext, fontSize: 13 }}>Wczytywanie harmonogramu...</Text>
              </View>
            ) : todayActivities.length > 0 ? (
              /* Lista aktywności */
              <View style={styles.scheduleList}>
                {todayActivities.map((act, index) => {
                  const categoryIcon = getCategoryIcon(act.category || 'inne');

                  return (
                    <View key={act.id || `home-act-${index}`} style={[styles.scheduleItem, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 }]}>
                      <View style={[styles.scheduleIcon, { backgroundColor: currentColors.background }]}>
                        <Ionicons name={categoryIcon} size={20} color={Colors.brand.blue} />
                      </View>
                      <View style={styles.scheduleInfo}>
                        <Text style={[styles.scheduleName, { color: currentColors.text }]} numberOfLines={1}>{act.name}</Text>
                        <Text style={[styles.scheduleTime, { color: currentColors.subtext }]}>
                          {formatActivityTimeRange(act.time, act.durationMinutes)}
                        </Text>
                        {act.cost > 0 ? <ActivityCostBadge cost={act.cost} style={{ marginTop: 4 }} /> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Stan pusty (gdy wycieczka nie ma żadnych aktywności) */
              <View style={[styles.card, { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1, alignItems: 'center', paddingVertical: 24 }]}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="time-outline" size={24} color={Colors.brand.blue} />
                </View>
                <Text style={{ color: currentColors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Brak aktywności</Text>
                <Text style={{ color: currentColors.subtext, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                  Wygląda na to, że ten dzień jest jeszcze nie zaplanowany.
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function QuickActionButton({ icon, label, color, bg, border, textColor, onPress }: any) {
  return (
    <TouchableOpacity style={styles.qaButton} onPress={onPress}>
      <View style={[styles.qaIconBox, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}
