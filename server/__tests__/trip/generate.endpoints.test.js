/**
 * TESTY INTEGRACYJNE – generowanie wycieczki (POST /api/trip/generate)
 *
 * Walidacja formularza, odpowiedz tripPlan (bez zapisu przy generate — zapis w /trip/accept).
 * Wywolanie Groq jest mockowane – szczegoly HTTP w groq.api.test.js.
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

jest.mock('../../repositories/trip.repository', () => ({
  createTrip: jest.fn(),
  getTripsByOwnerId: jest.fn(),
  getTripById: jest.fn(),
  getTripsByIds: jest.fn(),
  deleteTripById: jest.fn(),
  updateTripById: jest.fn(),
}));

jest.mock('../../repositories/tripDays.repository', () => ({
  createTripDays: jest.fn(),
  getTripDaysByTripId: jest.fn(),
  getTripDayById: jest.fn(),
}));

jest.mock('../../repositories/activities.repository', () => ({
  createActivities: jest.fn(),
  getActivitiesTotalCostByTripId: jest.fn(),
  getActivitiesTotalCostsByTripIds: jest.fn(),
  getActivitiesByTripId: jest.fn(),
  getActivityWithDay: jest.fn(),
  getNextOrderIndexForDay: jest.fn(),
  createActivity: jest.fn(),
  updateActivityById: jest.fn(),
  deleteActivityById: jest.fn(),
  updateActivitiesOrder: jest.fn(),
}));

jest.mock('../../utils/activityGeo', () => {
  const actual = jest.requireActual('../../utils/activityGeo');
  return {
    ...actual,
    enrichTripPlanActivities: jest.fn(async (tripPlan) => tripPlan),
    validateTripPlanCoordinates: jest.fn(() => ({
      valid: true,
      message: '',
      missingCoordinates: [],
      missingDurations: [],
    })),
  };
});

jest.mock('../../controllers/friends.controller', () => ({
  ...jest.requireActual('../../controllers/friends.controller'),
  resolveAvatarUrl: jest.fn(async (avatar) => avatar),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const { createTrip } = require('../../repositories/trip.repository');
const { createTripDays } = require('../../repositories/tripDays.repository');
const { createActivities } = require('../../repositories/activities.repository');
const { validateTripPlanCoordinates } = require('../../utils/activityGeo');

const VALID_USER = { id: 'user-generate-123', email: 'jan@example.com' };
const TRIP_ID = 'trip-generate-1';
const DAY_ID = 'day-generate-1';

const VALID_FORM = {
  destination: 'Krakow',
  departureDate: '01.06.2026',
  returnDate: '03.06.2026',
  travelers: 2,
  budget: 2000,
  interests: ['sightseeing'],
  transport: ['walking'],
};

const SAMPLE_TRIP_PLAN = {
  destination: 'Krakow',
  englishDestination: 'Krakow',
  estimatedTotalCost: 1500,
  days: [
    {
      day: 1,
      date: '01.06.2026',
      title: 'Dzien 1',
      estimatedDayCost: 500,
      activities: [
        {
          name: 'Wawel',
          time: '10:00',
          durationMinutes: 90,
          location: 'Wawel, Krakow',
          coordinates: { latitude: 50.054, longitude: 19.935 },
          category: 'atrakcja',
          estimatedCost: 100,
        },
      ],
    },
  ],
};

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: { user: VALID_USER },
    error: null,
  });

const mockGroqSuccess = () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(SAMPLE_TRIP_PLAN) } }],
    }),
  });
};

const setupPersistMocks = () => {
  createTrip.mockResolvedValue({
    data: { id: TRIP_ID },
    error: null,
  });
  createTripDays.mockResolvedValue({
    data: [{ id: DAY_ID, trip_id: TRIP_ID, day_number: 1 }],
    error: null,
  });
  createActivities.mockResolvedValue({ error: null });
};

describe('POST /api/trip/generate – generowanie wycieczki', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-groq-key';
  });

  it('200 – zwraca plan AI; zapis do bazy dopiero w /trip/accept (brak podwójnej wycieczki)', async () => {
    withValidAuth();
    mockGroqSuccess();
    setupPersistMocks();

    const res = await request(app)
      .post('/api/trip/generate')
      .set('Authorization', 'Bearer valid-token')
      .send(VALID_FORM);

    expect(res.status).toBe(200);
    expect(res.body.tripPlan).toBeDefined();
    expect(res.body.tripPlan.destination).toBe('Krakow');
    expect(res.body.tripPlan.days).toHaveLength(1);
    expect(res.body.tripPlan.days[0].activities).toHaveLength(1);
    expect(res.body.tripId).toBeNull();
    expect(createTrip).not.toHaveBeenCalled();
    expect(createTripDays).not.toHaveBeenCalled();
    expect(createActivities).not.toHaveBeenCalled();
  });

  it('200 – bez tokenu plan zwracany, zapis pominiety, tripId null', async () => {
    mockGroqSuccess();

    const res = await request(app).post('/api/trip/generate').send(VALID_FORM);

    expect(res.status).toBe(200);
    expect(res.body.tripPlan).toBeDefined();
    expect(res.body.tripId).toBeNull();
    expect(createTrip).not.toHaveBeenCalled();
    expect(createTripDays).not.toHaveBeenCalled();
    expect(createActivities).not.toHaveBeenCalled();
  });

  it('400 – brak wymaganego pola destination', async () => {
    const { destination, ...body } = VALID_FORM;

    const res = await request(app).post('/api/trip/generate').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Brak wymaganego pola destination');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('400 – brak wymaganego pola departureDate', async () => {
    const { departureDate, ...body } = VALID_FORM;

    const res = await request(app).post('/api/trip/generate').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Brak wymaganego pola departureDate');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('400 – brak wymaganego pola returnDate', async () => {
    const { returnDate, ...body } = VALID_FORM;

    const res = await request(app).post('/api/trip/generate').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Brak wymaganego pola returnDate');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('400 – brak wymaganego pola travelers', async () => {
    const { travelers, ...body } = VALID_FORM;

    const res = await request(app).post('/api/trip/generate').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Brak wymaganego pola travelers');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('400 – brak wymaganego pola budget', async () => {
    const { budget, ...body } = VALID_FORM;

    const res = await request(app).post('/api/trip/generate').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Brak wymaganego pola budget');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('422 – plan AI bez poprawnych wspolrzednych aktywnosci', async () => {
    mockGroqSuccess();
    validateTripPlanCoordinates.mockReturnValueOnce({
      valid: false,
      message: 'Nie udalo sie ustalic wspolrzednych dla: Wawel.',
      missingCoordinates: [{ day: 1, name: 'Wawel' }],
      missingDurations: [],
    });

    const res = await request(app).post('/api/trip/generate').send(VALID_FORM);

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('wspolrzednych');
    expect(createTrip).not.toHaveBeenCalled();
  });

});
