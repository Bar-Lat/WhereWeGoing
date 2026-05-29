/**
 * TESTY INTEGRACYJNE – trasy /api/profile
 *
 * Supabase i repozytorium profilu są mockowane – żadne połączenia
 * sieciowe ani bazodanowe nie są nawiązywane.
 */

const request = require('supertest');

// ── MOCKI ────────────────────────────────────────────────────────────────────

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

// ── IMPORTY po mockach ───────────────────────────────────────────────────────

const app = require('../../server');
const { supabaseAuthClient, supabaseDbClient } = require('../../configs/supabaseClient');
const { getUserProfileById, upsertUserProfile } = require('../../repositories/profile.repository');

// ── STAŁE TESTOWE ────────────────────────────────────────────────────────────

const VALID_USER = { id: 'user-abc-123', email: 'jan@example.com' };

const PROFILE_ROW = {
  id: VALID_USER.id,
  first_name: 'Jan',
  last_name: 'Kowalski',
  avatar: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Mock bucket storage (dla avatar uploadu)
const mockBucket = {
  upload: jest.fn(),
  createSignedUrl: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

// Skrócone helpersy
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

// ============================================================
// GET /api/profile/me
// ============================================================

describe('GET /api/profile/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – zwraca profil zalogowanego użytkownika', async () => {
    withValidAuth();
    getUserProfileById.mockResolvedValue({ data: PROFILE_ROW, error: null });

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(VALID_USER.id);
    expect(res.body.profile.email).toBe(VALID_USER.email);
    expect(res.body.profile.firstName).toBe('Jan');
    expect(res.body.profile.lastName).toBe('Kowalski');
    expect(res.body.profile.avatar).toBeNull();
  });

  it('401 – brak nagłówka Authorization', async () => {
    const res = await request(app).get('/api/profile/me');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('token');
  });

  it('401 – niepoprawny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer zly-token');

    expect(res.status).toBe(401);
  });

  it('401 – brak prefiksu Bearer', async () => {
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'tylko-token-bez-bearer');

    expect(res.status).toBe(401);
  });

  it('500 – błąd odczytu profilu z DB', async () => {
    withValidAuth();
    getUserProfileById.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });

  it('200 – avatar zwracany jako signed URL gdy bucket nie jest publiczny', async () => {
    withValidAuth();
    const profileWithAvatar = { ...PROFILE_ROW, avatar: 'user-abc-123/1234567890-abcdef.jpg' };
    getUserProfileById.mockResolvedValue({ data: profileWithAvatar, error: null });
    supabaseDbClient.storage.from.mockReturnValue({
      ...mockBucket,
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.example.com/signed-url' },
        error: null,
      }),
    });

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.profile.avatar).toBe('https://supabase.example.com/signed-url');
  });
});

// ============================================================
// PATCH /api/profile/me
// ============================================================

describe('PATCH /api/profile/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – profil zaktualizowany poprawnie', async () => {
    withValidAuth();
    getUserProfileById
      .mockResolvedValueOnce({ data: PROFILE_ROW, error: null })  // odczyt przed zapisem
      .mockResolvedValueOnce({ data: { ...PROFILE_ROW, first_name: 'Adam', last_name: 'Nowak' }, error: null }); // odczyt po zapisie
    upsertUserProfile.mockResolvedValue({ error: null });

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ firstName: 'Adam', lastName: 'Nowak' });

    expect(res.status).toBe(200);
    expect(res.body.profile.firstName).toBe('Adam');
    expect(res.body.profile.lastName).toBe('Nowak');
  });

  it('400 – brak obu pól (puste body)', async () => {
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('profilu');
  });

  it('400 – firstName jest liczbą', async () => {
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ firstName: 99 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('tekst');
  });

  it('400 – firstName przekracza 80 znaków', async () => {
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ firstName: 'x'.repeat(81) });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('długie');
  });

  it('401 – brak tokenu', async () => {
    const res = await request(app)
      .patch('/api/profile/me')
      .send({ firstName: 'Jan' });

    expect(res.status).toBe(401);
  });

  it('401 – nieważny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer zly-token')
      .send({ firstName: 'Jan' });

    expect(res.status).toBe(401);
  });

  it('500 – błąd upsert w DB', async () => {
    withValidAuth();
    getUserProfileById.mockResolvedValue({ data: PROFILE_ROW, error: null });
    upsertUserProfile.mockResolvedValue({ error: { message: 'DB upsert error' } });

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ firstName: 'Jan' });

    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/profile/avatar
// ============================================================

describe('POST /api/profile/avatar', () => {
  // Minimalne PNG 1x1 px jako base64
  const VALID_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    jest.clearAllMocks();
    supabaseDbClient.storage.from.mockReturnValue(mockBucket);
  });

  it('200 – avatar wgrany, profil zwrócony', async () => {
    withValidAuth();
    getUserProfileById
      .mockResolvedValueOnce({ data: PROFILE_ROW, error: null })           // odczyt przed uploadem (poprzedni avatar)
      .mockResolvedValueOnce({ data: { ...PROFILE_ROW, avatar: 'user-abc-123/new.png' }, error: null }); // po upsert
    upsertUserProfile.mockResolvedValue({ error: null });
    mockBucket.upload.mockResolvedValue({ error: null });
    mockBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.example.com/new-avatar.png' },
      error: null,
    });

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.profile.avatar).toBe('https://supabase.example.com/new-avatar.png');
    expect(mockBucket.upload).toHaveBeenCalledTimes(1);
  });

  it('400 – brak base64Data', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ mimeType: 'image/jpeg' });

    expect(res.status).toBe(400);
  });

  it('400 – brak mimeType', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ base64Data: VALID_BASE64 });

    expect(res.status).toBe(400);
  });

  it('400 – niedozwolony format pliku (mimeType: image/gif)', async () => {
    withValidAuth();

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/gif' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Dozwolone formaty');
  });

  it('401 – brak tokenu', async () => {
    const res = await request(app)
      .post('/api/profile/avatar')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('401 – nieważny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer zly-token')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('500 – błąd uploadu do Storage', async () => {
    withValidAuth();
    getUserProfileById.mockResolvedValue({ data: PROFILE_ROW, error: null });
    mockBucket.upload.mockResolvedValue({ error: { message: 'Storage upload error' } });

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/jpeg' });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('avatara');
  });

  it('poprzedni avatar jest usuwany po udanym wgraniu', async () => {
    withValidAuth();
    const profileWithOldAvatar = { ...PROFILE_ROW, avatar: 'user-abc-123/old-avatar.jpg' };
    getUserProfileById
      .mockResolvedValueOnce({ data: profileWithOldAvatar, error: null })
      .mockResolvedValueOnce({ data: { ...PROFILE_ROW, avatar: 'user-abc-123/new-avatar.png' }, error: null });
    upsertUserProfile.mockResolvedValue({ error: null });
    mockBucket.upload.mockResolvedValue({ error: null });
    mockBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.example.com/new.png' },
      error: null,
    });
    mockBucket.remove.mockResolvedValue({ error: null });

    await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', 'Bearer valid-token')
      .send({ base64Data: VALID_BASE64, mimeType: 'image/png' });

    expect(mockBucket.remove).toHaveBeenCalledTimes(1);
    expect(mockBucket.remove).toHaveBeenCalledWith(['user-abc-123/old-avatar.jpg']);
  });
});
