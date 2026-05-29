import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from './profile.api';

const PROFILE_CACHE_PREFIX = 'wherewegoing_profile_cache_v1';

const getProfileCacheKey = (userId: string) => {
  return `${PROFILE_CACHE_PREFIX}:${userId}`;
};

export const saveCachedProfile = async (profile: UserProfile) => {
  await AsyncStorage.setItem(
    getProfileCacheKey(profile.id),
    JSON.stringify(profile)
  );
};

export const getCachedProfile = async (userId: string): Promise<UserProfile | null> => {
  const rawProfile = await AsyncStorage.getItem(getProfileCacheKey(userId));

  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile) as UserProfile;
  } catch {
    await AsyncStorage.removeItem(getProfileCacheKey(userId));
    return null;
  }
};

export const clearCachedProfile = async (userId: string) => {
  await AsyncStorage.removeItem(getProfileCacheKey(userId));
};