import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ScreenHeader from '@/components/ScreenHeader';
import TripScheduleSection from '@/components/TripScheduleSection';
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile';
import { useAuth } from '@/providers/auth.provider';
import { useNetwork } from '@/providers/network.provider';
import { Colors } from '@/styles/colors';
import { styles } from '@/styles/trips.styles';
import { useNotifications } from '@/providers/notifications.provider';
import { getMyFriends } from '@/services/friends.api';
import {
  addTripParticipant,
  createTripScheduleActivity,
  deleteTripScheduleActivity,
  getMyTrips,
  getTripParticipants,
  getTripSchedule,
  removeTripParticipant,
  updateTripScheduleActivity,
} from '@/services/trips.api';
import { getCachedOfflineTrips, removeCachedOfflineTrip, saveCachedOfflineTrip } from '@/services/offlineTrip.storage';
import { useTripStore, TripPlan } from '@/stores/tripStore';
import type { FriendProfile } from '@/types/friends';
import type { TripDto, TripParticipantDto, TripScheduleDayDto } from '@/types/trips';
import { formatPlnAmount } from '@/components/ActivityCostBadge';
import { parseActivityCoordinates, type ActivityCoordinates } from '@/utils/activityMap';
import {
  computeFastestOriginToFirstActivityLeg,
  computeLastActivityToOriginLeg,
  haversineDistanceKm,
} from '@/utils/scheduleTransit';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=900',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=900',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=900',
];

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: 'W planach', color: '#F59E0B' },
  active: { label: 'Aktywna', color: Colors.brand.green },
  finished: { label: 'Zakończona', color: '#8B90A7' },
  completed: { label: 'Zakończona', color: '#8B90A7' },
};

type TripListFilter = 'all' | 'owner' | 'participant';
type TripModalTab = 'details' | 'participants';

const tripListFilters: {
  key: TripListFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'Wszystkie', icon: 'albums-outline' },
  { key: 'owner', label: 'Moje', icon: 'shield-checkmark-outline' },
  { key: 'participant', label: 'Wspólne', icon: 'people-outline' },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
};

const getTripDescription = (notes?: string | null) => {
  if (!notes) return '';
  try {
    const parsed = JSON.parse(notes);
    return parsed.summary || '';
  } catch {
    return notes;
  }
};

const parseStoredTripPlan = (rawPlan: unknown) => {
  if (!rawPlan) return {};
  if (typeof rawPlan !== 'string') return rawPlan;

  const trimmed = rawPlan.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
};

const formatTripDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('pl-PL', { month: 'short' }).replace('.', '');
  return `${day} ${month}`;
};

const formatTripRange = (trip: TripDto) => {
  const start = formatTripDate(trip.startDate || (trip as any).start_date);
  const end = formatTripDate(trip.endDate || (trip as any).end_date);
  if (!start && !end) return 'Brak daty';
  if (start === end) return start;
  return `${start} - ${end}`;
};

