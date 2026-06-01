/**
 * TESTY INTEGRACYJNE – Groq API
 *
 * POST /api/trip/generate oraz POST /api/trip/refine-plan.
 * Weryfikuje warstwe HTTP do api.groq.com (mock fetch).
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

const VALID_USER = { id: 'user-groq-123', email: 'jan@example.com' };

const GENERATE_FORM = {
  destination: 'Krakow',
  departureDate: '01.06.2026',
  returnDate: '03.06.2026',
  travelers: 2,
  budget: 2000,
};

const GENERATE_PLAN_JSON = {
  destination: 'Krakow',
  days: [
    {
      day: 1,
      date: '01.06.2026',
      title: 'Dzien 1',
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

const REFINE_PLAN = {
  destination: 'Krakow',
  days: [
    {
      day: 1,
      date: '01.06.2026',
      activities: [
        {
          name: 'Wawel',
          time: '10:00',
          durationMinutes: 90,
          coordinates: { latitude: 50.054, longitude: 19.935 },
        },
        {
          name: 'Rynek',
          time: '12:00',
          durationMinutes: 60,
          coordinates: { latitude: 50.061, longitude: 19.937 },
        },
      ],
    },
  ],
};

const REFINE_RESPONSE_JSON = {
  days: [
    {
      day: 1,
      transits: [
        {
          afterActivityIndex: 0,
          modeLabel: 'Metro',
          startTime: '11:30',
          endTime: '11:50',
          estimatedCost: 5,
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

const parseGroqRequestBody = (fetchCall) => JSON.parse(fetchCall[1].body);

describe('Groq API – POST /api/trip/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  it('wysyla zapytanie do api.groq.com z kluczem i modelem llama-3.3-70b-versatile', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(GENERATE_PLAN_JSON) } }],
      }),
    });

    await request(app).post('/api/trip/generate').send(GENERATE_FORM);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-groq-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = parseGroqRequestBody(global.fetch.mock.calls[0]);
    expect(body.model).toBe('llama-3.3-70b-versatile');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toContain('Krakow');
  });

  it('500 – brak zmiennej srodowiskowej GROQ_API_KEY', async () => {
    delete process.env.GROQ_API_KEY;

    const res = await request(app).post('/api/trip/generate').send(GENERATE_FORM);

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('GROQ_API_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('502 – Groq zwrocilo blad HTTP (np. limit zapytan 429)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await request(app).post('/api/trip/generate').send(GENERATE_FORM);

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Rate limit exceeded');
  });

  it('502 – Groq zwrocilo blad HTTP bez szczegolow error.message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const res = await request(app).post('/api/trip/generate').send(GENERATE_FORM);

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('Groq error: 503');
  });

  it('502 – odpowiedz Groq nie jest poprawnym JSON planu', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'to nie jest poprawny JSON {' } }],
      }),
    });

    const res = await request(app).post('/api/trip/generate').send(GENERATE_FORM);

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Nie udało się sparsować odpowiedzi AI');
  });
});

describe('Groq API – POST /api/trip/refine-plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.GROQ_API_KEY = 'test-groq-key';
    withValidAuth();
  });

  it('wysyla zapytanie do api.groq.com z planem do dopracowania transportow', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(REFINE_RESPONSE_JSON) } }],
      }),
    });

    const res = await request(app)
      .post('/api/trip/refine-plan')
      .set('Authorization', 'Bearer valid-token')
      .send({ tripPlan: REFINE_PLAN, preferredTransport: ['metro'] });

    expect(res.status).toBe(200);
    expect(res.body.refined).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-groq-key');

    const body = parseGroqRequestBody(global.fetch.mock.calls[0]);
    expect(body.model).toBe('llama-3.3-70b-versatile');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[1].content).toContain('transits');
  });

  it('500 – brak zmiennej srodowiskowej GROQ_API_KEY', async () => {
    delete process.env.GROQ_API_KEY;

    const res = await request(app)
      .post('/api/trip/refine-plan')
      .set('Authorization', 'Bearer valid-token')
      .send({ tripPlan: REFINE_PLAN });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('GROQ_API_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('502 – Groq zwrocilo blad HTTP przy refine', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await request(app)
      .post('/api/trip/refine-plan')
      .set('Authorization', 'Bearer valid-token')
      .send({ tripPlan: REFINE_PLAN });

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Rate limit exceeded');
  });

  it('502 – pusta odpowiedz Groq (brak content)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: {} }],
      }),
    });

    const res = await request(app)
      .post('/api/trip/refine-plan')
      .set('Authorization', 'Bearer valid-token')
      .send({ tripPlan: REFINE_PLAN });

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('Pusta odpowiedz AI');
  });

  it('502 – odpowiedz Groq nie jest poprawnym JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'niepoprawny json' } }],
      }),
    });

    const res = await request(app)
      .post('/api/trip/refine-plan')
      .set('Authorization', 'Bearer valid-token')
      .send({ tripPlan: REFINE_PLAN });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('JSON');
  });
});
