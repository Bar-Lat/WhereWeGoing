/**
 * TESTY JEDNOSTKOWE – Funkcje pomocnicze, normalizatory i walidatory
 * Zakres: Wyświetlanie wycieczek i harmonogramu.
 */

// 1. Mockujemy Supabase (żeby importy na górze kontrolera nie wyrzucały błędu)
jest.mock('../../configs/supabaseClient', () => ({
  supabaseAuthClient: {},
  supabaseDbClient: {}
}));

// 2. Mockujemy plik activityGeo (bo to nie Twój zakres, a kontroler go używa)
jest.mock('../../utils/activityGeo', () => ({
  parseActivityCoordinates: jest.fn(() => ({ latitude: 50, longitude: 20 })),
  serializeCoordinatesForDb: jest.fn(),
  parseActivityDurationMinutes: jest.fn(),
  enrichTripPlanActivities: jest.fn(),
  normalizeDurationMinutes: jest.fn(),
  validateTripPlanCoordinates: jest.fn(),
}));

// 3. Mockujemy plik friends.controller (używany do resolveAvatarUrl)
jest.mock('../../controllers/friends.controller', () => ({
  resolveAvatarUrl: jest.fn(),
}));

// 4. Importujemy Twoje funkcje z kontrolera
const { 
  formatActivityTime, 
  buildActivityTimestamp,
  sortTripsByNearestDate,
  normalizeTrip,
  normalizeScheduleActivity
} = require('../../controllers/trips.controller');

// ==========================================
// TESTY FUNKCJI CZASOWYCH
// ==========================================

describe('formatActivityTime', () => {
  it('zwraca czas w formacie HH:MM ze standardowego stringa', () => {
    expect(formatActivityTime('14:30')).toBe('14:30');
  });

  it('wycina poprawnie godzinę z pełnego formatu ISO (z literą T)', () => {
    expect(formatActivityTime('2025-05-01T16:45:00.000Z')).toBe('16:45');
  });

  it('zwraca domyślnie "09:00", gdy przekazano null', () => {
    expect(formatActivityTime(null)).toBe('09:00');
  });

  it('zwraca domyślnie "09:00", gdy przekazano typ inny niż string', () => {
    expect(formatActivityTime(12345)).toBe('09:00');
  });
});

describe('buildActivityTimestamp', () => {
  it('łączy poprawną datę z czasem w pełny format ISO', () => {
    expect(buildActivityTimestamp('2025-05-01T00:00:00', '10:30')).toBe('2025-05-01T10:30:00');
  });

  it('używa bezpiecznej daty "1970-01-01", gdy dayDate jest niepoprawne', () => {
    expect(buildActivityTimestamp(null, '15:00')).toBe('1970-01-01T15:00:00');
  });
});

// ==========================================
// TESTY NORMALIZACJI DANYCH (Twój zakres)
// ==========================================

describe('normalizeTrip', () => {
  const mockTripRow = {
    id: 'trip-1',
    owner_id: 'user-123',
    destination: 'Rzym',
    status: 'planned',
    total_budget: 1000
  };

  it('poprawnie nadaje rolę "owner", jeśli userId zgadza się z owner_id', () => {
    const result = normalizeTrip(mockTripRow, 'user-123', 1, 500);
    expect(result.accessRole).toBe('owner');
    expect(result.totalCost).toBe(500);
    expect(result.participantsCount).toBe(1);
    expect(result.totalBudget).toBe(1000);
  });

  it('poprawnie nadaje rolę "participant", jeśli userId to inna osoba', () => {
    const result = normalizeTrip(mockTripRow, 'user-999', 3, null);
    expect(result.accessRole).toBe('participant');
    expect(result.totalCost).toBeNull(); 
    expect(result.participantsCount).toBe(3);
  });
});

describe('normalizeScheduleActivity', () => {
  it('wypełnia braki w danych aktywności bezpiecznymi domyślnymi wartościami', () => {
    const emptyRow = { id: 'act-1', day_id: 'day-1' }; 
    
    const result = normalizeScheduleActivity(emptyRow);
    
    expect(result.name).toBe('Aktywność'); 
    expect(result.category).toBe('inne');  
    expect(result.cost).toBe(0);           
    expect(result.time).toBe('09:00');     
  });

  it('poprawnie mapuje pełne dane aktywności z bazy na camelCase', () => {
    const fullRow = {
      id: 'act-1', day_id: 'day-1', name: 'Kolacja', time: '19:00',
      type: 'jedzenie', cost: 150, duration_minutes: 90
    };
    
    const result = normalizeScheduleActivity(fullRow);
    
    expect(result.name).toBe('Kolacja');
    expect(result.category).toBe('jedzenie');
    expect(result.cost).toBe(150);
    expect(result.durationMinutes).toBe(90);
  });
});

// ==========================================
// TESTY SORTOWANIA WYCIECZEK
// ==========================================

describe('sortTripsByNearestDate', () => {
  const today = new Date();
  
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
  const nextWeekStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];

  const tripsList = [
    { id: 'past', startDate: '2020-01-01', endDate: yesterdayStr }, // Miniona
    { id: 'future-far', startDate: nextWeekStr, endDate: nextWeekStr }, // Przyszła (daleko)
    { id: 'ongoing', startDate: yesterdayStr, endDate: tomorrowStr }, // Trwająca
    { id: 'future-near', startDate: tomorrowStr, endDate: tomorrowStr }, // Przyszła (blisko)
    { id: 'no-date', created_at: '2024-01-01' } // Brak daty (np. wygenerowana, ale niezaakceptowana)
  ];

  it('sortuje wycieczki w kolejności: Trwające -> Przyszłe (od najbliższej) -> Minione -> Bez daty', () => {
    const sorted = sortTripsByNearestDate(tripsList);

    expect(sorted[0].id).toBe('ongoing');       // Rank 0
    expect(sorted[1].id).toBe('future-near');   // Rank 1
    expect(sorted[2].id).toBe('future-far');    // Rank 1
    expect(sorted[3].id).toBe('past');          // Rank 2
    expect(sorted[4].id).toBe('no-date');       // Rank 3
  });
});