/**
 * TESTY JEDNOSTKOWE – repozytoria wycieczki
 *
 * createTrip, createTripDays, createActivities oraz konwersja dat.
 * Supabase jest mockowany – brak połączeń z bazą.
 */

jest.mock('../../configs/supabaseClient', () => ({
  supabaseDbClient: {
    from: jest.fn(),
  },
}));

const { supabaseDbClient } = require('../../configs/supabaseClient');
const { createTrip } = require('../../repositories/trip.repository');
const { createTripDays } = require('../../repositories/tripDays.repository');
const { createActivities } = require('../../repositories/activities.repository');
const { toISO } = require('../../utils/tripDates');

const TRIP_ID = 'trip-repo-1';
const DAY_ID = 'day-repo-1';
const OWNER_ID = 'user-owner-123';

const makeInsertSingleChain = (result) => {
  const chain = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return chain;
};

const makeInsertManyChain = (result) => {
  const chain = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => Promise.resolve(result)),
  };
  return chain;
};

describe('createTrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zapisuje rekord wycieczki w tabeli trips i zwraca obiekt z id', async () => {
    const tripRow = {
      owner_id: OWNER_ID,
      destination: 'Krakow',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      total_budget: 2000,
      status: 'planned',
    };

    const savedTrip = { id: TRIP_ID, ...tripRow };
    const chain = makeInsertSingleChain({ data: savedTrip, error: null });
    supabaseDbClient.from.mockReturnValue(chain);

    const result = await createTrip(tripRow);

    expect(supabaseDbClient.from).toHaveBeenCalledWith('trips');
    expect(chain.insert).toHaveBeenCalledWith(tripRow);
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.single).toHaveBeenCalled();
    expect(result.data).toEqual(savedTrip);
    expect(result.error).toBeNull();
  });

  it('zwraca blad naruszenia klucza obcego gdy owner_id nie istnieje w profiles', async () => {
    const tripRow = {
      owner_id: 'nieistniejacy-uzytkownik',
      destination: 'Krakow',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      total_budget: 2000,
    };

    const fkError = {
      code: '23503',
      message: 'insert or update on table "trips" violates foreign key constraint "trips_owner_id_fkey"',
    };
    const chain = makeInsertSingleChain({ data: null, error: fkError });
    supabaseDbClient.from.mockReturnValue(chain);

    const result = await createTrip(tripRow);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(fkError);
    expect(result.error.code).toBe('23503');
  });
});

describe('createTripDays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zapisuje liste dni w trip_days z poprawnymi referencjami trip_id', async () => {
    const dayRows = [
      {
        trip_id: TRIP_ID,
        day_number: 1,
        date: '2026-06-01',
        title: 'Dzien 1',
      },
      {
        trip_id: TRIP_ID,
        day_number: 2,
        date: '2026-06-02',
        title: 'Dzien 2',
      },
    ];

    const savedDays = [
      { id: DAY_ID, ...dayRows[0] },
      { id: 'day-repo-2', ...dayRows[1] },
    ];
    const chain = makeInsertManyChain({ data: savedDays, error: null });
    supabaseDbClient.from.mockReturnValue(chain);

    const result = await createTripDays(dayRows);

    expect(supabaseDbClient.from).toHaveBeenCalledWith('trip_days');
    expect(chain.insert).toHaveBeenCalledWith(dayRows);
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(savedDays);
    expect(result.data.every((day) => day.trip_id === TRIP_ID)).toBe(true);
  });
});

describe('createActivities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zapisuje liste aktywnosci w activities z poprawnymi referencjami day_id', async () => {
    const activityRows = [
      {
        day_id: DAY_ID,
        time: '2026-06-01T10:00:00',
        name: 'Wawel',
        type: 'atrakcja',
        cost: 100,
        order_index: 0,
      },
      {
        day_id: DAY_ID,
        time: '2026-06-01T14:00:00',
        name: 'Obiad',
        type: 'jedzenie',
        cost: 80,
        order_index: 1,
      },
    ];

    const savedActivities = [
      { id: 'act-repo-1', ...activityRows[0] },
      { id: 'act-repo-2', ...activityRows[1] },
    ];
    const chain = makeInsertManyChain({ data: savedActivities, error: null });
    supabaseDbClient.from.mockReturnValue(chain);

    const result = await createActivities(activityRows);

    expect(supabaseDbClient.from).toHaveBeenCalledWith('activities');
    expect(chain.insert).toHaveBeenCalledWith(activityRows);
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(savedActivities);
    expect(result.data.every((activity) => activity.day_id === DAY_ID)).toBe(true);
  });
});

describe('toISO – konwersja daty przed zapisem', () => {
  it('konwertuje date z formatu dd.mm.rrrr na YYYY-MM-DD', () => {
    expect(toISO('01.06.2026')).toBe('2026-06-01');
    expect(toISO('15.12.2025')).toBe('2025-12-15');
  });

  it('zwraca null dla niepoprawnego formatu', () => {
    expect(toISO(null)).toBeNull();
    expect(toISO('2026-06-01')).toBeNull();
    expect(toISO('01.06')).toBeNull();
  });
});
