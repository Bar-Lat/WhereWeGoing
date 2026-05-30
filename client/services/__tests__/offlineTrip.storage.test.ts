/// <reference types="jest" />

/**
 * TESTY JEDNOSTKOWE - services/offlineTrip.storage.ts
 *
 * Testujemy lokalny cache wycieczek offline w izolacji.
 * AsyncStorage jest mockowany, więc testy nie korzystają z pamięci telefonu.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearCachedOfflineTrip,
  getCachedOfflineTrip,
  getCachedOfflineTrips,
  removeCachedOfflineTrip,
  saveCachedOfflineTrip,
  syncCachedOfflineTrips,
  type CachedOfflineTrip,
} from '../offlineTrip.storage';
import type { TripDto, TripParticipantDto, TripScheduleDayDto } from '@/types/trips';

const USER_ID = 'user-abc-123';
const CACHE_KEY = `wherewegoing_offline_trip_cache_v1:${USER_ID}`;

const makeTrip = (overrides: Partial<TripDto> = {}): TripDto => ({
  id: 'trip-1',
  ownerId: USER_ID,
  destination: 'Rzym',
  startDate: '2026-06-10',
  endDate: '2026-06-12',
  totalBudget: 2500,
  totalCost: 1200,
  status: 'planned',
  imageUrl: null,
  notes: 'Krótki opis podróży do Rzymu',
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
  participantsCount: 1,
  accessRole: 'owner',
  ...overrides,
});

const PARTICIPANTS: TripParticipantDto[] = [
  {
    id: 'participant-1',
    profileId: USER_ID,
    relationId: null,
    firstName: 'Patryk',
    lastName: 'Kubik',
    displayName: 'Patryk Kubik',
    avatar: null,
    role: 'owner',
    isOwner: true,
    amountOwed: 0,
    currency: 'PLN',
  },
];

const SCHEDULE_DAYS: TripScheduleDayDto[] = [
  {
    id: 'day-1',
    dayNumber: 1,
    date: '2026-06-10',
    title: 'Pierwszy dzień',
    activities: [
      {
        id: 'activity-1',
        dayId: 'day-1',
        time: '10:00',
        name: 'Zwiedzanie centrum',
        description: 'Spacer po najważniejszych punktach miasta',
        category: 'atrakcja',
        location: 'Centrum',
        cost: 0,
        orderIndex: 1,
      },
    ],
  },
];

const makeCachedTrip = (
  tripOverrides: Partial<TripDto> = {},
  payloadOverrides: Partial<CachedOfflineTrip> = {}
): CachedOfflineTrip => ({
  trip: makeTrip(tripOverrides),
  participants: PARTICIPANTS,
  scheduleDays: SCHEDULE_DAYS,
  cachedAt: '2026-05-30T12:00:00Z',
  ...payloadOverrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.clear as jest.Mock).mockClear();
  return AsyncStorage.clear();
});

// ============================================================
// getCachedOfflineTrips
// ============================================================

describe('getCachedOfflineTrips', () => {
  it('zwraca pustą listę gdy cache nie istnieje', async () => {
    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toEqual([]);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(CACHE_KEY);
  });

  it('odczytuje listę zapisanych wycieczek z AsyncStorage', async () => {
    const cachedTrip = makeCachedTrip();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([cachedTrip]));

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toHaveLength(1);
    expect(trips[0].trip.destination).toBe('Rzym');
    expect(trips[0].scheduleDays[0].activities[0].name).toBe('Zwiedzanie centrum');
  });

  it('odczytuje zapisanych uczestników wycieczki z cache', async () => {
    const cachedTrip = makeCachedTrip({}, {
      participants: [
        ...PARTICIPANTS,
        {
          id: 'participant-2',
          profileId: 'friend-1',
          relationId: 'relation-1',
          firstName: 'Jan',
          lastName: 'Kowalski',
          displayName: 'Jan Kowalski',
          avatar: 'https://example.com/jan.png',
          role: 'participant',
          isOwner: false,
          amountOwed: 600,
          currency: 'PLN',
        },
      ],
    });
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([cachedTrip]));

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips[0].participants).toHaveLength(2);
    expect(trips[0].participants[1]).toEqual(expect.objectContaining({
      profileId: 'friend-1',
      displayName: 'Jan Kowalski',
      role: 'participant',
      amountOwed: 600,
    }));
  });

  it('obsługuje starszy format cache z pojedynczą wycieczką zamiast listy', async () => {
    const cachedTrip = makeCachedTrip();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedTrip));

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toEqual([cachedTrip]);
  });

  it('pomija niepoprawne elementy bez trip.id', async () => {
    const validTrip = makeCachedTrip();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([validTrip, { trip: {} }, null]));

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toEqual([validTrip]);
  });

  it('usuwa uszkodzony JSON i zwraca pustą listę', async () => {
    await AsyncStorage.setItem(CACHE_KEY, 'to nie jest json');

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY);
  });
});

// ============================================================
// saveCachedOfflineTrip / getCachedOfflineTrip
// ============================================================

describe('saveCachedOfflineTrip', () => {
  it('zapisuje wycieczkę offline w AsyncStorage', async () => {
    const cachedTrip = makeCachedTrip();

    await saveCachedOfflineTrip(USER_ID, cachedTrip);

    const rawValue = await AsyncStorage.getItem(CACHE_KEY);
    expect(JSON.parse(rawValue || '[]')).toEqual([cachedTrip]);
  });

  it('nadpisuje istniejącą wycieczkę o tym samym id', async () => {
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ destination: 'Rzym' }));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ destination: 'Rio' }));

    const trips = await getCachedOfflineTrips(USER_ID);

    expect(trips).toHaveLength(1);
    expect(trips[0].trip.destination).toBe('Rio');
  });

  it('sortuje cache tak, aby najbliższa przyszła wycieczka była pierwsza', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-30T10:00:00Z'));

    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'late', destination: 'Tokio', startDate: '2026-12-01', endDate: '2026-12-10' }));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'near', destination: 'Berlin', startDate: '2026-06-01', endDate: '2026-06-03' }));

    const nearestTrip = await getCachedOfflineTrip(USER_ID);

    expect(nearestTrip?.trip.id).toBe('near');
    jest.useRealTimers();
  });

  it('ustawia trwającą wycieczkę przed przyszłymi planami', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-05T10:00:00Z'));

    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'future', destination: 'Lizbona', startDate: '2026-06-20', endDate: '2026-06-25' }));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'active', destination: 'Praga', startDate: '2026-06-01', endDate: '2026-06-07' }));

    const nearestTrip = await getCachedOfflineTrip(USER_ID);

    expect(nearestTrip?.trip.id).toBe('active');
    jest.useRealTimers();
  });
});

// ============================================================
// removeCachedOfflineTrip / clearCachedOfflineTrip
// ============================================================

describe('removeCachedOfflineTrip', () => {
  it('usuwa wskazaną wycieczkę z cache i zwraca pozostałe', async () => {
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'trip-1', destination: 'Rzym' }));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'trip-2', destination: 'Paryż' }));

    const trips = await removeCachedOfflineTrip(USER_ID, 'trip-1');

    expect(trips).toHaveLength(1);
    expect(trips[0].trip.id).toBe('trip-2');
  });
});

describe('clearCachedOfflineTrip', () => {
  it('czyści cache wycieczek dla użytkownika', async () => {
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip());

    await clearCachedOfflineTrip(USER_ID);

    expect(await AsyncStorage.getItem(CACHE_KEY)).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(CACHE_KEY);
  });
});

// ============================================================
// syncCachedOfflineTrips
// ============================================================

describe('syncCachedOfflineTrips', () => {
  it('usuwa z cache wycieczki, których nie ma już na koncie użytkownika', async () => {
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'deleted-trip', destination: 'Usunięta' }));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'existing-trip', destination: 'Aktywna' }));

    const syncedTrips = await syncCachedOfflineTrips(USER_ID, [
      makeTrip({ id: 'existing-trip', destination: 'Aktywna' }),
    ]);

    expect(syncedTrips).toHaveLength(1);
    expect(syncedTrips[0].trip.id).toBe('existing-trip');
  });

  it('aktualizuje dane istniejącej wycieczki po powrocie online', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-30T15:00:00Z'));
    await saveCachedOfflineTrip(USER_ID, makeCachedTrip({ id: 'trip-1', destination: 'Stara nazwa', totalBudget: 1000 }));

    const syncedTrips = await syncCachedOfflineTrips(USER_ID, [
      makeTrip({ id: 'trip-1', destination: 'Nowa nazwa', totalBudget: 3000 }),
    ]);

    expect(syncedTrips[0].trip.destination).toBe('Nowa nazwa');
    expect(syncedTrips[0].trip.totalBudget).toBe(3000);
    expect(syncedTrips[0].cachedAt).toBe('2026-05-30T15:00:00.000Z');
    jest.useRealTimers();
  });
});
