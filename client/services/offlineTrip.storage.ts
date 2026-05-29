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
  ].sort((a, b) => {
    const firstDate = new Date(`${a.trip.startDate}T00:00:00`).getTime();
    const secondDate = new Date(`${b.trip.startDate}T00:00:00`).getTime();

    return (Number.isNaN(firstDate) ? Number.MAX_SAFE_INTEGER : firstDate)
      - (Number.isNaN(secondDate) ? Number.MAX_SAFE_INTEGER : secondDate);
  });

  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(nextTrips));
};

export const getCachedOfflineTrip = async (userId: string): Promise<CachedOfflineTrip | null> => {
  const trips = await getCachedOfflineTrips(userId);
  return trips[0] ?? null;
};

export const removeCachedOfflineTrip = async (userId: string, tripId: string) => {
  const currentTrips = await getCachedOfflineTrips(userId);
  const nextTrips = currentTrips.filter((item) => item.trip.id !== tripId);
  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(nextTrips));
  return nextTrips;
};

export const clearCachedOfflineTrip = async (userId: string) => {
  await AsyncStorage.removeItem(getOfflineTripCacheKey(userId));
};
