import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_PREFIX = 'wherewegoing_unlocked_achievements';

const getStorageKey = (profileId: string) => `${STORAGE_PREFIX}_${profileId}`;

const readValue = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
};

const writeValue = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

export const syncUnlockedAchievements = async (profileId: string, unlockedIds: string[]) => {
  const key = getStorageKey(profileId);
  const storedValue = await readValue(key);
  const uniqueCurrentIds = Array.from(new Set(unlockedIds));

  if (!storedValue) {
    await writeValue(key, JSON.stringify(uniqueCurrentIds));
    return [];
  }

  let previousIds: string[] = [];

  try {
    const parsedValue = JSON.parse(storedValue);
    previousIds = Array.isArray(parsedValue) ? parsedValue.filter((item) => typeof item === 'string') : [];
  } catch {
    previousIds = [];
  }

  const previousSet = new Set(previousIds);
  const newUnlockedIds = uniqueCurrentIds.filter((id) => !previousSet.has(id));
  const mergedIds = Array.from(new Set([...previousIds, ...uniqueCurrentIds]));

  await writeValue(key, JSON.stringify(mergedIds));

  return newUnlockedIds;
};
