/**
 * TESTY INTEGRACYJNE – uczestnicy podróży
 *
 * Testy sprawdzają powiązanie listy znajomych z wycieczkami:
 * podgląd uczestników, dodawanie znajomego do wyjazdu i usuwanie uczestnika.
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

jest.mock('../../repositories/trip.repository', () => ({
  createTrip: jest.fn(),
  getTripsByOwnerId: jest.fn(),
  getTripsByIds: jest.fn(),
  getTripById: jest.fn(),
  deleteTripById: jest.fn(),
  updateTripById: jest.fn(),
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

jest.mock('../../repositories/friends.repository', () => ({
  getFriendRowsByProfileId: jest.fn(),
  getFriendRowsBetweenProfiles: jest.fn(),
  getProfilesByIds: jest.fn(),
  getProfileById: jest.fn(),
  searchProfiles: jest.fn(),
  addFriendRow: jest.fn(),
  deleteFriendRows: jest.fn(),
}));

jest.mock('../../repositories/activities.repository', () => ({
  getActivitiesTotalCostByTripId: jest.fn(),
  getActivitiesTotalCostsByTripIds: jest.fn(),
  getActivitiesByTripId: jest.fn(),
  getActivitiesByDayId: jest.fn(),
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
  createTripDays: jest.fn(),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const tripRepository = require('../../repositories/trip.repository');
const participantsRepository = require('../../repositories/tripParticipants.repository');
const friendsRepository = require('../../repositories/friends.repository');
const activitiesRepository = require('../../repositories/activities.repository');

const OWNER = { id: 'owner-1', email: 'owner@example.com' };
const GUEST = { id: 'guest-1', email: 'guest@example.com' };
const TRIP = {
  id: 'trip-1',
  owner_id: OWNER.id,
  destination: 'Amsterdam',
  start_date: '2026-06-01',
  end_date: '2026-06-05',
  total_budget: 1000,
  status: 'planned',
  image_url: null,
  notes: '',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
};

const OWNER_PROFILE = { id: OWNER.id, first_name: 'Alan', last_name: 'Kycinski', avatar: null };
const GUEST_PROFILE = { id: GUEST.id, first_name: 'Karol', last_name: 'Kutyna', avatar: null };

const withUser = (user) =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

const mockParticipantsList = () => {
  participantsRepository.getParticipantsByTripId.mockResolvedValue({
    data: [
      { id: 'part-owner', trip_id: TRIP.id, user_id: OWNER.id, role: 'owner', amount_owed: 500, currency: 'PLN' },
      { id: 'part-guest', trip_id: TRIP.id, user_id: GUEST.id, role: 'participant', amount_owed: 500, currency: 'PLN' },
    ],
    error: null,
  });
  friendsRepository.getProfilesByIds.mockResolvedValue({ data: [OWNER_PROFILE, GUEST_PROFILE], error: null });
};

beforeEach(() => {
  jest.clearAllMocks();
  activitiesRepository.getActivitiesTotalCostByTripId.mockResolvedValue({ total: 1000, error: null });
  participantsRepository.updateAllParticipantsAmountOwed.mockResolvedValue({ error: null });
});

describe('GET /api/trip/:id/participants', () => {
  it('200 – właściciel widzi listę uczestników i rolę owner', async () => {
    withUser(OWNER);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });
    mockParticipantsList();

    const res = await request(app)
      .get('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.accessRole).toBe('owner');
    expect(res.body.count).toBe(2);
    expect(res.body.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ profileId: OWNER.id, isOwner: true }),
        expect.objectContaining({ profileId: GUEST.id, role: 'participant' }),
      ])
    );
  });

  it('200 – zwykły uczestnik może podejrzeć listę uczestników', async () => {
    withUser(GUEST);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });
    participantsRepository.getParticipantByTripAndUser.mockResolvedValue({
      data: { id: 'part-guest', trip_id: TRIP.id, user_id: GUEST.id },
      error: null,
    });
    mockParticipantsList();

    const res = await request(app)
      .get('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.accessRole).toBe('participant');
  });

  it('403 – użytkownik spoza wycieczki nie ma dostępu', async () => {
    withUser({ id: 'stranger-1' });
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });
    participantsRepository.getParticipantByTripAndUser.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .get('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});

describe('POST /api/trip/:id/participants', () => {
  it('201 – właściciel dodaje znajomego jako uczestnika podróży', async () => {
    withUser(OWNER);
    tripRepository.getTripById
      .mockResolvedValueOnce({ data: TRIP, error: null })
      .mockResolvedValueOnce({ data: TRIP, error: null });
    friendsRepository.getProfileById.mockResolvedValue({ data: GUEST_PROFILE, error: null });
    friendsRepository.getFriendRowsBetweenProfiles.mockResolvedValue({ data: [{ id: 'friend-rel' }], error: null });
    participantsRepository.getParticipantByTripAndUser.mockResolvedValue({ data: null, error: null });
    participantsRepository.addParticipant.mockResolvedValue({
      data: { id: 'part-guest', trip_id: TRIP.id, user_id: GUEST.id, role: 'participant' },
      error: null,
    });
    mockParticipantsList();

    const res = await request(app)
      .post('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token')
      .send({ profileId: GUEST.id });

    expect(res.status).toBe(201);
    expect(res.body.participant.profileId).toBe(GUEST.id);
    expect(participantsRepository.addParticipant).toHaveBeenCalledWith({ tripId: TRIP.id, userId: GUEST.id });
    expect(participantsRepository.updateAllParticipantsAmountOwed).toHaveBeenCalledWith(TRIP.id, 500);
  });

  it('403 – uczestnik nie może dodawać innych osób', async () => {
    withUser(GUEST);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });

    const res = await request(app)
      .post('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token')
      .send({ profileId: 'new-person' });

    expect(res.status).toBe(403);
  });

  it('400 – do wycieczki można dodać tylko znajomego', async () => {
    withUser(OWNER);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });
    friendsRepository.getProfileById.mockResolvedValue({ data: GUEST_PROFILE, error: null });
    friendsRepository.getFriendRowsBetweenProfiles.mockResolvedValue({ data: [], error: null });

    const res = await request(app)
      .post('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token')
      .send({ profileId: GUEST.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('znajomych');
  });

  it('409 – nie pozwala dodać tej samej osoby drugi raz', async () => {
    withUser(OWNER);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });
    friendsRepository.getProfileById.mockResolvedValue({ data: GUEST_PROFILE, error: null });
    friendsRepository.getFriendRowsBetweenProfiles.mockResolvedValue({ data: [{ id: 'friend-rel' }], error: null });
    participantsRepository.getParticipantByTripAndUser.mockResolvedValue({ data: { id: 'part-guest' }, error: null });

    const res = await request(app)
      .post('/api/trip/trip-1/participants')
      .set('Authorization', 'Bearer valid-token')
      .send({ profileId: GUEST.id });

    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/trip/:id/participants/:profileId', () => {
  it('200 – właściciel usuwa uczestnika i przelicza koszty', async () => {
    withUser(OWNER);
    tripRepository.getTripById
      .mockResolvedValueOnce({ data: TRIP, error: null })
      .mockResolvedValueOnce({ data: TRIP, error: null });
    participantsRepository.deleteParticipant.mockResolvedValue({ error: null });
    mockParticipantsList();

    const res = await request(app)
      .delete('/api/trip/trip-1/participants/guest-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(participantsRepository.deleteParticipant).toHaveBeenCalledWith(TRIP.id, GUEST.id);
    expect(res.body.message).toContain('usuniety');
  });

  it('400 – nie można usunąć właściciela wycieczki', async () => {
    withUser(OWNER);
    tripRepository.getTripById.mockResolvedValue({ data: TRIP, error: null });

    const res = await request(app)
      .delete('/api/trip/trip-1/participants/owner-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(participantsRepository.deleteParticipant).not.toHaveBeenCalled();
  });
});
