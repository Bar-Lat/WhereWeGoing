/**
 * TESTY INTEGRACYJNE – GET /api/trip/history
 *
 * Supabase Auth i DB są mockowane – brak połączeń sieciowych.
 */

const request = require('supertest');

jest.mock('../../configs/supabaseClient', () => ({
  supabaseAuthClient: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
  supabaseDbClient: {
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../../repositories/profile.repository', () => ({
  upsertUserProfile: jest.fn(),
  getUserProfileById: jest.fn(),
  profileSchema: 'public',
  profileTable: 'profiles',
}));

const app = require('../../server');
const { supabaseAuthClient, supabaseDbClient } = require('../../configs/supabaseClient');

const VALID_USER = { id: 'user-history-123', email: 'jan@example.com' };

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: { user: VALID_USER },
    error: null,
  });

const withInvalidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: null,
    error: { message: 'invalid token' },
  });

const makeDbChain = (result, terminal = 'eq') => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => (terminal === 'eq' ? Promise.resolve(result) : chain)),
    in: jest.fn(() => (terminal === 'in' ? Promise.resolve(result) : chain)),
    order: jest.fn(() => Promise.resolve(result)),
  };
  return chain;
};

const setupHistoryDb = ({
  participants = [{ trip_id: 'trip-1' }],
  participantsError = null,
  trips = [
    {
      id: 'trip-1',
      destination: 'Krakow',
      start_date: '2025-06-01',
      end_date: '2025-06-03',
      total_budget: 1000,
      image_url: null,
    },
  ],
  tripsError = null,
  days = [
    {
      id: 'day-1',
      trip_id: 'trip-1',
      day_number: 1,
      date: '2025-06-01',
      title: 'Dzien 1',
    },
  ],
  daysError = null,
  activities = [
    {
      id: 'act-1',
      day_id: 'day-1',
      name: 'Wawel',
      time: '2025-06-01T10:00:00',
      type: 'atrakcja',
      description: 'Zwiedzanie',
      location: 'Wawel, Krakow',
      coordinates: null,
      cost: 120,
      duration_minutes: 90,
      order_index: 0,
    },
    {
      id: 'act-2',
      day_id: 'day-1',
      name: 'Obiad',
      time: '2025-06-01T13:00:00',
      type: 'jedzenie',
      description: '',
      location: 'Rynek, Krakow',
      coordinates: null,
      cost: 80,
      duration_minutes: 60,
      order_index: 1,
    },
  ],
  activitiesError = null,
} = {}) => {
  supabaseDbClient.from.mockImplementation((table) => {
    if (table === 'trip_participants') {
      return makeDbChain({ data: participants, error: participantsError }, 'eq');
    }
    if (table === 'trips') {
      return makeDbChain({ data: trips, error: tripsError }, 'in');
    }
    if (table === 'trip_days') {
      return makeDbChain({ data: days, error: daysError }, 'in');
    }
    if (table === 'activities') {
      const chain = {
        select: jest.fn(() => chain),
        in: jest.fn(() => chain),
        order: jest.fn(() => Promise.resolve({ data: activities, error: activitiesError })),
      };
      return chain;
    }
    return makeDbChain({ data: null, error: null }, 'eq');
  });
};

describe('GET /api/trip/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – zwraca historie z dniami, aktywnosciami i suma kosztow', async () => {
    withValidAuth();
    setupHistoryDb();

    const res = await request(app)
      .get('/api/trip/history')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.trips).toHaveLength(1);
    expect(res.body.trips[0].destination).toBe('Krakow');
    expect(res.body.trips[0].total).toBe(200);
    expect(res.body.trips[0].days).toHaveLength(1);
    expect(res.body.trips[0].days[0].activities).toHaveLength(2);
    expect(res.body.trips[0].days[0].activities[0].cost).toBe(120);
  });

  it('200 – pusta lista gdy uzytkownik nie uczestniczy w zadnej wycieczce', async () => {
    withValidAuth();
    setupHistoryDb({ participants: [] });

    const res = await request(app)
      .get('/api/trip/history')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.trips).toEqual([]);
  });

  it('401 – brak naglowka Authorization', async () => {
    const res = await request(app).get('/api/trip/history');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('token');
  });

  it('401 – niepoprawny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .get('/api/trip/history')
      .set('Authorization', 'Bearer zly-token');

    expect(res.status).toBe(401);
  });

  it('500 – blad odczytu uczestnictw z bazy', async () => {
    withValidAuth();
    setupHistoryDb({
      participantsError: { message: 'db read failed' },
    });

    const res = await request(app)
      .get('/api/trip/history')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('uczestnictwa');
  });
});
