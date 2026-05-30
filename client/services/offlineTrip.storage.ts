import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TripDto, TripParticipantDto, TripScheduleDayDto } from '@/types/trips';

const OFFLINE_TRIP_CACHE_PREFIX = 'wherewegoing_offline_trip_cache_v1';

export type CachedOfflineTrip = {
  trip: TripDto;
  participants: TripParticipantDto[];
  scheduleDays: TripScheduleDayDto[];
  cachedAt: string;
};

const getOfflineTripCacheKey = (userId: string) => `${OFFLINE_TRIP_CACHE_PREFIX}:${userId}`;

const getTripStartTime = (trip: TripDto) => {
  const parsed = new Date(`${trip.startDate || ''}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripEndTime = (trip: TripDto) => {
  const parsed = new Date(`${trip.endDate || ''}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripDateRank = (trip: TripDto) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const startTime = getTripStartTime(trip);
  const endTime = getTripEndTime(trip);

  if (startTime !== null && endTime !== null && startTime <= todayTime && endTime >= todayTime) return 0;
  if (startTime !== null && startTime > todayTime) return 1;
  if (endTime !== null && endTime < todayTime) return 2;
  return 3;
};

const sortCachedTripsByNearestDate = (trips: CachedOfflineTrip[]) => [...trips].sort((a, b) => {
  const aRank = getTripDateRank(a.trip);
  const bRank = getTripDateRank(b.trip);
  const aStart = getTripStartTime(a.trip);
  const bStart = getTripStartTime(b.trip);

  if (aRank !== bRank) return aRank - bRank;
  if (aStart === null && bStart === null) return 0;
  if (aStart === null) return 1;
  if (bStart === null) return -1;
  if (aRank === 2) return bStart - aStart;
  return aStart - bStart;
});

const normalizeCachedTrips = (rawValue: unknown): CachedOfflineTrip[] => {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((item): item is CachedOfflineTrip => Boolean(item?.trip?.id));
  }

  if (rawValue && typeof rawValue === 'object' && (rawValue as CachedOfflineTrip).trip?.id) {
    return [rawValue as CachedOfflineTrip];
  }

  return [];
};

export const getCachedOfflineTrips = async (userId: string): Promise<CachedOfflineTrip[]> => {
  const raw = await AsyncStorage.getItem(getOfflineTripCacheKey(userId));

  if (!raw) {
    return [];
  }

  try {
    return normalizeCachedTrips(JSON.parse(raw));
  } catch {
    await AsyncStorage.removeItem(getOfflineTripCacheKey(userId));
    return [];
  }
};

export const saveCachedOfflineTrip = async (userId: string, payload: CachedOfflineTrip) => {
  const currentTrips = await getCachedOfflineTrips(userId);
  const nextTrips = [
    payload,
    ...currentTrips.filter((item) => item.trip.id !== payload.trip.id),
  ];

  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(sortCachedTripsByNearestDate(nextTrips)));
};

export const getCachedOfflineTrip = async (userId: string): Promise<CachedOfflineTrip | null> => {
  const trips = await getCachedOfflineTrips(userId);
  return trips[0] ?? null;
};

export const removeCachedOfflineTrip = async (userId: string, tripId: string) => {
  const currentTrips = await getCachedOfflineTrips(userId);
  const nextTrips = currentTrips.filter((item) => item.trip.id !== tripId);
  const sortedTrips = sortCachedTripsByNearestDate(nextTrips);
  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(sortedTrips));
  return sortedTrips;
};

export const syncCachedOfflineTrips = async (userId: string, currentTrips: TripDto[]) => {
  const cachedTrips = await getCachedOfflineTrips(userId);
  const currentTripById = new Map(currentTrips.map((trip) => [trip.id, trip]));

  const nextTrips = cachedTrips
    .filter((item) => currentTripById.has(item.trip.id))
    .map((item) => ({
      ...item,
      trip: {
        ...item.trip,
        ...currentTripById.get(item.trip.id),
      },
      cachedAt: new Date().toISOString(),
    }));

  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(nextTrips));
  return nextTrips;
};

export const clearCachedOfflineTrip = async (userId: string) => {
  await AsyncStorage.removeItem(getOfflineTripCacheKey(userId));
};
