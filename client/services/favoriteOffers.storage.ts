import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const FAVORITE_OFFERS_KEY = 'wherewegoing_favorite_inspiration_offers';
const isWeb = Platform.OS === 'web';

const readRawValue = async () => {
  if (isWeb) {
    return localStorage.getItem(FAVORITE_OFFERS_KEY);
  }

  return SecureStore.getItemAsync(FAVORITE_OFFERS_KEY);
};

const writeRawValue = async (value: string) => {
  if (isWeb) {
    localStorage.setItem(FAVORITE_OFFERS_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(FAVORITE_OFFERS_KEY, value);
};

export const getFavoriteOfferIds = async (): Promise<string[]> => {
  const rawValue = await readRawValue();

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const saveFavoriteOfferIds = async (offerIds: string[]) => {
  const uniqueOfferIds = [...new Set(offerIds)];
  await writeRawValue(JSON.stringify(uniqueOfferIds));
};
