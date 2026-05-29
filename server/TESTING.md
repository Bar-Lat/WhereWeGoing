# Testowanie backendu – WhereWeGoing

## Struktura testów

```
__tests__/
├── auth/
│   ├── middleware.test.js   ← testy jednostkowe validateAuth
│   └── endpoints.test.js    ← testy integracyjne tras /api/auth
└── profile/
    ├── middleware.test.js   ← testy jednostkowe validateProfile
    └── endpoints.test.js    ← testy integracyjne tras /api/profile
```

### Testy jednostkowe (middleware)

Testują funkcje walidacyjne w izolacji – bezpośrednie wywołanie z mockami `req/res/next`.
Nie nawiązują żadnych połączeń zewnętrznych. Sprawdzają wyłącznie logikę walidacji.

### Testy integracyjne (endpoints)

Testują pełny przepływ żądania przez stos Express: middleware → kontroler → odpowiedź.
**Supabase i repozytorium bazy danych są mockowane** przez `jest.mock()` – testy działają
offline i nie modyfikują żadnych danych.

---

## Uruchamianie testów

```bash
# Wszystkie testy
npm test

# Tryb obserwacji (re-run przy zmianach pliku)
npm run test:watch

# Z raportem pokrycia kodu
npm run test:coverage

# Tylko testy jednostkowe (middleware auth + profile)
npm run test:unit

# Tylko testy integracyjne (endpoints)
npm run test:integration
```

> **Uwaga:** skrypty `test:unit` i `test:integration` wskazują na konkretne pliki.
> Możesz je zmienić w `package.json` jeśli chcesz zawęzić zakres.

---

## Zmienne środowiskowe

Testy **nie wymagają** działającego Supabase – wszystkie zewnętrzne zależności są mockowane.

Plik `.env` jest ładowany przez `jest.setup.js` (via `dotenv`). Jeśli `.env` nie istnieje,
testy nadal zadziałają, bo kontrolery używają wartości domyślnych dla zmiennych środowiskowych.

---

## Jak działają mocki

### Supabase Auth Client (`supabaseAuthClient`)

Każdy plik z testami endpointów mockuje moduł `configs/supabaseClient`:

```js
jest.mock('../../configs/supabaseClient', () => ({
  supabaseAuthClient: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      // ...
    },
  },
  supabaseDbClient: {
    storage: { from: jest.fn() },
  },
}));
```

Następnie w `beforeEach` ustawiasz konkretne odpowiedzi:

```js
supabaseAuthClient.auth.getUser.mockResolvedValue({
  data: { user: { id: 'user-123', email: 'jan@example.com' } },
  error: null,
});
```

### Repozytorium profilu (`profile.repository`)

```js
jest.mock('../../repositories/profile.repository', () => ({
  upsertUserProfile: jest.fn(),
  getUserProfileById: jest.fn(),
  profileSchema: 'public',
  profileTable: 'profiles',
}));

// W teście:
getUserProfileById.mockResolvedValue({ data: profileRow, error: null });
```

---

## Pokryte scenariusze

### Auth – middleware (`validateRegister`, `validateLogin`, `validateRefresh`, `validateLogout`)

| Scenariusz                       | Oczekiwany wynik |
|----------------------------------|-----------------|
| Poprawne dane                    | `next()` wywołany |
| Brakujące pole                   | 400 + `errors.*` |
| Niepoprawny format email         | 400 + `errors.email` |
| Hasło < 6 znaków                 | 400 + `errors.password` |
| Token jest liczbą (nie stringiem)| 400 |
| Pusty string jako token          | 400 |

### Auth – endpointy

| Endpoint                  | Scenariusz                            | Status |
|---------------------------|---------------------------------------|--------|
| `POST /api/auth/register` | Poprawna rejestracja                  | 201    |
| `POST /api/auth/register` | Duplikat email (Supabase error)       | 409    |
| `POST /api/auth/register` | Rate limit Supabase                   | 429    |
| `POST /api/auth/register` | Błąd zapisu profilu po rejestracji    | 500    |
| `POST /api/auth/register` | Brak / niepoprawny email              | 400    |
| `POST /api/auth/register` | Hasło < 6 znaków                      | 400    |
| `POST /api/auth/login`    | Poprawne logowanie (zwraca session)   | 200    |
| `POST /api/auth/login`    | Złe hasło (Supabase error)            | 401    |
| `POST /api/auth/login`    | Brak pól                              | 400    |
| `POST /api/auth/refresh`  | Odświeżenie sesji                     | 200    |
| `POST /api/auth/refresh`  | Wygasły refresh token                 | 401    |
| `POST /api/auth/refresh`  | Brak refreshToken                     | 400    |
| `POST /api/auth/logout`   | Poprawne wylogowanie                  | 200    |
| `POST /api/auth/logout`   | Brak accessToken                      | 400    |

### Profile – middleware (`validateProfileUpdate`, `validateAvatarUpload`)

| Scenariusz                          | Oczekiwany wynik |
|-------------------------------------|-----------------|
| Samo firstName                      | `next()` |
| Samo lastName                       | `next()` |
| Brak obu pól                        | 400 |
| firstName jest liczbą               | 400 |
| firstName > 80 znaków               | 400 |
| Poprawne base64Data + mimeType      | `next()` |
| Brak base64Data                     | 400 |
| Brak mimeType                       | 400 |

### Profile – endpointy

| Endpoint                     | Scenariusz                               | Status |
|------------------------------|------------------------------------------|--------|
| `GET /api/profile/me`        | Poprawny token, profil zwrócony          | 200    |
| `GET /api/profile/me`        | Brak tokenu                              | 401    |
| `GET /api/profile/me`        | Nieważny token                           | 401    |
| `GET /api/profile/me`        | Błąd odczytu z DB                        | 500    |
| `GET /api/profile/me`        | Avatar jako signed URL (prywatny bucket) | 200    |
| `PATCH /api/profile/me`      | Aktualizacja imienia i nazwiska          | 200    |
| `PATCH /api/profile/me`      | Puste body                               | 400    |
| `PATCH /api/profile/me`      | firstName jako liczba                    | 400    |
| `PATCH /api/profile/me`      | firstName > 80 znaków                    | 400    |
| `PATCH /api/profile/me`      | Brak / nieważny token                    | 401    |
| `PATCH /api/profile/me`      | Błąd upsert w DB                         | 500    |
| `POST /api/profile/avatar`   | Poprawny upload, stary avatar usunięty   | 200    |
| `POST /api/profile/avatar`   | Brak base64Data                          | 400    |
| `POST /api/profile/avatar`   | Brak mimeType                            | 400    |
| `POST /api/profile/avatar`   | Niedozwolony format (image/gif)          | 400    |
| `POST /api/profile/avatar`   | Brak / nieważny token                    | 401    |
| `POST /api/profile/avatar`   | Błąd Storage upload                      | 500    |

---

## Debugowanie

### Uruchomienie pojedynczego pliku testów

```bash
npx jest __tests__/auth/endpoints.test.js
npx jest __tests__/profile/middleware.test.js
```

### Uruchomienie testów z pattern matching

```bash
npx jest --testPathPattern="auth"
npx jest --testPathPattern="profile"
```

### Podgląd szczegółowych logów

```bash
npx jest --verbose
```

### Sprawdzenie pokrycia dla konkretnego pliku źródłowego

```bash
npx jest --coverage --collectCoverageFrom="controllers/auth.controller.js"
```
