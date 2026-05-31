/**
 * TESTY INTEGRACYJNE – trasy /api/trip
 *
 * Zakres: Wyświetlanie wycieczek, harmonogramu, dodawanie/usuwanie z harmonogramu, usuwanie wycieczki.
 * Supabase i repozytoria są mockowane.
 */

const request = require('supertest');

// ── MOCKI SUPABASE ───────────────────────────────────────────────────────────
jest.mock('../../configs/supabaseClient', () => ({
  supabaseAuthClient: {
    auth: { getUser: jest.fn() },
  },
  supabaseDbClient: {
    from: jest.fn(),
  },
}));

// ── MOCKI KONTROLERÓW Z INNYCH MODUŁÓW ───────────────────────────────────────
jest.mock('../../controllers/auth.controller', () => ({
  register: jest.fn(),
  login: jest.fn(),
  refreshSession: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('../../controllers/friends.controller', () => ({
  getMyFriends: jest.fn(),
  searchFriendCandidates: jest.fn(),
  addFriend: jest.fn(),
  removeFriend: jest.fn(),
  resolveAvatarUrl: jest.fn((url) => Promise.resolve(url)),
}));

// ── MOCKI REPOZYTORIÓW Z KULOODPORNYMI WARTOŚCIAMI DOMYŚLNYMI ──────────────
jest.mock('../../repositories/trip.repository', () => ({
  getTripsByOwnerId: jest.fn().mockResolvedValue({ data: [], error: null }),
  getTripById: jest.fn().mockResolvedValue({ data: null, error: null }),
  getTripsByIds: jest.fn().mockResolvedValue({ data: [], error: null }),
  deleteTripById: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('../../repositories/tripParticipants.repository', () => ({
  getParticipantsByUserId: jest.fn().mockResolvedValue({ data: [], error: null }),
  getParticipantsByTripIds: jest.fn().mockResolvedValue({ data: [], error: null }),
  getParticipantByTripAndUser: jest.fn().mockResolvedValue({ data: null, error: null }),
  getParticipantsByTripId: jest.fn().mockResolvedValue({ data: [], error: null }),
  updateAllParticipantsAmountOwed: jest.fn().mockResolvedValue({ error: null }), 
}));

jest.mock('../../repositories/activities.repository', () => ({
  getActivitiesTotalCostsByTripIds: jest.fn().mockResolvedValue({ totalsByTripId: {}, error: null }),
  getActivitiesTotalCostByTripId: jest.fn().mockResolvedValue({ total: null, error: null }),
  createActivity: jest.fn().mockResolvedValue({ data: {}, error: null }),
  deleteActivityById: jest.fn().mockResolvedValue({ error: null }),
  getActivityWithDay: jest.fn().mockResolvedValue({ activity: null, day: null, error: null }),
  getNextOrderIndexForDay: jest.fn().mockResolvedValue({ orderIndex: 0, error: null }),
  getActivitiesByTripId: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('../../repositories/tripDays.repository', () => ({
  getTripDayById: jest.fn().mockResolvedValue({ data: null, error: null }),
  getTripDaysByTripId: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('../../repositories/friends.repository', () => ({
  getProfileById: jest.fn().mockResolvedValue({ data: null, error: null }),
  getFriendRowsBetweenProfiles: jest.fn().mockResolvedValue({ data: [], error: null }),
  getProfilesByIds: jest.fn().mockResolvedValue({ data: [], error: null }), // <--- TO MUSIMY DODAĆ
}));

// ── IMPORTY ──────────────────────────────────────────────────────────────────
const app = require('../../server'); 
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const tripRepo = require('../../repositories/trip.repository');
const participantRepo = require('../../repositories/tripParticipants.repository');
const activityRepo = require('../../repositories/activities.repository');
const daysRepo = require('../../repositories/tripDays.repository');

// ── STAŁE TESTOWE ────────────────────────────────────────────────────────────
const VALID_USER = { id: 'user-abc-123', email: 'jan@example.com' };

const TRIP_ROW = {
  id: 'trip-1',
  owner_id: VALID_USER.id,
  destination: 'Paryż',
  start_date: '2025-05-01',
  end_date: '2025-05-05',
  total_budget: 1000,
  status: 'planned',
};

const DAY_ROW = {
  id: 'day-1',
  trip_id: 'trip-1',
  day_number: 1,
  date: '2025-05-01',
};

const ACTIVITY_ROW = {
  id: 'act-1',
  day_id: 'day-1',
  name: 'Zwiedzanie Luwru',
  time: '2025-05-01T10:00:00',
  type: 'atrakcja',
};

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: { user: VALID_USER },
    error: null,
  });

// ============================================================
// GET /api/trip - Lista wycieczek
// ============================================================
describe('GET /api/trip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 – zwraca znormalizowaną listę wycieczek użytkownika', async () => {
    withValidAuth();
    tripRepo.getTripsByOwnerId.mockResolvedValue({ data: [TRIP_ROW], error: null });
    participantRepo.getParticipantsByTripIds.mockResolvedValue({ data: [{ trip_id: 'trip-1', user_id: VALID_USER.id }], error: null });

    const res = await request(app).get('/api/trip').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.trips).toBeInstanceOf(Array);
    expect(res.body.trips[0].destination).toBe('Paryż');
  });

  it('401 – brak nagłówka Authorization', async () => {
    const res = await request(app).get('/api/trip');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// GET /api/trip/:id - Wyświetlanie szczegółów wycieczki
// ============================================================
describe('GET /api/trip/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 – zwraca szczegóły wycieczki dla uprawnionego użytkownika', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });

    const res = await request(app).get('/api/trip/trip-1').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.trip.destination).toBe('Paryż');
    expect(res.body.trip.accessRole).toBe('owner');
  });

  it('403 – brak dostępu do wycieczki (nie jest właścicielem ani uczestnikiem)', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: { ...TRIP_ROW, owner_id: 'inny-owner' }, error: null });
    participantRepo.getParticipantByTripAndUser.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get('/api/trip/trip-1').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Brak dostepu');
  });

  it('404 – wycieczka nie istnieje', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get('/api/trip/non-existent').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

// ============================================================
// DELETE /api/trip/:id - Usuwanie wycieczki
// ============================================================
describe('DELETE /api/trip/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 – poprawnie usuwa wycieczkę przez właściciela', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });
    tripRepo.deleteTripById.mockResolvedValue({ error: null });

    const res = await request(app).delete('/api/trip/trip-1').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('usunieta');
    expect(tripRepo.deleteTripById).toHaveBeenCalledWith('trip-1');
  });

  it('403 – próba usunięcia wycieczki przez osobę niebędącą właścicielem', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: { ...TRIP_ROW, owner_id: 'inny-owner' }, error: null });

    const res = await request(app).delete('/api/trip/trip-1').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Tylko wlasciciel');
  });
});

