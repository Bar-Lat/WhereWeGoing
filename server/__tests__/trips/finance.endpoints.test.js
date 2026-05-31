/**
 * TESTY INTEGRACYJNE – finanse wycieczki
 *
 * Harmonogram, uczestnicy, podzial kosztow po CRUD aktywnosci.
 * Repozytoria i Supabase Auth są mockowane.
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
  getTripsByOwnerId: jest.fn(),
  getTripById: jest.fn(),
  getTripsByIds: jest.fn(),
  deleteTripById: jest.fn(),
}));

jest.mock('../../repositories/tripParticipants.repository', () => ({
  getParticipantsByTripId: jest.fn(),
  getParticipantsByTripIds: jest.fn(),
  getParticipantsByUserId: jest.fn(),
  getParticipantByTripAndUser: jest.fn(),
  addParticipant: jest.fn(),
  deleteParticipant: jest.fn(),
  updateAllParticipantsAmountOwed: jest.fn(),
}));

jest.mock('../../repositories/activities.repository', () => ({
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

jest.mock('../../repositories/tripDays.repository', () => ({
  getTripDaysByTripId: jest.fn(),
  getTripDayById: jest.fn(),
}));

jest.mock('../../repositories/friends.repository', () => ({
  getFriendRowsBetweenProfiles: jest.fn(),
  getProfileById: jest.fn(),
  getProfilesByIds: jest.fn(),
}));

jest.mock('../../controllers/friends.controller', () => ({
  ...jest.requireActual('../../controllers/friends.controller'),
  resolveAvatarUrl: jest.fn(async (avatar) => avatar),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const { getTripById } = require('../../repositories/trip.repository');
const {
  getParticipantsByTripId,
  getParticipantByTripAndUser,
  updateAllParticipantsAmountOwed,
} = require('../../repositories/tripParticipants.repository');
const {
  getActivitiesTotalCostByTripId,
  getActivitiesByTripId,
  getNextOrderIndexForDay,
  createActivity,
  deleteActivityById,
  getActivityWithDay,
} = require('../../repositories/activities.repository');
const { getTripDaysByTripId, getTripDayById } = require('../../repositories/tripDays.repository');
const { getProfilesByIds } = require('../../repositories/friends.repository');

const OWNER_ID = 'user-owner-123';
const PARTICIPANT_ID = 'user-participant-456';
const TRIP_ID = 'trip-finance-1';
const DAY_ID = 'day-finance-1';
const ACTIVITY_ID = 'act-finance-1';

const TRIP_ROW = {
  id: TRIP_ID,
  owner_id: OWNER_ID,
  destination: 'Gdansk',
  start_date: '2025-07-01',
  end_date: '2025-07-03',
  total_budget: 2000,
  status: 'planned',
  image_url: null,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const DAY_ROW = {
  id: DAY_ID,
  trip_id: TRIP_ID,
  day_number: 1,
  date: '2025-07-01',
  title: 'Dzien 1',
};

const SCHEDULE_ACTIVITIES = [
  {
    id: ACTIVITY_ID,
    day_id: DAY_ID,
    time: '2025-07-01T10:00:00',
    name: 'Muzeum',
    type: 'atrakcja',
    description: '',
    location: 'Gdansk',
    coordinates: null,
    cost: 200,
    duration_minutes: 90,
    order_index: 0,
  },
  {
    id: 'act-finance-2',
    day_id: DAY_ID,
    time: '2025-07-01T14:00:00',
    name: 'Obiad',
    type: 'jedzenie',
    description: '',
    location: 'Gdansk',
    coordinates: null,
    cost: 100,
    duration_minutes: 60,
    order_index: 1,
  },
];

const PARTICIPANT_ROWS = [
  { id: 'part-1', trip_id: TRIP_ID, user_id: OWNER_ID, role: 'owner', amount_owed: 150, currency: 'PLN' },
  { id: 'part-2', trip_id: TRIP_ID, user_id: PARTICIPANT_ID, role: 'participant', amount_owed: 150, currency: 'PLN' },
];

const PROFILE_ROWS = [
  { id: OWNER_ID, first_name: 'Jan', last_name: 'Kowalski', avatar: null },
  { id: PARTICIPANT_ID, first_name: 'Anna', last_name: 'Nowak', avatar: null },
];

const withValidAuth = (userId = OWNER_ID) =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  });

const setupFinanceMocks = () => {
  getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });
  getParticipantByTripAndUser.mockResolvedValue({ data: null, error: null });
  getTripDaysByTripId.mockResolvedValue({ data: [DAY_ROW], error: null });
  getTripDayById.mockResolvedValue({ data: DAY_ROW, error: null });
  getActivitiesByTripId.mockResolvedValue({ data: SCHEDULE_ACTIVITIES, error: null });
  getActivitiesTotalCostByTripId.mockResolvedValue({ total: 300, error: null });
  getParticipantsByTripId.mockResolvedValue({ data: PARTICIPANT_ROWS, error: null });
  getProfilesByIds.mockResolvedValue({ data: PROFILE_ROWS, error: null });
  updateAllParticipantsAmountOwed.mockResolvedValue({ error: null });
};

describe('GET /api/trip/:id/schedule – koszty planu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFinanceMocks();
  });

  it('200 – zwraca totalCost z sumy kosztow aktywnosci', async () => {
    withValidAuth();

    const res = await request(app)
      .get(`/api/trip/${TRIP_ID}/schedule`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.totalCost).toBe(300);
    expect(res.body.days[0].activities).toHaveLength(2);
    expect(res.body.accessRole).toBe('owner');
  });

  it('401 – brak autoryzacji', async () => {
    const res = await request(app).get(`/api/trip/${TRIP_ID}/schedule`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/trip/:id/participants – podzial kosztow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFinanceMocks();
  });

  it('200 – zwraca uczestnikow z kwota amountOwed', async () => {
    withValidAuth();

    const res = await request(app)
      .get(`/api/trip/${TRIP_ID}/participants`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.participants[0].amountOwed).toBe(150);
    expect(res.body.participants[1].amountOwed).toBe(150);
  });
});

describe('POST /api/trip/:id/days/:dayId/activities – dodanie kosztu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFinanceMocks();
    getNextOrderIndexForDay.mockResolvedValue({ orderIndex: 2, error: null });
    createActivity.mockResolvedValue({
      data: {
        id: 'act-new',
        day_id: DAY_ID,
        time: '2025-07-01T18:00:00',
        name: 'Kolacja',
        type: 'jedzenie',
        description: '',
        location: 'Gdansk',
        coordinates: null,
        cost: 150,
        duration_minutes: 60,
        order_index: 2,
      },
      error: null,
    });
    getActivitiesTotalCostByTripId.mockResolvedValue({ total: 450, error: null });
    getActivitiesByTripId.mockResolvedValue({
      data: [
        ...SCHEDULE_ACTIVITIES,
        {
          id: 'act-new',
          day_id: DAY_ID,
          time: '2025-07-01T18:00:00',
          name: 'Kolacja',
          type: 'jedzenie',
          description: '',
          location: 'Gdansk',
          coordinates: null,
          cost: 150,
          duration_minutes: 60,
          order_index: 2,
        },
      ],
      error: null,
    });
  });

  it('201 – dodaje aktywnosc i przelicza amountPerPerson', async () => {
    withValidAuth();

    const res = await request(app)
      .post(`/api/trip/${TRIP_ID}/days/${DAY_ID}/activities`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Kolacja',
        time: '18:00',
        cost: 150,
        durationMinutes: 60,
        category: 'jedzenie',
      });

    expect(res.status).toBe(201);
    expect(res.body.totalCost).toBe(450);
    expect(res.body.amountPerPerson).toBe(225);
    expect(updateAllParticipantsAmountOwed).toHaveBeenCalledWith(TRIP_ID, 225);
  });

  it('403 – uczestnik nie moze dodawac aktywnosci', async () => {
    withValidAuth(PARTICIPANT_ID);
    getParticipantByTripAndUser.mockResolvedValue({
      data: { id: 'part-2', user_id: PARTICIPANT_ID },
      error: null,
    });

    const res = await request(app)
      .post(`/api/trip/${TRIP_ID}/days/${DAY_ID}/activities`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Kolacja', time: '18:00', cost: 150 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/trip/:id/activities/:activityId – usuniecie kosztu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFinanceMocks();
    getActivityWithDay.mockResolvedValue({
      activity: SCHEDULE_ACTIVITIES[0],
      day: DAY_ROW,
      error: null,
    });
    deleteActivityById.mockResolvedValue({ error: null });
    getActivitiesTotalCostByTripId.mockResolvedValue({ total: 100, error: null });
    getActivitiesByTripId.mockResolvedValue({
      data: [SCHEDULE_ACTIVITIES[1]],
      error: null,
    });
  });

  it('200 – usuwa aktywnosc i przelicza podzial kosztow', async () => {
    withValidAuth();

    const res = await request(app)
      .delete(`/api/trip/${TRIP_ID}/activities/${ACTIVITY_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.totalCost).toBe(100);
    expect(res.body.amountPerPerson).toBe(50);
    expect(updateAllParticipantsAmountOwed).toHaveBeenCalledWith(TRIP_ID, 50);
  });
});
