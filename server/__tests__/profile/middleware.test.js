/**
 * TESTY JEDNOSTKOWE – middleware/validateProfile.js
 *
 * Testujemy funkcje walidacyjne izolowanie przez bezpośrednie wywołanie
 * z mockami req/res/next. Żadne połączenia zewnętrzne nie są nawiązywane.
 */

const {
  validateProfileUpdate,
  validateAvatarUpload,
} = require('../../middleware/validateProfile');

// Pomocnik tworzący mocki Express
const makeMocks = (body = {}) => {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// ============================================================
// validateProfileUpdate
// ============================================================

describe('validateProfileUpdate', () => {
  it('przepuszcza samo firstName', () => {
    const { req, res, next } = makeMocks({ firstName: 'Jan' });
    validateProfileUpdate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('przepuszcza samo lastName', () => {
    const { req, res, next } = makeMocks({ lastName: 'Kowalski' });
    validateProfileUpdate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('przepuszcza oba pola naraz', () => {
    const { req, res, next } = makeMocks({ firstName: 'Jan', lastName: 'Kowalski' });
    validateProfileUpdate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('przepuszcza pusty string (firstName = "")', () => {
    const { req, res, next } = makeMocks({ firstName: '' });
    validateProfileUpdate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('przepuszcza firstName o dokładnie 80 znakach (granica)', () => {
    const { req, res, next } = makeMocks({ firstName: 'a'.repeat(80) });
    validateProfileUpdate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('400 – brak obu pól (puste body)', () => {
    const { req, res, next } = makeMocks({});
    validateProfileUpdate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – firstName jest liczbą, nie stringiem', () => {
    const { req, res, next } = makeMocks({ firstName: 123 });
    validateProfileUpdate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('tekst'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – lastName jest tablicą, nie stringiem', () => {
    const { req, res, next } = makeMocks({ lastName: ['Kowalski'] });
    validateProfileUpdate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – firstName przekracza 80 znaków', () => {
    const { req, res, next } = makeMocks({ firstName: 'a'.repeat(81) });
    validateProfileUpdate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('długie'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – lastName przekracza 80 znaków', () => {
    const { req, res, next } = makeMocks({ lastName: 'b'.repeat(81) });
    validateProfileUpdate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
// validateAvatarUpload
// ============================================================

describe('validateAvatarUpload', () => {
  it('przepuszcza poprawne base64Data i mimeType', () => {
    const { req, res, next } = makeMocks({
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
    });
    validateAvatarUpload(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('400 – brak base64Data', () => {
    const { req, res, next } = makeMocks({ mimeType: 'image/jpeg' });
    validateAvatarUpload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – brak mimeType', async () => {
    const { req, res, next } = makeMocks({ base64Data: 'abc123' });
    validateAvatarUpload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – base64Data jest liczbą zamiast stringa', () => {
    const { req, res, next } = makeMocks({ base64Data: 12345, mimeType: 'image/jpeg' });
    validateAvatarUpload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – mimeType jest liczbą zamiast stringa', () => {
    const { req, res, next } = makeMocks({ base64Data: 'abc123', mimeType: 1 });
    validateAvatarUpload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('400 – pusty string jako base64Data', () => {
    const { req, res, next } = makeMocks({ base64Data: '', mimeType: 'image/jpeg' });
    validateAvatarUpload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
