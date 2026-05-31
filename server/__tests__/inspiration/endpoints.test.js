/**
 * TESTY INTEGRACYJNE – /api/inspiration
 *
 * Testy sprawdzają backend modułu inspiracji i propozycji ofert.
 * Supabase oraz repozytorium są mockowane, dlatego testy nie zmieniają danych w bazie.
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

jest.mock('../../repositories/inspiration.repository', () => ({
  getOffers: jest.fn(),
  getOfferById: jest.fn(),
  getProfilesByIds: jest.fn(),
  getParticipatingTripIds: jest.fn(),
  createTripFromOffer: jest.fn(),
}));

const app = require('../../server');
const { supabaseAuthClient } = require('../../configs/supabaseClient');
const inspirationRepository = require('../../repositories/inspiration.repository');

const USER = { id: 'user-1', email: 'alan@example.com' };

const OFFER_ROW = {
  id: 'trip-1',
  owner_id: 'author-1',
  destination: 'Paryż',
  start_date: '2026-06-01',
  end_date: '2026-06-04',
  total_budget: 1200,
  status: 'planned',
  image_url: 'https://example.com/paris.jpg',
  notes: 'Weekendowy wyjazd do Paryża',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-02T10:00:00Z',
};

const AUTHOR_PROFILE = {
  id: 'author-1',
  first_name: 'Jan',
  last_name: 'Kowalski',
  avatar: null,
};

const withValidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: { user: USER },
    error: null,
  });

const withInvalidAuth = () =>
  supabaseAuthClient.auth.getUser.mockResolvedValue({
    data: null,
    error: { message: 'invalid token' },
  });

beforeEach(() => {
  jest.clearAllMocks();
  inspirationRepository.getProfilesByIds.mockResolvedValue({ data: [AUTHOR_PROFILE], error: null });
});

describe('GET /api/inspiration/offers', () => {
  it('200 – zwraca listę znormalizowanych propozycji ofert', async () => {
    inspirationRepository.getOffers.mockResolvedValue({ data: [OFFER_ROW], error: null });

    const res = await request(app).get('/api/inspiration/offers');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.offers[0]).toMatchObject({
      id: 'trip-1',
      destination: 'Paryż',
      priceFrom: 1200,
      authorName: 'Jan Kowalski',
    });
  });

  it('200 – dla zalogowanego użytkownika wyklucza jego własne i już dodane plany', async () => {
    withValidAuth();
    inspirationRepository.getParticipatingTripIds.mockResolvedValue({ data: ['trip-owned-before'], error: null });
    inspirationRepository.getOffers.mockResolvedValue({ data: [OFFER_ROW], error: null });

    const res = await request(app)
      .get('/api/inspiration/offers?searchText=Paryz&source=user&maxBudget=2000')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(inspirationRepository.getOffers).toHaveBeenCalledWith(
      expect.objectContaining({
        searchText: 'Paryz',
        source: 'user',
        maxBudget: 2000,
        excludeOwnerId: USER.id,
        excludeTripIds: ['trip-owned-before'],
      })
    );
  });

  it('500 – błąd pobierania propozycji z repozytorium', async () => {
    inspirationRepository.getOffers.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await request(app).get('/api/inspiration/offers');

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('propozycji ofert');
  });
});

describe('GET /api/inspiration/offers/:offerId', () => {
  it('200 – zwraca szczegóły wybranej oferty', async () => {
    inspirationRepository.getOfferById.mockResolvedValue({ data: OFFER_ROW, error: null });

    const res = await request(app).get('/api/inspiration/offers/trip-1');

    expect(res.status).toBe(200);
    expect(res.body.offer.id).toBe('trip-1');
    expect(res.body.offer.destination).toBe('Paryż');
  });

  it('404 – oferta nie istnieje', async () => {
    inspirationRepository.getOfferById.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get('/api/inspiration/offers/brak');

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Nie znaleziono');
  });
});

describe('POST /api/inspiration/offers/:offerId/create-trip', () => {
  it('201 – tworzy podróż na podstawie cudzej inspiracji', async () => {
    withValidAuth();
    inspirationRepository.getOfferById.mockResolvedValue({ data: OFFER_ROW, error: null });
    inspirationRepository.getParticipatingTripIds.mockResolvedValue({ data: [], error: null });
    inspirationRepository.createTripFromOffer.mockResolvedValue({
      data: { ...OFFER_ROW, id: 'new-trip', owner_id: USER.id },
      error: null,
    });

    const res = await request(app)
      .post('/api/inspiration/offers/trip-1/create-trip')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(res.body.trip.id).toBe('new-trip');
    expect(inspirationRepository.createTripFromOffer).toHaveBeenCalledWith({
      ownerId: USER.id,
      offer: OFFER_ROW,
    });
  });

  it('401 – brak tokenu przy tworzeniu podróży z inspiracji', async () => {
    const res = await request(app).post('/api/inspiration/offers/trip-1/create-trip');

    expect(res.status).toBe(401);
  });

  it('401 – niepoprawny token', async () => {
    withInvalidAuth();

    const res = await request(app)
      .post('/api/inspiration/offers/trip-1/create-trip')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('400 – użytkownik próbuje utworzyć plan ze swojej własnej oferty', async () => {
    withValidAuth();
    inspirationRepository.getOfferById.mockResolvedValue({ data: { ...OFFER_ROW, owner_id: USER.id }, error: null });

    const res = await request(app)
      .post('/api/inspiration/offers/trip-1/create-trip')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Twoim planem');
  });
});
