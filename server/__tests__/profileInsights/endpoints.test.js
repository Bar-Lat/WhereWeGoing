/**
 * TESTY INTEGRACYJNE – /api/profile/stats i /api/profile/achievements
 */

const request = require('supertest');

jest.mock('../../configs/supabaseClient', () => ({
  supabaseAuthClient: {
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
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

jest.mock('../../repositories/profileInsights.repository', () => ({
  getTripsByOwnerId: jest.fn(),
  getTripDaysByTripIds: jest.fn(),
  getActivitiesByDayIds: jest.fn(),
  getFriendRowsByProfileId: jest.fn(),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const insightsRepository = require('../../repositories/profileInsights.repository');

const USER = { id: 'user-1', email: 'alan@example.com' };

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

const mockStatsData = () => {
  insightsRepository.getTripsByOwnerId.mockResolvedValue({
    data: [
      { id: 'trip-1', total_budget: 1000, status: 'planned' },
      { id: 'trip-2', total_budget: 4500, status: 'finished' },
    ],
    error: null,
  });
  insightsRepository.getTripDaysByTripIds.mockResolvedValue({
    data: [{ id: 'day-1' }, { id: 'day-2' }, { id: 'day-3' }],
    error: null,
  });
  insightsRepository.getActivitiesByDayIds.mockResolvedValue({
    data: [{ id: 'activity-1' }, { id: 'activity-2' }, { id: 'activity-3' }, { id: 'activity-4' }, { id: 'activity-5' }],
    error: null,
  });
  insightsRepository.getFriendRowsByProfileId.mockResolvedValue({
    data: [
      { id: 'rel-1', friendProfile_id: 'friend-1' },
      { id: 'rel-2', friendProfile_id: 'friend-2' },
      { id: 'rel-3', friendProfile_id: 'friend-2' },
    ],
    error: null,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/profile/stats', () => {
  it('200 – zwraca statystyki profilu wyliczone z podróży, dni, aktywności i znajomych', async () => {
    withValidAuth();
    mockStatsData();

    const res = await request(app)
      .get('/api/profile/stats')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({
      tripsCount: 2,
      friendsCount: 2,
      tripDaysCount: 3,
      activitiesCount: 5,
      plannedTripsCount: 1,
      totalBudget: 5500,
    });
  });

  it('401 – brak tokenu', async () => {
    const res = await request(app).get('/api/profile/stats');

    expect(res.status).toBe(401);
  });

  it('500 – błąd pobierania podróży do statystyk', async () => {
    withValidAuth();
    insightsRepository.getTripsByOwnerId.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await request(app)
      .get('/api/profile/stats')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/profile/achievements', () => {
  it('200 – zwraca osiągnięcia odblokowane i nieodblokowane', async () => {
    withValidAuth();
    mockStatsData();

    const res = await request(app)
      .get('/api/profile/achievements')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.achievements)).toBe(true);
    expect(res.body.achievements.length).toBeGreaterThan(0);
    expect(res.body.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'first-trip', isUnlocked: true }),
        expect.objectContaining({ id: 'social-traveler', isUnlocked: true }),
        expect.objectContaining({ id: 'globtrotter', isUnlocked: false }),
      ])
    );
  });
});
