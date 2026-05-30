/**
 * TESTY JEDNOSTKOWE – middleware/validateAuth.js
 *
 * Testujemy każdą funkcję walidacyjną izolowanie przez bezpośrednie wywołanie
 * z mockami req/res/next. Żadne połączenia z Supabase nie są nawiązywane.
 */

const {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
} = require('../../middleware/validateAuth');

// Pomocnik tworzący mocki Express
const makeMocks = (body = {}, headers = {}) => {
  const req = { body, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

// ============================================================
// validateRegister
// ============================================================

describe('validateRegister', () => {
  it('przepuszcza poprawne dane', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com', password: 'haslo123' });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blokuje brak email – zwraca 400 z errors.email', () => {
    const { req, res, next } = makeMocks({ password: 'haslo123' });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.objectContaining({ email: expect.any(String) }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje niepoprawny format email', () => {
    const { req, res, next } = makeMocks({ email: 'nie-email', password: 'haslo123' });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.objectContaining({ email: expect.any(String) }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje brak hasła – zwraca 400 z errors.password', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com' });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.objectContaining({ password: expect.any(String) }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje hasło krótsze niż 6 znaków', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com', password: 'abc' });
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errors: expect.objectContaining({ password: expect.any(String) }),
    }));
  });

  it('przepuszcza hasło o dokładnie 6 znakach (granica dolna)', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com', password: '123456' });
    validateRegister(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('zwraca errors dla obu pól gdy brakuje ich obu', () => {
    const { req, res, next } = makeMocks({});
    validateRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.email).toBeDefined();
    expect(body.errors.password).toBeDefined();
  });
});

// ============================================================
// validateLogin
// ============================================================

describe('validateLogin', () => {
  it('przepuszcza poprawne dane', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com', password: 'haslo123' });
    validateLogin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blokuje brak email – zwraca 400', () => {
    const { req, res, next } = makeMocks({ password: 'haslo123' });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje niepoprawny email', () => {
    const { req, res, next } = makeMocks({ email: 'nie-email', password: 'haslo123' });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje brak hasła', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com' });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje hasło będące liczbą zamiast stringa', () => {
    const { req, res, next } = makeMocks({ email: 'jan@example.com', password: 123456 });
    validateLogin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
// validateRefresh
// ============================================================

describe('validateRefresh', () => {
  it('przepuszcza poprawny refreshToken', () => {
    const { req, res, next } = makeMocks({ refreshToken: 'valid-refresh-token' });
    validateRefresh(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blokuje brak refreshToken – zwraca 400', () => {
    const { req, res, next } = makeMocks({});
    validateRefresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje refreshToken będący liczbą', () => {
    const { req, res, next } = makeMocks({ refreshToken: 12345 });
    validateRefresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje pusty string jako refreshToken', () => {
    const { req, res, next } = makeMocks({ refreshToken: '' });
    validateRefresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
// validateLogout
// ============================================================

describe('validateLogout', () => {
  it('przepuszcza poprawny accessToken', () => {
    const { req, res, next } = makeMocks({ accessToken: 'valid-access-token' });
    validateLogout(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blokuje brak accessToken – zwraca 400', () => {
    const { req, res, next } = makeMocks({});
    validateLogout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje accessToken będący liczbą', () => {
    const { req, res, next } = makeMocks({ accessToken: 999 });
    validateLogout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('blokuje pusty string jako accessToken', () => {
    const { req, res, next } = makeMocks({ accessToken: '' });
    validateLogout(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
