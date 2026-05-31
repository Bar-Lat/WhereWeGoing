/**
 * TESTY INTEGRACYJNE – /api/friends
 *
 * Testy sprawdzają pobieranie, wyszukiwanie, dodawanie i usuwanie znajomych.
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

jest.mock('../../repositories/friends.repository', () => ({
  getFriendRowsByProfileId: jest.fn(),
  getFriendRowsBetweenProfiles: jest.fn(),
  getProfilesByIds: jest.fn(),
  getProfileById: jest.fn(),
  searchProfiles: jest.fn(),
  addFriendRow: jest.fn(),
  deleteFriendRows: jest.fn(),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const friendsRepository = require('../../repositories/friends.repository');

const USER = { id: 'user-1', email: 'alan@example.com' };
const FRIEND_PROFILE = {
  id: 'friend-1',
  first_name: 'Karol',
  last_name: 'Kutyna',
  avatar: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

const withInvalidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({ data: null, error: { message: 'invalid token' } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/friends', () => {
  it('200 – zwraca listę znajomych zalogowanego użytkownika', async () => {
    withValidAuth();
    friendsRepository.getFriendRowsByProfileId.mockResolvedValue({
      data: [{ id: 'rel-1', profile_id: USER.id, friendProfile_id: FRIEND_PROFILE.id }],
      error: null,
    });
    friendsRepository.getProfilesByIds.mockResolvedValue({ data: [FRIEND_PROFILE], error: null });

    const res = await request(app)
      .get('/api/friends')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.profileCode).toBe(USER.id);
    expect(res.body.friends[0]).toMatchObject({
      id: FRIEND_PROFILE.id,
      relationId: 'rel-1',
      displayName: 'Karol Kutyna',
    });
  });

  it('401 – brak tokenu', async () => {
    const res = await request(app).get('/api/friends');

    expect(res.status).toBe(401);
  });

  it('401 – niepoprawny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .get('/api/friends')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('500 – błąd pobierania relacji znajomych', async () => {
    withValidAuth();
    friendsRepository.getFriendRowsByProfileId.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await request(app)
      .get('/api/friends')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/friends/search', () => {
  it('200 – dla zbyt krótkiej frazy zwraca pustą listę', async () => {
    withValidAuth();

    const res = await request(app)
      .get('/api/friends/search?query=a')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('200 – wyszukuje użytkowników i wyklucza obecnych znajomych', async () => {
    withValidAuth();
    friendsRepository.getFriendRowsByProfileId.mockResolvedValue({
      data: [{ id: 'rel-old', profile_id: USER.id, friendProfile_id: 'already-friend' }],
      error: null,
    });
    friendsRepository.searchProfiles.mockResolvedValue({ data: [FRIEND_PROFILE], error: null });

    const res = await request(app)
      .get('/api/friends/search?query=Karol')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(friendsRepository.searchProfiles).toHaveBeenCalledWith('Karol', USER.id, ['already-friend']);
    expect(res.body.results[0].displayName).toBe('Karol Kutyna');
  });
});

describe('POST /api/friends', () => {
  it('201 – dodaje znajomego i relację zwrotną', async () => {
    withValidAuth();
    friendsRepository.getProfileById.mockResolvedValue({ data: FRIEND_PROFILE, error: null });
    friendsRepository.getFriendRowsBetweenProfiles
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    friendsRepository.addFriendRow
      .mockResolvedValueOnce({ data: { id: 'rel-forward' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'rel-backward' }, error: null });

    const res = await request(app)
      .post('/api/friends')
      .set('Authorization', 'Bearer valid-token')
      .send({ friendProfileId: FRIEND_PROFILE.id });

    expect(res.status).toBe(201);
    expect(res.body.friend.id).toBe(FRIEND_PROFILE.id);
    expect(friendsRepository.addFriendRow).toHaveBeenCalledTimes(2);
    expect(friendsRepository.addFriendRow).toHaveBeenNthCalledWith(1, USER.id, FRIEND_PROFILE.id);
    expect(friendsRepository.addFriendRow).toHaveBeenNthCalledWith(2, FRIEND_PROFILE.id, USER.id);
  });

  it('400 – nie pozwala dodać samego siebie', async () => {
    withValidAuth();

    const res = await request(app)
      .post('/api/friends')
      .set('Authorization', 'Bearer valid-token')
      .send({ friendProfileId: USER.id });

    expect(res.status).toBe(400);
  });

  it('404 – profil znajomego nie istnieje', async () => {
    withValidAuth();
    friendsRepository.getProfileById.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post('/api/friends')
      .set('Authorization', 'Bearer valid-token')
      .send({ friendProfileId: 'missing-profile' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/friends/:friendProfileId', () => {
  it('200 – usuwa znajomego w obu kierunkach', async () => {
    withValidAuth();
    friendsRepository.deleteFriendRows
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .delete('/api/friends/friend-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(friendsRepository.deleteFriendRows).toHaveBeenCalledTimes(2);
    expect(friendsRepository.deleteFriendRows).toHaveBeenNthCalledWith(1, USER.id, 'friend-1');
    expect(friendsRepository.deleteFriendRows).toHaveBeenNthCalledWith(2, 'friend-1', USER.id);
  });

  it('500 – błąd usuwania relacji znajomości', async () => {
    withValidAuth();
    friendsRepository.deleteFriendRows
      .mockResolvedValueOnce({ error: { message: 'DB error' } })
      .mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .delete('/api/friends/friend-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });
});
