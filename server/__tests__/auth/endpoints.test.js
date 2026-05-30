/**
 * TESTY INTEGRACYJNE – trasy /api/auth
 *
 * Supabase i repozytorium profilu są mockowane – żadne połączenia
 * sieciowe ani bazodanowe nie są nawiązywane.
 */

const request = require('supertest');

// ── MOCKI (muszą być przed pierwszym require modułów aplikacji) ──────────────

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
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const { upsertUserProfile } = require('../../repositories/profile.repository');

// ── DANE TESTOWE ─────────────────────────────────────────────────────────────

const VALID_USER = { id: 'user-abc-123', email: 'jan@example.com' };
const VALID_SESSION = {
  access_token: 'access-token-abc',
  refresh_token: 'refresh-token-abc',
  expires_in: 3600,
};

// ============================================================
// POST /api/auth/register
// ============================================================

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('201 – konto utworzone, profil zapisany', async () => {
    supabaseAuthClient.auth.signUp.mockResolvedValue({
      data: { user: VALID_USER, session: null },
      error: null,
    });
    upsertUserProfile.mockResolvedValue({ error: null });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com', password: 'haslo123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Konto utworzone');
    expect(res.body.user.id).toBe(VALID_USER.id);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('400 – brak email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'haslo123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it('400 – niepoprawny format email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nie-jest-emailem', password: 'haslo123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it('400 – brak hasła', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });

  it('400 – hasło za krótkie (< 6 znaków)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.errors.password).toBeDefined();
  });

  it('409 – email już zarejestrowany (Supabase error)', async () => {
    supabaseAuthClient.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com', password: 'haslo123' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('zarejestrowany');
  });

  it('429 – rate limit Supabase', async () => {
    supabaseAuthClient.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'over_email_send_rate_limit' },
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com', password: 'haslo123' });

    expect(res.status).toBe(429);
  });

  it('500 – błąd zapisu profilu po rejestracji', async () => {
    supabaseAuthClient.auth.signUp.mockResolvedValue({
      data: { user: VALID_USER, session: null },
      error: null,
    });
    upsertUserProfile.mockResolvedValue({ error: { message: 'DB error' } });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'jan@example.com', password: 'haslo123' });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('profilu');
  });
});

// ============================================================
// POST /api/auth/login
// ============================================================

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – zalogowano, zwraca user i session', async () => {
    supabaseAuthClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: VALID_USER, session: VALID_SESSION },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jan@example.com', password: 'haslo123' });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(VALID_USER.id);
    expect(res.body.session.access_token).toBe(VALID_SESSION.access_token);
    expect(res.body.session.refresh_token).toBe(VALID_SESSION.refresh_token);
    expect(res.body.user.password).toBeUndefined();
  });

  it('400 – brak email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'haslo123' });

    expect(res.status).toBe(400);
  });

  it('400 – brak hasła', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jan@example.com' });

    expect(res.status).toBe(400);
  });

  it('400 – niepoprawny email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nie-email', password: 'haslo123' });

    expect(res.status).toBe(400);
  });

  it('401 – złe hasło / email (Supabase error)', async () => {
    supabaseAuthClient.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jan@example.com', password: 'zle-haslo' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Niepoprawny');
  });
});

// ============================================================
// POST /api/auth/refresh
// ============================================================

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – sesja odświeżona, nowy access_token', async () => {
    supabaseAuthClient.auth.refreshSession.mockResolvedValue({
      data: {
        user: VALID_USER,
        session: { ...VALID_SESSION, access_token: 'new-access-token' },
      },
      error: null,
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.session.access_token).toBe('new-access-token');
  });

  it('400 – brak refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('refresh');
  });

  it('401 – nieważny / wygasły refreshToken (Supabase error)', async () => {
    supabaseAuthClient.auth.refreshSession.mockResolvedValue({
      data: null,
      error: { message: 'Token is invalid or has expired' },
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'wygasly-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Sesja wygasła');
  });
});

// ============================================================
// POST /api/auth/logout
// ============================================================

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 – wylogowano (setSession OK)', async () => {
    supabaseAuthClient.auth.setSession.mockResolvedValue({ error: null });
    supabaseAuthClient.auth.signOut.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ accessToken: 'valid-token', refreshToken: 'valid-refresh' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Wylogowano');
  });

  it('200 – wylogowano nawet gdy setSession zwróci błąd (graceful)', async () => {
    supabaseAuthClient.auth.setSession.mockResolvedValue({ error: { message: 'session error' } });

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ accessToken: 'token', refreshToken: 'refresh' });

    // Kontroler logoutuje bez względu na błąd setSession
    expect(res.status).toBe(200);
  });

  it('400 – brak accessToken', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'valid-refresh' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('access');
  });
});
