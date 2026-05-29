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

export const saveCachedOfflineTrip = async (userId: string, payload: CachedOfflineTrip) => {
  await AsyncStorage.setItem(getOfflineTripCacheKey(userId), JSON.stringify(payload));
};

export const getCachedOfflineTrip = async (userId: string): Promise<CachedOfflineTrip | null> => {
  const raw = await AsyncStorage.getItem(getOfflineTripCacheKey(userId));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedOfflineTrip;
  } catch {
    await AsyncStorage.removeItem(getOfflineTripCacheKey(userId));
    return null;
  }
};

export const clearCachedOfflineTrip = async (userId: string) => {
  await AsyncStorage.removeItem(getOfflineTripCacheKey(userId));
};
