# Where We Going - Server API

> Backend API dla aplikacji Where We Going - zbudowany w Node.js i Express

## Spis Treści

- [Przegląd](#przegląd)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Uruchamianie](#uruchamianie)
- [Struktura Projektu](#struktura-projektu)
- [API Endpoints](#api-endpoints)
- [Testowanie](#testowanie)
- [Zmienne Środowiskowe](#zmienne-środowiskowe)

## Przegląd

Backend Where We Going to RESTful API zbudowany w Express.js, który obsługuje:

- Autentykacja - Rejestracja, logowanie, zarządzanie sesjami
- Profile Użytkowników - Tworzenie i edycję profili
- Podróże - CRUD operacje na podróżach grupowych
- Przyjaźnie - Zarządzanie połączeniami między użytkownikami
- Inspiracje - Rekomendacje miejsc i aktywności

Baza danych: Supabase PostgreSQL

## Technologia

- Node.js - Runtime JavaScript
- Express.js 5.2.1 - Framework webowy
- Supabase - PostgreSQL + Auth + Storage
- Jest 30.4.2 - Framework testowania
- Supertest 6.3.4 - HTTP assertion library
- Nodemon - Automatyczne przeładowanie podczas development

## Wymagania

- Node.js >= 18
- npm >= 9
- Konto Supabase z skonfigurowaną bazą danych

## Instalacja

1. Zainstaluj zależności:
```bash
npm install
```

2. Skonfiguruj zmienne środowiskowe (zobacz sekcję poniżej)

## Uruchamianie

### Development
```bash
npm run dev
```
Server uruchomi się na `http://localhost:3000`

### Produkcja
```bash
npm start
```

## Struktura Projektu

```
server/
├── controllers/           Logika biznesowa
│   ├── auth.controller.js
│   ├── profile.controller.js
│   ├── trips.controller.js
│   ├── friends.controller.js
│   └── inspiration.controller.js
│
├── routes/                Definicje tras API
│   ├── auth.routes.js
│   ├── profile.routes.js
│   ├── trips.routes.js
│   ├── friends.routes.js
│   └── inspiration.routes.js
│
├── middleware/            Middleware Express
│   ├── auth.middleware.js
│   ├── errorHandler.js
│   └── cors.js
│
├── repositories/          Dostęp do bazy danych
│   ├── users.repository.js
│   ├── profiles.repository.js
│   ├── trips.repository.js
│   └── ...
│
├── configs/               Konfiguracja
│   └── supabaseClient.js
│
├── utils/                 Funkcje pomocnicze
│   ├── validators.js
│   ├── errorHandlers.js
│   └── ...
│
├── __tests__/             Testy
│   ├── auth/
│   ├── profile/
│   └── ...
│
├── scripts/               Skrypty pomocnicze
├── server.js              Punkt wejścia
└── package.json
```

## API Endpoints

### Auth (Autentykacja)
```
POST   /api/auth/register          - Rejestracja użytkownika
POST   /api/auth/login             - Logowanie
POST   /api/auth/logout            - Wylogowanie
POST   /api/auth/refresh           - Odświeżenie tokenu
GET    /api/auth/me                - Pobranie aktualnego użytkownika
```

### Profile (Profile Użytkowników)
```
GET    /api/profiles/:userId       - Pobranie profilu użytkownika
PUT    /api/profiles/:userId       - Aktualizacja profilu
PUT    /api/profiles/:userId/avatar - Zmiana awatara
```

### Trips (Podróże)
```
POST   /api/trips                  - Tworzenie nowej podróży
GET    /api/trips                  - Lista podróży użytkownika
GET    /api/trips/:tripId          - Szczegóły podróży
PUT    /api/trips/:tripId          - Aktualizacja podróży
DELETE /api/trips/:tripId          - Usunięcie podróży
```

### Friends (Przyjaźnie)
```
POST   /api/friends/request        - Wysłanie zaproszenia
GET    /api/friends/requests       - Lista zaproszeń
PUT    /api/friends/request/:id    - Akceptacja zaproszenia
DELETE /api/friends/:userId        - Usunięcie przyjaciela
```

### Inspiration (Inspiracje)
```
GET    /api/inspiration            - Rekomendacje miejsc
GET    /api/inspiration/search     - Wyszukiwanie inspiracji
```

## Testowanie

### Uruchamianie testów
```bash
# Wszystkie testy
npm test

# Testy w trybie watch
npm run test:watch

# Pokrycie kodu
npm run test:coverage

# Testy jednostkowe
npm run test:unit

# Testy integracyjne
npm run test:integration
```

### Struktura testów
```
__tests__/
├── auth/
│   ├── auth.test.js
│   └── fixtures/
├── profile/
│   ├── profile.test.js
│   └── fixtures/
└── ...
```
