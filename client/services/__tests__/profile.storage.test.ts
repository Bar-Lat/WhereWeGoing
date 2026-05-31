/// <reference types="jest" />

/**
 * TESTY JEDNOSTKOWE - services/profile.storage.ts
 *
 * Testujemy lokalny cache profilu użytkownika w izolacji.
 * AsyncStorage jest mockowany, więc testy nie korzystają z pamięci telefonu.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearCachedProfile,
  getCachedProfile,
  saveCachedProfile,
} from '../profile.storage';
import type { UserProfile } from '../profile.api';

const USER_ID = 'user-abc-123';
const CACHE_KEY = `wherewegoing_profile_cache_v1:${USER_ID}`;

const PROFILE: UserProfile = {
  id: USER_ID,
  email: 'patryk@example.com',
  firstName: 'Patryk',
  lastName: 'Kubik',
  avatar: 'https://example.com/avatar.png',
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-20T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  return AsyncStorage.clear();
});

// ============================================================
// saveCachedProfile / getCachedProfile
// ============================================================

describe('saveCachedProfile', () => {
  it('zapisuje profil użytkownika w AsyncStorage', async () => {
    await saveCachedProfile(PROFILE);

    const rawValue = await AsyncStorage.getItem(CACHE_KEY);

    expect(JSON.parse(rawValue || '{}')).toEqual(PROFILE);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify(PROFILE));
  });
});

describe('getCachedProfile', () => {
  it('zwraca null gdy profil nie jest zapisany', async () => {
    const profile = await getCachedProfile(USER_ID);

    expect(profile).toBeNull();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('odczytuje zapisane dane profilu', async () => {
    await saveCachedProfile(PROFILE);

    const profile = await getCachedProfile(USER_ID);

    expect(profile).toEqual(PROFILE);
  });

  it('usuwa uszkodzony JSON profilu i zwraca null', async () => {
    await AsyncStorage.setItem(CACHE_KEY, 'profil bez json');

    const profile = await getCachedProfile(USER_ID);

    expect(profile).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY);
  });
});

// ============================================================
// clearCachedProfile
// ============================================================

describe('clearCachedProfile', () => {
  it('usuwa zapisany profil użytkownika z AsyncStorage', async () => {
    await saveCachedProfile(PROFILE);

    await clearCachedProfile(USER_ID);

    expect(await AsyncStorage.getItem(CACHE_KEY)).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY);
  });
});