const getTripDays = (trip: TripDto) => {
  const start = new Date(`${trip.startDate || (trip as any).start_date}T00:00:00`);
  const end = new Date(`${trip.endDate || (trip as any).end_date}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(diff, 1);
};

const formatDaysLabel = (days: number | null) => {
  if (!days) return 'Nie ustalono';
  if (days === 1) return '1 dzień';
  return `${days} dni`;
};

const formatBudget = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Brak kosztu';
  return `${formatPlnAmount(Number(value))} PLN`;
};

const getTripDisplayCost = (trip: TripDto) => trip.totalCost ?? trip.totalBudget;

const getDisplayedTripCost = (trip: TripDto, dynamicTravelCost = 0) => {
  const baseCost = getTripDisplayCost(trip);
  if (baseCost === null || baseCost === undefined) return dynamicTravelCost > 0 ? dynamicTravelCost : baseCost;
  return Number(baseCost) + dynamicTravelCost;
};

const formatParticipantCost = (value: number | null | undefined, currency = 'PLN') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Brak naliczonego kosztu';
  }
  return `${formatPlnAmount(Number(value))} ${currency}`;
};

const getStatusMeta = (status: string) => statusLabels[status] || { label: status || 'Plan', color: Colors.brand.blue };

const getFirstScheduleActivity = (days: TripScheduleDayDto[]) => {
  for (const day of days) {
    const activity = day.activities?.[0];
    if (activity) return activity;
  }
  return null;
};

const getLastScheduleActivity = (days: TripScheduleDayDto[]) => {
  for (let dayIndex = days.length - 1; dayIndex >= 0; dayIndex -= 1) {
    const activities = days[dayIndex]?.activities || [];
    const activity = activities[activities.length - 1];
    if (activity) return activity;
  }
  return null;
};

const getScheduleActivityCoords = (activity: ReturnType<typeof getFirstScheduleActivity>) =>
  parseActivityCoordinates(activity?.coordinates);

const estimateDynamicTravelCost = (user: ActivityCoordinates, days: TripScheduleDayDto[]) => {
  const first = getFirstScheduleActivity(days);
  const last = getLastScheduleActivity(days);
  const firstCoords = getScheduleActivityCoords(first);
  const lastCoords = getScheduleActivityCoords(last);

  const firstLeg = first && firstCoords
    ? computeFastestOriginToFirstActivityLeg(
        haversineDistanceKm(user.latitude, user.longitude, firstCoords.latitude, firstCoords.longitude),
        {
          name: first.name,
          location: first.location,
          time: first.time,
          durationMinutes: first.durationMinutes,
          category: first.category,
        }
      )
    : null;

  const returnLeg = last && lastCoords
    ? computeLastActivityToOriginLeg(
        haversineDistanceKm(user.latitude, user.longitude, lastCoords.latitude, lastCoords.longitude),
        {
          name: last.name,
          location: last.location,
          time: last.time,
          durationMinutes: last.durationMinutes,
          category: last.category,
        }
      )
    : null;

  return (Number(firstLeg?.cost) || 0) + (Number(returnLeg?.cost) || 0);
};

const getTripImage = (trip: TripDto | any, index: number) => {
  const url = trip.imageUrl || trip.image_url;
  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url;
  }
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
};

const getTripStartTime = (trip: TripDto) => {
  const parsed = new Date(`${trip.startDate || (trip as any).start_date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripEndTime = (trip: TripDto) => {
  const parsed = new Date(`${trip.endDate || (trip as any).end_date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTodayTime = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

const getTripDateState = (trip: TripDto) => {
  const startTime = getTripStartTime(trip);
  const endTime = getTripEndTime(trip);
  const todayTime = getTodayTime();

  if (startTime !== null && endTime !== null && startTime <= todayTime && endTime >= todayTime) {
    return 'ongoing';
  }

  if (startTime !== null && startTime > todayTime) {
    return 'upcoming';
  }

  if (endTime !== null && endTime < todayTime) {
    return 'past';
  }

  return 'unknown';
};

const getTripStatusMeta = (trip: TripDto) => {
  const dateState = getTripDateState(trip);

  if (dateState === 'ongoing') {
    return { label: 'W trakcie', color: Colors.brand.green };
  }

  if (dateState === 'past') {
    return statusLabels.finished;
  }

  return getStatusMeta(trip.status);
};

import { mapScheduleDaysToPlanDays } from '@/utils/mapScheduleToPlan';

const sortTripsByNearestDate = (trips: TripDto[]) => {
  const todayTime = getTodayTime();
  const rank = (trip: TripDto) => {
    const state = getTripDateState(trip);
    if (state === 'ongoing') return 0;
    if (state === 'upcoming') return 1;
    if (state === 'past') return 2;
    return 3;
  };

  return [...trips].sort((a, b) => {
    const aStart = getTripStartTime(a);
    const bStart = getTripStartTime(b);
    const aRank = rank(a);
    const bRank = rank(b);

    if (aRank !== bRank) return aRank - bRank;

    if (aStart === null && bStart === null) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
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

const getNearestTripForOffline = (trips: TripDto[]) => {
  const todayTime = getTodayTime();

  const activeOrUpcoming = trips
    .filter((trip) => {
      const endTime = getTripEndTime(trip);
      const startTime = getTripStartTime(trip);
      return (endTime !== null && endTime >= todayTime) || (startTime !== null && startTime >= todayTime);
    });

  if (activeOrUpcoming.length > 0) {
    return sortTripsByNearestDate(activeOrUpcoming)[0];
  }

  return sortTripsByNearestDate(trips)[0] ?? null;
};

const getFriendSubtitle = (friend: FriendProfile) => {
  const name = `${friend.firstName || ''} ${friend.lastName || ''}`.trim();
  return name ? 'Znajomy w WhereWeGoing' : 'Profil bez uzupełnionych danych';
};

const ProfileAvatar = ({ uri, label, size = 40, color = Colors.brand.blue }: any) => {
  const isImageValid = typeof uri === 'string' && uri.startsWith('http');
  if (isImageValid) {
    return (
      <Image 
        source={{ uri }} 
        style={{ width: size, height: size, borderRadius: size / 2 }} 
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={styles.avatarFallbackText}>
        {getInitials(label || '?')}
      </Text>
    </View>
  );
};

export default function Trips() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const openedTripIdRef = useRef<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const currentColors = Colors[colorScheme];
  
  const { session } = useAuth();
  const { isOffline } = useNetwork();
  const { userAvatarUrl, userInitials } = useCurrentUserProfile();

  const [trips, setTrips] = useState<TripDto[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsRefreshing, setTripsRefreshing] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  const [modalTab, setModalTab] = useState<TripModalTab>('details');
  const [participants, setParticipants] = useState<TripParticipantDto[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [actionProfileId, setActionProfileId] = useState<string | null>(null);
  const [tripListFilter, setTripListFilter] = useState<TripListFilter>('all');
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<TripScheduleDayDto[]>([]);
  const [selectedTripDynamicTravelCost, setSelectedTripDynamicTravelCost] = useState(0);
  const [tripDynamicTravelCosts, setTripDynamicTravelCosts] = useState<Record<string, number>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [cachedOfflineTripIds, setCachedOfflineTripIds] = useState<Set<string>>(new Set());
  const [offlineCacheDirty, setOfflineCacheDirty] = useState(false);

  const getPeopleLabel = (count: number) => {
    if (count === 1) return '1 osoba';
    const lastDigit = count % 10;
    const isTeen = count % 100 >= 11 && count % 100 <= 14;
    if (lastDigit >= 2 && lastDigit <= 4 && !isTeen) {
      return `${count} osoby`;
    }
    return `${count} osób`;
  };

  const accessToken = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const bottomPadding = 65 + (insets.bottom > 0 ? insets.bottom : 10) + 24;
  const selectedTripIsSavedOffline = Boolean(
    selectedTrip && cachedOfflineTripIds.has(selectedTrip.id) && !offlineCacheDirty
  );
  const selectedTripIsNearestOffline = Boolean(
    selectedTrip && getNearestTripForOffline(trips)?.id === selectedTrip.id
  );
  const selectedTripCanBeRemovedFromOffline = selectedTripIsSavedOffline && !selectedTripIsNearestOffline;

  useEffect(() => {
    let cancelled = false;

    const loadDynamicTravelCost = async () => {
      setSelectedTripDynamicTravelCost(0);
      if (!selectedTrip || scheduleDays.length === 0 || isOffline) return;

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const cost = estimateDynamicTravelCost(userCoords, scheduleDays);
        if (!cancelled) {
          setSelectedTripDynamicTravelCost(Math.round(cost * 100) / 100);
        }
      } catch {
        if (!cancelled) {
          setSelectedTripDynamicTravelCost(0);
        }
      }
    };

    void loadDynamicTravelCost();

    return () => {
      cancelled = true;
    };
  }, [isOffline, scheduleDays, selectedTrip]);

  useEffect(() => {
    let isMounted = true;

    const loadCachedTripInfo = async () => {
      if (!userId) {
        setCachedOfflineTripIds(new Set());
        return;
      }

      const cached = await getCachedOfflineTrips(userId);

      if (isMounted) {
        setCachedOfflineTripIds(new Set(cached.map((item) => item.trip.id)));
      }
    };

    void loadCachedTripInfo();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const cacheNearestTripForOffline = useCallback(
    async (availableTrips: TripDto[]) => {
      if (!accessToken || !userId || availableTrips.length === 0) {
        return;
      }

      const nearestTrip = getNearestTripForOffline(availableTrips);

      if (!nearestTrip) {
        return;
      }

      try {
        const [participantsResponse, scheduleResponse] = await Promise.all([
          getTripParticipants(accessToken, nearestTrip.id),
          getTripSchedule(accessToken, nearestTrip.id),
        ]);

        await saveCachedOfflineTrip(userId, {
          trip: {
            ...nearestTrip,
            participantsCount: participantsResponse.count,
            totalCost: scheduleResponse.totalCost ?? nearestTrip.totalCost,
          },
          participants: participantsResponse.participants,
          scheduleDays: scheduleResponse.days,
          cachedAt: new Date().toISOString(),
        });
        setCachedOfflineTripIds((current) => new Set([...current, nearestTrip.id]));
      } catch (error) {
        console.warn('Nie udało się zapisać wycieczki offline:', error);
      }
    },
    [accessToken, userId]
  );

  const loadTrips = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!accessToken || !userId) {
        setTrips([]);
        setTripsLoading(false);
        return;
      }

      if (isOffline) {
        try {
          if (mode === 'refresh') setTripsRefreshing(true);
          else setTripsLoading(true);

          const cached = await getCachedOfflineTrips(userId);

          if (cached.length > 0) {
            setTrips(sortTripsByNearestDate(cached.map((item) => item.trip)));
            setCachedOfflineTripIds(new Set(cached.map((item) => item.trip.id)));
            setTripsError(null);
          } else {
            setTrips([]);
            setTripsError('Brak zapisanej wycieczki offline. Połącz się z internetem, aby pobrać swoje plany.');
          }
        } finally {
          setTripsLoading(false);
          setTripsRefreshing(false);
        }
        return;
      }

      try {
        if (mode === 'refresh') setTripsRefreshing(true);
        else setTripsLoading(true);

        setTripsError(null);
        const response = await getMyTrips(accessToken);
        const loadedTrips = response.trips || response || [];
        setTrips(sortTripsByNearestDate(loadedTrips));
        void cacheNearestTripForOffline(loadedTrips);
      } catch (error) {
        const cached = await getCachedOfflineTrips(userId);

        if (cached.length > 0) {
          setTrips(sortTripsByNearestDate(cached.map((item) => item.trip)));
          setCachedOfflineTripIds(new Set(cached.map((item) => item.trip.id)));
          setTripsError(null);
        } else {
          setTripsError(error instanceof Error ? error.message : 'Nie udało się pobrać wycieczek');
        }
      } finally {
        setTripsLoading(false);
        setTripsRefreshing(false);
      }
    },
    [accessToken, cacheNearestTripForOffline, isOffline, userId]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const loadPanelData = useCallback(
    async (trip: TripDto) => {
      if (!accessToken || !userId) return;

      if (isOffline) {
        const cachedTrips = await getCachedOfflineTrips(userId);
        const cached = cachedTrips.find((item) => item.trip.id === trip.id);

        if (cached?.trip.id === trip.id) {
          setParticipants(cached.participants);
          setScheduleDays(cached.scheduleDays);
          setSelectedTrip((current) =>
            current?.id === trip.id
              ? {
                  ...current,
                  participantsCount: cached.participants.length || current.participantsCount,
                  totalCost: cached.trip.totalCost ?? current.totalCost,
                }
              : current
          );
        }

        setFriends([]);
        setParticipantsLoading(false);
        setFriendsLoading(false);
        setScheduleLoading(false);
        return;
      }

      try {
        setParticipantsLoading(true);
        setFriendsLoading(trip.accessRole === 'owner');

        const participantsResponse = await getTripParticipants(accessToken, trip.id);
        setParticipants(participantsResponse.participants);
        setSelectedTrip((current) => current?.id === trip.id ? { ...current, participantsCount: participantsResponse.count } : current);

        if (trip.accessRole === 'owner') {
          const friendsResponse = await getMyFriends(accessToken);
          setFriends(friendsResponse.friends);
        } else {
          setFriends([]);
        }

        setScheduleLoading(true);
        const scheduleResponse = await getTripSchedule(accessToken, trip.id);
        setScheduleDays(scheduleResponse.days);

        if (getNearestTripForOffline(trips)?.id === trip.id) {
          await saveCachedOfflineTrip(userId, {
            trip: {
              ...trip,
              participantsCount: participantsResponse.count,
              totalCost: scheduleResponse.totalCost ?? trip.totalCost,
            },
            participants: participantsResponse.participants,
            scheduleDays: scheduleResponse.days,
          cachedAt: new Date().toISOString(),
        });
          setCachedOfflineTripIds((current) => new Set([...current, trip.id]));
        }
      } catch (error) {
        Alert.alert('Nie udało się pobrać danych', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setParticipantsLoading(false);
        setFriendsLoading(false);
        setScheduleLoading(false);
      }
    },
    [accessToken, isOffline, trips, userId]
  );

  const openTripPanel = useCallback(
    async (trip: TripDto, tab: TripModalTab = 'details') => {
      setSelectedTrip(trip);
      setModalTab(tab);
      setParticipants([]);
      setFriends([]);
      setScheduleDays([]);
      setSelectedTripDynamicTravelCost(0);
      setScheduleExpanded(false);
      setOfflineCacheDirty(false);
      await loadPanelData(trip);
    },
    [loadPanelData]
  );
  useEffect(() => {
    const tripId = typeof params.tripId === 'string' ? params.tripId : null;

    if (!tripId || tripsLoading || openedTripIdRef.current === tripId) {
      return;
    }

    const tripToOpen = trips.find((trip) => trip.id === tripId);

    if (!tripToOpen) {
      return;
    }

    openedTripIdRef.current = tripId;
    void openTripPanel(tripToOpen, 'details');
  }, [openTripPanel, params.tripId, trips, tripsLoading]);

  const closeTripPanel = useCallback(() => {
    setSelectedTrip(null);
    setModalTab('details');
    setParticipants([]);
    setFriends([]);
    setScheduleDays([]);
    setSelectedTripDynamicTravelCost(0);
    setScheduleExpanded(false);
    setActionProfileId(null);
    setOfflineCacheDirty(false);
  }, []);

  const removedTripId = useTripStore((state) => state.removedTripId);

  useEffect(() => {
    if (!removedTripId) return;

    setTrips((current) => current.filter((trip) => trip.id !== removedTripId));
    setSelectedTrip((current) => {
      if (current?.id === removedTripId) {
        closeTripPanel();
        return null;
      }
      return current;
    });
    useTripStore.getState().setTrips(
      useTripStore.getState().trips.filter((trip) => trip.id !== removedTripId)
    );
    useTripStore.getState().clearRemovedTripNotification();
  }, [removedTripId, closeTripPanel]);

  const handleSaveSelectedTripOffline = useCallback(async () => {
    if (!selectedTrip || !userId) {
      return;
    }

    try {
      setOfflineSaving(true);

      if (!isOffline && accessToken) {
        const [participantsResponse, scheduleResponse] = await Promise.all([
          getTripParticipants(accessToken, selectedTrip.id),
          getTripSchedule(accessToken, selectedTrip.id),
        ]);

        const tripToCache = {
          ...selectedTrip,
          participantsCount: participantsResponse.count,
          totalCost: scheduleResponse.totalCost ?? selectedTrip.totalCost,
        };

        await saveCachedOfflineTrip(userId, {
          trip: tripToCache,
          participants: participantsResponse.participants,
          scheduleDays: scheduleResponse.days,
          cachedAt: new Date().toISOString(),
        });

        setParticipants(participantsResponse.participants);
        setScheduleDays(scheduleResponse.days);
        setSelectedTrip(tripToCache);
      } else {
        await saveCachedOfflineTrip(userId, {
          trip: selectedTrip,
          participants,
          scheduleDays,
          cachedAt: new Date().toISOString(),
        });
      }

      setCachedOfflineTripIds((current) => new Set([...current, selectedTrip.id]));
      setOfflineCacheDirty(false);
      Alert.alert('Zapisano offline', 'Ta wycieczka będzie dostępna bez internetu.');
    } catch (error) {
      Alert.alert(
        'Nie udało się zapisać offline',
        error instanceof Error ? error.message : 'Spróbuj ponownie, gdy będziesz online.'
      );
    } finally {
      setOfflineSaving(false);
    }
  }, [accessToken, isOffline, participants, scheduleDays, selectedTrip, userId]);

  const handleRemoveSelectedTripOffline = useCallback(async () => {
    if (!selectedTrip || !userId || selectedTripIsNearestOffline) {
      return;
    }

    try {
      const nextCachedTrips = await removeCachedOfflineTrip(userId, selectedTrip.id);
      setCachedOfflineTripIds(new Set(nextCachedTrips.map((item) => item.trip.id)));
      setOfflineCacheDirty(false);

      if (isOffline) {
        setTrips((current) => current.filter((trip) => trip.id !== selectedTrip.id));
        closeTripPanel();
      }

      Alert.alert('Usunięto zapis offline', 'Ta wycieczka nie będzie już dostępna bez internetu.');
    } catch (error) {
      Alert.alert(
        'Nie udało się usunąć zapisu',
        error instanceof Error ? error.message : 'Spróbuj ponownie.'
      );
    }
  }, [closeTripPanel, isOffline, selectedTrip, selectedTripIsNearestOffline, userId]);

  const handleTripPress = useCallback(async (trip: any) => {
    const rawPlan = trip.notes || trip.plan || trip.itinerary || trip.data || {};
    const parsedData: any = parseStoredTripPlan(rawPlan);

    let planDays = Array.isArray(parsedData?.days) ? parsedData.days : [];
    const declaredBudget = trip.totalBudget ?? trip.total_budget ?? parsedData?.estimatedTotalCost ?? 0;

    if (accessToken) {
      try {
        const scheduleResponse = await getTripSchedule(accessToken, trip.id);
        if (scheduleResponse.days?.length) {
          planDays = mapScheduleDaysToPlanDays(scheduleResponse.days);
        }
      } catch (error) {
        console.error('❌ BŁĄD POBIERANIA HARMONOGRAMU:', error);
      }
    }

    const activePlan: TripPlan = {
      id: trip.id,
      destination: trip.destination || "Nieznane miejsce",
      summary: parsedData?.summary || getTripDescription(trip.notes) || "Brak opisu",
      totalDays: planDays.length,
      estimatedTotalCost: declaredBudget,
      currency: parsedData?.currency || "PLN",
      days: planDays,
      generalTips: Array.isArray(parsedData?.generalTips) ? parsedData.generalTips : [],
      bestTransport: parsedData?.bestTransport || "Brak danych",
      imageUrl: trip.imageUrl || trip.image_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000'
    };

    useTripStore.getState().setTripPlan(activePlan);
    useTripStore.getState().setSavedTripId(trip.id);
    useTripStore.getState().setTripAccessRole(trip.accessRole);
    router.push('../trip-details');
  }, [accessToken, router]);

  const participantIds = useMemo(
    () => new Set(participants.map((participant) => participant.profileId)),
    [participants]
  );

  const availableFriends = useMemo(
    () => friends.filter((friend) => !participantIds.has(friend.id)),
    [friends, participantIds]
  );

  const ownedTripsCount = useMemo(
    () => trips.filter((trip) => trip.accessRole === 'owner').length,
    [trips]
  );

  const sharedTripsCount = useMemo(
    () => trips.filter((trip) => trip.accessRole === 'participant').length,
    [trips]
  );

  const visibleTrips = useMemo(() => {
    const filteredTrips = tripListFilter === 'owner'
      ? trips.filter((trip) => trip.accessRole === 'owner')
      : tripListFilter === 'participant'
        ? trips.filter((trip) => trip.accessRole === 'participant')
        : trips;

    return sortTripsByNearestDate(filteredTrips);
  }, [tripListFilter, trips]);

  useEffect(() => {
    let cancelled = false;

    const loadCardTravelCosts = async () => {
      if (!accessToken || isOffline || visibleTrips.length === 0) {
        setTripDynamicTravelCosts({});
        return;
      }

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setTripDynamicTravelCosts({});
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const entries = await Promise.all(
          visibleTrips.map(async (trip) => {
            try {
              const schedule = await getTripSchedule(accessToken, trip.id);
              const cost = estimateDynamicTravelCost(userCoords, schedule.days || []);
              return [trip.id, Math.round(cost * 100) / 100] as const;
            } catch {
              return [trip.id, 0] as const;
            }
          })
        );

        if (!cancelled) {
          setTripDynamicTravelCosts(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) {
          setTripDynamicTravelCosts({});
        }
      }
    };

    void loadCardTravelCosts();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isOffline, visibleTrips]);

  const selectedTripIndex = useMemo(() => {
    if (!selectedTrip) return 0;
    const index = trips.findIndex((trip) => trip.id === selectedTrip.id);
    return index >= 0 ? index : 0;
  }, [selectedTrip, trips]);

  const selectedTripDays = selectedTrip ? getTripDays(selectedTrip) : null;
  const selectedStatusMeta = selectedTrip ? getTripStatusMeta(selectedTrip) : null;
  const selectedTripDisplayedCost = selectedTrip
    ? getDisplayedTripCost(selectedTrip, selectedTripDynamicTravelCost)
    : null;
  const selectedTripDisplayedAmountPerPerson =
    selectedTripDisplayedCost !== null && selectedTripDisplayedCost !== undefined && participants.length > 0
      ? selectedTripDisplayedCost / participants.length
      : null;
  
  const scheduleActivityCount = useMemo(
    () => scheduleDays.reduce((sum, day) => sum + day.activities.length, 0),
    [scheduleDays]
  );

  const applyScheduleMutation = useCallback(
    (response: { days: TripScheduleDayDto[]; totalCost: number | null; participants?: TripParticipantDto[] }) => {
      setScheduleDays(response.days);
      setOfflineCacheDirty(true);
      if (Array.isArray(response.participants)) {
        setParticipants(response.participants);
      }
      setSelectedTrip((current) =>
        current ? { ...current, totalCost: response.totalCost ?? current.totalCost } : current
      );
    },
    []
  );

  const handleAddScheduleActivity = useCallback(
    async (dayId: string) => {
      if (!accessToken || !selectedTrip) return;
      try {
        setScheduleSaving(true);
        const response = await createTripScheduleActivity(accessToken, selectedTrip.id, dayId, {
          name: 'Nowa aktywność',
          time: '12:00',
          description: 'Opis aktywności',
          category: 'inne',
          location: '',
          cost: 0,
        });
        applyScheduleMutation(response);
        await loadTrips('refresh');
      } catch (error) {
        Alert.alert('Nie udało się dodać punktu', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setScheduleSaving(false);
      }
    },
    [accessToken, applyScheduleMutation, loadTrips, selectedTrip]
  );

  const handleUpdateScheduleActivity = useCallback(
    async (
      activityId: string,
      payload: {
        name: string;
        time: string;
        endTime?: string;
        durationMinutes: number;
        description: string;
        category: string;
        location: string;
        cost: number;
      }
    ) => {
      if (!accessToken || !selectedTrip) return;
      try {
        setScheduleSaving(true);
        const response = await updateTripScheduleActivity(accessToken, selectedTrip.id, activityId, {
          name: payload.name,
          time: payload.time,
          durationMinutes: payload.durationMinutes,
          description: payload.description,
          category: payload.category,
          location: payload.location,
          cost: payload.cost,
        });
        applyScheduleMutation(response);
        await loadTrips('refresh');
      } catch (error) {
        Alert.alert('Nie udało się zapisać zmian', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setScheduleSaving(false);
      }
    },
    [accessToken, applyScheduleMutation, loadTrips, selectedTrip]
  );

  const handleDeleteScheduleActivity = useCallback(
    async (activityId: string) => {
      if (!accessToken || !selectedTrip) return;
      try {
        setScheduleSaving(true);
        const response = await deleteTripScheduleActivity(accessToken, selectedTrip.id, activityId);
        applyScheduleMutation(response);
        await loadTrips('refresh');
      } catch (error) {
        Alert.alert('Nie udało się usunąć punktu', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setScheduleSaving(false);
      }
    },
    [accessToken, applyScheduleMutation, loadTrips, selectedTrip]
  );

  const handleAddParticipant = useCallback(
    async (friend: FriendProfile) => {
      if (!accessToken || !selectedTrip) return;
      try {
        setActionProfileId(friend.id);
        const response = await addTripParticipant(accessToken, selectedTrip.id, friend.id);
        if (response.participants?.length) {
          setOfflineCacheDirty(true);
          setParticipants(response.participants);
          setSelectedTrip((current) => current ? { ...current, participantsCount: response.participants!.length } : current);
        } else {
          const participantsResponse = await getTripParticipants(accessToken, selectedTrip.id);
          setOfflineCacheDirty(true);
          setParticipants(participantsResponse.participants);
          setSelectedTrip((current) => current ? { ...current, participantsCount: participantsResponse.count } : current);
        }
        await loadTrips('refresh');
      } catch (error) {
        Alert.alert('Nie udało się dodać uczestnika', error instanceof Error ? error.message : 'Spróbuj ponownie.');
      } finally {
        setActionProfileId(null);
      }
    },
    [accessToken, loadTrips, selectedTrip]
  );

  const handleRemoveParticipant = useCallback(
    (participant: TripParticipantDto) => {
      if (!accessToken || !selectedTrip || participant.isOwner) return;
      Alert.alert(
        'Usunąć uczestnika?',
        `${participant.displayName} nie będzie już przypisany do tej wycieczki.`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Usuń',
            style: 'destructive',
            onPress: async () => {
              try {
                setActionProfileId(participant.profileId);
                const response = await removeTripParticipant(accessToken, selectedTrip.id, participant.profileId);
                if (response.participants?.length !== undefined) {
                  setOfflineCacheDirty(true);
                  setParticipants(response.participants);
                  setSelectedTrip((current) => current ? { ...current, participantsCount: response.participants!.length } : current);
                } else {
                  const participantsResponse = await getTripParticipants(accessToken, selectedTrip.id);
                  setOfflineCacheDirty(true);
                  setParticipants(participantsResponse.participants);
                  setSelectedTrip((current) => current ? { ...current, participantsCount: participantsResponse.count } : current);
                }
                await loadTrips('refresh');
              } catch (error) {
                Alert.alert('Nie udało się usunąć uczestnika', error instanceof Error ? error.message : 'Spróbuj ponownie.');
              } finally {
                setActionProfileId(null);
              }
            },
          },
        ]
      );
    },
    [accessToken, loadTrips, selectedTrip]
  );

  const renderTripCard = (trip: TripDto, index: number) => {
    const statusMeta = getTripStatusMeta(trip);
    const days = getTripDays(trip);
    const isOwner = trip.accessRole === 'owner';
    const displayedCost = getDisplayedTripCost(trip, tripDynamicTravelCosts[trip.id] || 0);
    return (
      <TouchableOpacity
        key={trip.id}
        activeOpacity={0.9}
        style={[styles.tripCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
        onPress={() => openTripPanel(trip, 'details')}
      >
        <Image source={{ uri: getTripImage(trip, index) }} style={styles.tripImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.74)']} style={styles.imageOverlay} />
        <View style={styles.tripImageContent}>
          <View style={styles.cardBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.color }]}> 
              <Text style={styles.statusText}>{statusMeta.label}</Text>
            </View>
            <View style={[styles.accessBadge, { backgroundColor: isOwner ? 'rgba(73,142,230,0.94)' : 'rgba(32,160,121,0.94)' }]}> 
              <Ionicons name={isOwner ? 'shield-checkmark-outline' : 'people-outline'} size={13} color="#FFFFFF" />
              <Text style={styles.accessBadgeText}>{isOwner ? 'Właściciel' : 'Uczestnik'}</Text>
            </View>
          </View>
          <View style={styles.tripImageTextBox}>
            <Text style={styles.destination} numberOfLines={2}>{trip.destination}</Text>
            <Text style={styles.tripDates}>{formatTripRange(trip)}</Text>
          </View>
        </View>

        <View style={styles.tripInfo}>
          <View style={styles.tripMetaGrid}>
            <View style={[styles.metaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="people-outline" size={16} color={Colors.brand.blue} />
              <Text style={[styles.metaPillText, { color: currentColors.text }]}>{trip.participantsCount || 1} os.</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="calendar-outline" size={16} color={Colors.brand.green} />
              <Text style={[styles.metaPillText, { color: currentColors.text }]}>{days ? `${days} dni` : 'Plan'}</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: currentColors.background }]}> 
              <Ionicons name="wallet-outline" size={16} color={Colors.brand.yellow} />
              <Text style={[styles.metaPillText, { color: currentColors.text }]}>{formatBudget(displayedCost)}</Text>
            </View>
          </View>

          <View style={styles.tripFooter}>
            <View style={styles.tripRoleRow}>
              <Ionicons name={isOwner ? 'shield-checkmark-outline' : 'people-outline'} size={16} color={currentColors.subtext} />
              <Text style={[styles.tripRoleText, { color: currentColors.subtext }]} numberOfLines={1}>
                {isOwner ? 'Właściciel' : 'Uczestnik'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => handleTripPress(trip)} 
              activeOpacity={0.8}
            >
              <Text style={styles.manageButtonText}>Pokaż plan podróży</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderParticipantRow = (participant: TripParticipantDto) => {
    const isActionLoading = actionProfileId === participant.profileId;
    const canRemove = !isOffline && selectedTrip?.accessRole === 'owner' && !participant.isOwner;

    return (
      <View key={participant.profileId} style={[styles.personRow, { borderColor: currentColors.border }]}> 
        <ProfileAvatar uri={participant.avatar} label={participant.displayName} color={participant.isOwner ? Colors.brand.green : Colors.brand.blue} />
        <View style={styles.personInfo}>
          <View style={styles.personNameRow}>
            <Text style={[styles.personName, { color: currentColors.text }]} numberOfLines={1}>{participant.displayName}</Text>
            {participant.isOwner && <Text style={styles.ownerBadge}>Właściciel</Text>}
          </View>
          <Text style={[styles.personSubtitle, { color: currentColors.subtext }]}>
            {participant.isOwner ? 'Organizator wycieczki' : 'Uczestnik wycieczki'}
          </Text>
          <Text style={[styles.personCost, { color: Colors.brand.blue }]}>
            {formatParticipantCost(
              selectedTripDisplayedAmountPerPerson ?? participant.amountOwed,
              participant.currency
            )}
          </Text>
        </View>
        {canRemove && 
        (
          <TouchableOpacity
            style={[styles.smallActionButton, styles.removeButton]}
            onPress={() => handleRemoveParticipant(participant)}
            disabled={isActionLoading}
          >
            {isActionLoading ? <ActivityIndicator size="small" color="#EF4444" /> : <Ionicons name="trash-outline" size={18} color="#EF4444" />}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFriendCandidate = (friend: FriendProfile) => {
    const isActionLoading = actionProfileId === friend.id;
    return (
      <View key={friend.id} style={[styles.personRow, { borderColor: currentColors.border }]}> 
        <ProfileAvatar uri={friend.avatar} label={friend.displayName} color={Colors.brand.green} />
        <View style={styles.personInfo}>
          <Text style={[styles.personName, { color: currentColors.text }]} numberOfLines={1}>{friend.displayName}</Text>
          <Text style={[styles.personSubtitle, { color: currentColors.subtext }]}>{getFriendSubtitle(friend)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addParticipantButton, { opacity: isActionLoading ? 0.7 : 1 }]}
          onPress={() => handleAddParticipant(friend)}
          disabled={isActionLoading}
        >
          {isActionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.addParticipantText}>Dodaj</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderDetailsTab = () => {
    if (!selectedTrip || !selectedStatusMeta) return null;
    const scheduleIsReadOnly = isOffline || selectedTrip.accessRole !== 'owner';

    return (
      <View>
        {isOffline && (
          <View style={[styles.readOnlyNotice, { backgroundColor: currentColors.card, borderColor: currentColors.border, marginBottom: 12 }]}>
            <Ionicons name="cloud-offline-outline" size={19} color={Colors.brand.blue} />
            <Text style={[styles.readOnlyText, { color: currentColors.subtext }]}>
              Pokazujemy zapisaną najbliższą wycieczkę. W trybie offline edycja, usuwanie i zarządzanie uczestnikami są wyłączone.
            </Text>
          </View>
        )}

        <View style={styles.detailsGrid}>
          <View style={styles.detailsGridRow}>
            <View style={[styles.detailsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.brand.blue} />
              <Text style={[styles.detailsValue, { color: currentColors.text }]}>{formatTripRange(selectedTrip)}</Text>
              <Text style={[styles.detailsLabel, { color: currentColors.subtext }]}>termin</Text>
            </View>
            <View style={[styles.detailsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="time-outline" size={20} color={Colors.brand.green} />
              <Text style={[styles.detailsValue, { color: currentColors.text }]}>{formatDaysLabel(selectedTripDays)}</Text>
              <Text style={[styles.detailsLabel, { color: currentColors.subtext }]}>długość</Text>
            </View>
          </View>
          <View style={styles.detailsGridRow}>
            <View style={[styles.detailsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons name="wallet-outline" size={20} color={Colors.brand.yellow} />
              <Text style={[styles.detailsValue, { color: currentColors.text }]}>{formatBudget(selectedTripDisplayedCost)}</Text>
              <Text style={[styles.detailsLabel, { color: currentColors.subtext }]}>koszt</Text>
            </View>
            <View style={[styles.detailsCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
              <Ionicons
                name={selectedTrip.accessRole === 'owner' ? 'shield-checkmark-outline' : 'people-outline'}
                size={20}
                color={selectedTrip.accessRole === 'owner' ? Colors.brand.blue : Colors.brand.green}
              />
              <Text style={[styles.detailsValue, { color: currentColors.text }]}>
                {selectedTrip.accessRole === 'owner' ? 'Organizator' : 'Uczestnik'}
              </Text>
              <Text style={[styles.detailsLabel, { color: currentColors.subtext }]}>Twoja rola</Text>
            </View>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}>
          <View style={styles.descriptionHeader}>
            <View style={[styles.descriptionIcon, { backgroundColor: selectedStatusMeta.color }]}>
              <Ionicons name="information-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.descriptionTitleBox}>
              <Text style={[styles.descriptionTitle, { color: currentColors.text }]}>Opis planu</Text>
              <Text style={[styles.descriptionSubtitle, { color: currentColors.subtext }]}>{selectedStatusMeta.label}</Text>
            </View>
          </View>
          <Text style={[styles.descriptionText, { color: currentColors.subtext }]}>
            {getTripDescription(selectedTrip.notes)?.trim() || 'Ten plan nie ma jeszcze opisu. Organizator może uzupełnić szczegóły podróży w dalszym etapie planowania.'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.descriptionCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}
          onPress={() => setModalTab('participants')}
          activeOpacity={0.7}
        >
          <View style={styles.descriptionHeader}>
            <View style={[styles.descriptionIcon, { backgroundColor: Colors.brand.green }]}> 
              <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.descriptionTitleBox}>
              <Text style={[styles.descriptionTitle, { color: currentColors.text }]}>Uczestnicy</Text>
              <Text style={[styles.descriptionSubtitle, { color: currentColors.subtext }]}>{participants.length} osób w planie</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={currentColors.subtext} />
          </View>

          {participantsLoading ? (
            <ActivityIndicator color={Colors.brand.blue} />
          ) : (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={[styles.descriptionSubtitle, { color: currentColors.subtext, marginBottom: 8, fontSize: 11 }]}>ORGANIZATOR:</Text>
                {participants.filter(p => p.isOwner).map(p => (
                  <View key={p.profileId} style={styles.participantRow}>
                    <ProfileAvatar uri={p.avatar} label={p.displayName || "Użytkownik"} size={40} color={Colors.brand.green} />
                    <Text style={[styles.participantName, { color: currentColors.text }]}>{p.displayName}</Text>
                  </View>
                ))}
              </View>

              <View>
                <Text style={[styles.descriptionSubtitle, { color: currentColors.subtext, marginBottom: 8, fontSize: 11 }]}>UCZESTNICY:</Text>
                {participants.filter(p => !p.isOwner).slice(0, 3).map(p => (
                  <View key={p.profileId} style={styles.participantRow}>
                    <ProfileAvatar uri={p.avatar} label={p.displayName} size={36} color={Colors.brand.blue} />
                    <Text style={[styles.participantName, { color: currentColors.text }]}>{p.displayName}</Text>
                  </View>
                ))}
                {participants.filter(p => !p.isOwner).length > 3 && (
                  <Text style={{ color: Colors.brand.blue, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                    + {participants.filter(p => !p.isOwner).length - 3} więcej...
                  </Text>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>

        
        {/* --- PRZYCISK DO OTWARCIA ZAAWANSOWANEGO HARMONOGRAMU --- */}
        <TouchableOpacity
          style={{
            backgroundColor: isOffline ? currentColors.border : Colors.brand.blue,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={() => {
            if (isOffline) {
              return;
            }
            closeTripPanel();
            handleTripPress(selectedTrip);
          }}
          disabled={isOffline}
        >
          <Ionicons name="map-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {isOffline ? 'Edytor niedostępny offline' : 'Otwórz edytor planu'}
          </Text>
        </TouchableOpacity>

      </View>
    );
  };

  const renderParticipantsTab = () => {
    if (!selectedTrip) return null;
    return (
      <View>
        {selectedTrip.accessRole !== 'owner' && (
          <View style={[styles.readOnlyNotice, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
            <Ionicons name="lock-closed-outline" size={19} color={Colors.brand.blue} />
            <Text style={[styles.readOnlyText, { color: currentColors.subtext }]}>Ten plan został Ci udostępniony. Możesz sprawdzić szczegóły i skład wycieczki, ale zarządzanie uczestnikami należy do właściciela.</Text>
          </View>
        )}

        <View style={styles.modalSectionHeader}>
          <Text style={[styles.modalSectionTitle, { color: currentColors.text }]}>Obecni uczestnicy</Text>
          <Text style={[styles.modalSectionCount, { color: currentColors.subtext }]}>
            {getPeopleLabel(participants.length)}
          </Text>
        </View>

        <View style={[styles.peopleCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
          {participantsLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={Colors.brand.blue} />
            </View>
          ) : participants.length > 0 ? (
            participants.map(renderParticipantRow)
          ) : (
            <Text style={[styles.emptyInlineText, { color: currentColors.subtext }]}>Brak uczestników do wyświetlenia.</Text>
          )}
        </View>

        {selectedTrip.accessRole === 'owner' && !isOffline && (
          <>
            <View style={styles.modalSectionHeader}>
              <Text style={[styles.modalSectionTitle, { color: currentColors.text }]}>Dodaj znajomego</Text>
              <Text style={[styles.modalSectionCount, { color: currentColors.subtext }]}>{availableFriends.length} dostępnych</Text>
            </View>

            <View style={[styles.peopleCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              {friendsLoading ? (
                <View style={styles.inlineLoader}>
                  <ActivityIndicator color={Colors.brand.blue} />
                </View>
              ) : availableFriends.length > 0 ? (
                availableFriends.map(renderFriendCandidate)
              ) : (
                <View style={styles.emptyFriendsBox}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={26} 
                    color={Colors.brand.green} 
                    style={{ marginTop: 12, marginBottom: -12 }} // <-- DODANO MARGINESY
                  />
                  <Text style={[styles.emptyInlineText, { color: currentColors.subtext }]}>
                    Wszyscy Twoi znajomi są już dodani albo nie masz jeszcze znajomych na liście.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  const { hasUnreadNotifications } = useNotifications();

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={tripsRefreshing} onRefresh={() => loadTrips('refresh')} tintColor={Colors.brand.blue} />
        }
      >
        <ScreenHeader
          variant="trips"
          title="Twoje Podróże"
          tripCount={trips.length}
          userInitials={userInitials}
          onProfilePress={() => router.push('/(main)/profile')}
          userAvatarUrl={userAvatarUrl}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push('/notifications')}
        />
        <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <Ionicons name="briefcase-outline" size={19} color={Colors.brand.blue} />
              <Text style={[styles.overviewValue, { color: currentColors.text }]}>{trips.length}</Text>
              <Text style={[styles.overviewLabel, { color: currentColors.subtext }]}>razem</Text>
            </View>
            <View style={[styles.overviewCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <Ionicons name="shield-checkmark-outline" size={19} color={Colors.brand.green} />
              <Text style={[styles.overviewValue, { color: currentColors.text }]}>{ownedTripsCount}</Text>
              <Text style={[styles.overviewLabel, { color: currentColors.subtext }]}>moje</Text>
            </View>
            <View style={[styles.overviewCard, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <Ionicons name="people-outline" size={19} color={Colors.brand.yellow} />
              <Text style={[styles.overviewValue, { color: currentColors.text }]}>{sharedTripsCount}</Text>
              <Text style={[styles.overviewLabel, { color: currentColors.subtext }]}>wspólne</Text>
            </View>
          </View>
        <View style={styles.scrollContent}>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripTabsContent} style={styles.tripTabs}>
            {tripListFilters.map((filter) => {
              const active = tripListFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  activeOpacity={0.85}
                  style={[
                    styles.tripTab,
                    {
                      backgroundColor: active ? Colors.brand.blue : currentColors.card,
                      borderColor: active ? Colors.brand.blue : currentColors.border,
                    },
                  ]}
                  onPress={() => setTripListFilter(filter.key)}
                >
                  <Ionicons name={filter.icon} size={16} color={active ? '#FFFFFF' : currentColors.subtext} />
                  <Text style={[styles.tripTabText, { color: active ? '#FFFFFF' : currentColors.text }]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {tripsLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={Colors.brand.blue} />
              <Text style={[styles.stateText, { color: currentColors.subtext }]}>Pobieranie wycieczek...</Text>
            </View>
          ) : tripsError ? (
            <View style={[styles.stateBox, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}> 
              <Ionicons name="warning-outline" size={30} color="#EF4444" />
              <Text style={[styles.stateTitle, { color: currentColors.text }]}>Nie udało się pobrać planów</Text>
              <Text style={[styles.stateText, { color: currentColors.subtext }]}>{tripsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => loadTrips('refresh')}>
                <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
              </TouchableOpacity>
            </View>
          ) : trips.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}> 
              <View style={styles.emptyIconCircle}>
                <Ionicons name="briefcase-outline" size={30} color="#FFFFFF" />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Nie masz jeszcze planów</Text>
              <Text style={[styles.emptyText, { color: currentColors.subtext }]}>Utwórz wycieczkę albo poproś znajomego, aby dodał Cię jako uczestnika.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(main)/create')}>
                <Text style={styles.emptyButtonText}>Utwórz plan</Text>
              </TouchableOpacity>
            </View>
          ) : visibleTrips.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: currentColors.border, backgroundColor: currentColors.card }]}> 
              <View style={styles.emptyIconCircle}>
                <Ionicons name="filter-outline" size={30} color="#FFFFFF" />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>Brak planów w tej sekcji</Text>
              <Text style={[styles.emptyText, { color: currentColors.subtext }]}>Zmień filtr, aby zobaczyć pozostałe wycieczki.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setTripListFilter('all')}>
                <Text style={styles.emptyButtonText}>Pokaż wszystkie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visibleTrips.map(renderTripCard)
          )}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedTrip)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeTripPanel}
      >
        <View style={[styles.modalContainer, { backgroundColor: currentColors.background }]}> 
          <View style={[styles.modalHeader, { paddingTop: insets.top + 14, borderBottomColor: currentColors.border }]}> 
            <View style={styles.modalTitleBox}>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>Plan podróży</Text>
              <Text style={[styles.modalSubtitle, { color: currentColors.subtext }]} numberOfLines={1}>{selectedTrip?.destination || 'Wycieczka'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: selectedTripIsSavedOffline
                      ? 'rgba(16,185,129,0.14)'
                      : currentColors.card,
                  },
                ]}
                onPress={() => {
                  if (selectedTripCanBeRemovedFromOffline) {
                    void handleRemoveSelectedTripOffline();
                    return;
                  }

                  void handleSaveSelectedTripOffline();
                }}
                disabled={offlineSaving || !selectedTrip || (selectedTripIsSavedOffline && !selectedTripCanBeRemovedFromOffline)}
                activeOpacity={0.85}
              >
                {offlineSaving ? (
                  <ActivityIndicator size="small" color={Colors.brand.blue} />
                ) : selectedTripIsSavedOffline ? (
                  <Ionicons name="checkmark" size={23} color={Colors.brand.green} />
                ) : (
                  <Ionicons name="download-outline" size={22} color={Colors.brand.blue} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: currentColors.card }]} onPress={closeTripPanel}>
                <Ionicons name="close" size={24} color={currentColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
            {selectedTrip && selectedStatusMeta && (
              <View style={[styles.tripDetailsHero, { borderColor: currentColors.border }]}> 
                <Image source={{ uri: getTripImage(selectedTrip, selectedTripIndex) }} style={styles.tripDetailsImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.tripDetailsOverlay} />
                <View style={styles.tripDetailsContent}>
                  <View style={styles.cardBadgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: selectedStatusMeta.color }]}> 
                      <Text style={styles.statusText}>{selectedStatusMeta.label}</Text>
                    </View>
                    <View style={[styles.accessBadge, { backgroundColor: selectedTrip.accessRole === 'owner' ? 'rgba(73,142,230,0.94)' : 'rgba(32,160,121,0.94)' }]}> 
                      <Ionicons name={selectedTrip.accessRole === 'owner' ? 'shield-checkmark-outline' : 'people-outline'} size={13} color="#FFFFFF" />
                      <Text style={styles.accessBadgeText}>{selectedTrip.accessRole === 'owner' ? 'Właściciel' : 'Uczestnik'}</Text>
                    </View>
                  </View>
                  <View>
                    <Text style={styles.tripDetailsTitle} numberOfLines={2}>{selectedTrip.destination}</Text>
                    <Text style={styles.tripDetailsSubtitle}>{formatTripRange(selectedTrip)} · {formatDaysLabel(selectedTripDays)}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.modalTabs, { backgroundColor: currentColors.card, borderColor: currentColors.border }]}> 
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.modalTabButton, modalTab === 'details' && styles.modalTabButtonActive]}
                onPress={() => setModalTab('details')}
              >
                <Ionicons name="document-text-outline" size={16} color={modalTab === 'details' ? '#FFFFFF' : currentColors.subtext} />
                <Text style={[styles.modalTabText, { color: modalTab === 'details' ? '#FFFFFF' : currentColors.text }]}>Szczegóły</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.modalTabButton, modalTab === 'participants' && styles.modalTabButtonActive]}
                onPress={() => setModalTab('participants')}
              >
                <Ionicons name="people-outline" size={16} color={modalTab === 'participants' ? '#FFFFFF' : currentColors.subtext} />
                <Text style={[styles.modalTabText, { color: modalTab === 'participants' ? '#FFFFFF' : currentColors.text }]}>Uczestnicy</Text>
              </TouchableOpacity>
            </View>

            {modalTab === 'details' ? renderDetailsTab() : renderParticipantsTab()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