// ============================================================
// POST /api/trip/:id/days/:dayId/activities - Dodawanie aktywności
// ============================================================
describe('POST /api/trip/:id/days/:dayId/activities', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 – poprawnie dodaje aktywność do harmonogramu', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });
    daysRepo.getTripDayById.mockResolvedValue({ data: DAY_ROW, error: null });
    activityRepo.createActivity.mockResolvedValue({ data: ACTIVITY_ROW, error: null });
    activityRepo.getNextOrderIndexForDay.mockResolvedValue({ orderIndex: 1, error: null });

    const res = await request(app)
      .post('/api/trip/trip-1/days/day-1/activities')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Zwiedzanie Luwru', time: '10:00' });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('dodana');
    expect(activityRepo.createActivity).toHaveBeenCalled();
  });

  it('403 – próba dodania aktywności przez osobę niebędącą właścicielem', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: { ...TRIP_ROW, owner_id: 'inny-owner' }, error: null });

    const res = await request(app)
      .post('/api/trip/trip-1/days/day-1/activities')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Luwr', time: '10:00' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Tylko wlasciciel moze edytowac');
  });
});

// ============================================================
// DELETE /api/trip/:id/activities/:activityId - Usuwanie aktywności
// ============================================================
describe('DELETE /api/trip/:id/activities/:activityId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 – poprawnie usuwa aktywność z harmonogramu', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });
    activityRepo.getActivityWithDay.mockResolvedValue({ activity: ACTIVITY_ROW, day: DAY_ROW, error: null });
    activityRepo.deleteActivityById.mockResolvedValue({ error: null });

    const res = await request(app)
      .delete('/api/trip/trip-1/activities/act-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('usunieta');
    expect(activityRepo.deleteActivityById).toHaveBeenCalledWith('act-1');
  });

  it('404 – aktywność nie znaleziona', async () => {
    withValidAuth();
    tripRepo.getTripById.mockResolvedValue({ data: TRIP_ROW, error: null });
    activityRepo.getActivityWithDay.mockResolvedValue({ activity: null, day: null, error: null });

    const res = await request(app)
      .delete('/api/trip/trip-1/activities/non-existent-act')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Nie znaleziono');
  });
});