

# Where We Going


<div align="center">

![Where We Going Logo](https://raw.githubusercontent.com/Bar-Lat/WhereWeGoing/main/client/assets/images/WhereWeGoingLogo.png)



<b>Aplikacja mobilna do wspólnego planowania podróży z przyjaciółmi</b>
</div>

## O Projekcie

**Where We Going** to nowoczesna aplikacja mobilna stworzona w React Native z Expo, która ułatwia grupom przyjaciół wspólne planowanie i organizację podróży. 

### Główne Cechy

- Planowanie tras - Interaktywne mapy i planowanie aktywności
- Dzielenie kosztów - Śledzenie wydatków i dzielenie rachunków
- Harmonogram - Tworzenie szczegółowych planów dnia
- Tryb offline - Dostęp do podróży nawet bez internetu
- Powiadomienia - Bądź na bieżąco z planami grupy
- AI Inspiracje - Rekomendacje miejsc

---

## Technologia

### Frontend
<table>
  <tr>
    <td><b>Framework</b></td>
    <td>React Native 0.81.5 + Expo 54.0</td>
  </tr>
  <tr>
    <td><b>Język</b></td>
    <td>TypeScript</td>
  </tr>
  <tr>
    <td><b>Routing</b></td>
    <td>Expo Router (file-based)</td>
  </tr>
  <tr>
    <td><b>Storage</b></td>
    <td>Async Storage (offline) + Secure Store</td>
  </tr>
  <tr>
    <td><b>HTTP Client</b></td>
    <td>Axios</td>
  </tr>
  <tr>
    <td><b>UI Components</b></td>
    <td>React Navigation, Bottom Tabs</td>
  </tr>
</table>

### Backend
<table>
  <tr>
    <td><b>Runtime</b></td>
    <td>Node.js + Express.js 5.2.1</td>
  </tr>
  <tr>
    <td><b>Database</b></td>
    <td>Supabase (PostgreSQL)</td>
  </tr>
  <tr>
    <td><b>Autentykacja</b></td>
    <td>Supabase Auth (JWT)</td>
  </tr>
  <tr>
    <td><b>Storage</b></td>
    <td>Supabase Storage (S3)</td>
  </tr>
  <tr>
    <td><b>Testing</b></td>
    <td>Jest + Supertest</td>
  </tr>
  <tr>
    <td><b>AI</b></td>
    <td>Groq API (Chat completions)</td>
  </tr>
</table>

---

## Struktura Projektu

```
WhereWeGoing/
│
├── client/                  Aplikacja mobilna (React Native)
│   ├── app/                 Routing i ekrany (Expo Router)
│   ├── components/          Komponenty reutilizowalne
│   ├── providers/           Context (Auth, Network, Profile)
│   ├── services/            API calls, Storage, Integracje
│   ├── hooks/               Custom React hooks
│   ├── stores/              State management (Zustand)
│   ├── types/               TypeScript interfaces
│   ├── utils/               Funkcje pomocnicze
│   ├── styles/              Stylowanie aplikacji
│   └── README.md            Dokumentacja frontendu
│
├── server/                  Backend API (Node.js/Express)
│   ├── controllers/         Logika biznesowa
│   ├── routes/              Definicje tras API
│   ├── middleware/          Middleware Express
│   ├── repositories/        Dostęp do bazy danych
│   ├── configs/             Konfiguracja Supabase
│   ├── utils/               Funkcje pomocnicze
│   ├── __tests__/           Testy (Jest + Supertest)
│   ├── scripts/             Skrypty pomocnicze
│   ├── server.js            Punkt wejścia
│   └── README.md            Dokumentacja backendu
│
└── README.md               Dokumentacja projektu (TEN PLIK)
```

---

## Szybki Start

### Wymagania
- Node.js >= 18
- npm >= 9
- Git
- Konto Supabase
- Expo CLI (opcjonalnie)

### 1. Klonowanie i Setup

```bash
# Klonuj repozytorium
git clone <repo-url>
cd WhereWeGoing

# Zainstaluj zależności backendu
cd server && npm install && cd ..

# Zainstaluj zależności frontendu
cd client && npm install && cd ..
```

### 2. Konfiguracja Zmiennych Środowiskowych

**server/.env:**
```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

JWT_SECRET=your_secret_key
SUPABASE_EMAIL_REDIRECT_URL=wherewegoing://auth/callback
GROQ_API_KEY=your_groq_api_key

CORS_ORIGIN=http://localhost:8081,exp://127.0.0.1:8081
```

**client/.env:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_REDIRECT_URL=wherewegoing://auth/callback
```

### 3. Uruchomienie

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server powinien słuchać na http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
# Skanuj QR code za pomocą Expo Go lub naciśnij 'a' dla Android
```


<div align="center">

Made with love by the Where We Going Team

Jeśli masz pytania, otwórz issue na GitHubie!

</div>
