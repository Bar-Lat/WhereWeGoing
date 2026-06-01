const INTEREST_LABELS = {
  sightseeing: 'zwiedzanie zabytków',
  food: 'lokalna kuchnia i restauracje',
  nature: 'natura i parki',
  parties: 'życie nocne i imprezy',
  shopping: 'zakupy',
  art: 'muzea i sztuka',
  sport: 'aktywność sportowa',
  beach: 'plaża i relaks',
};

const TRANSPORT_LABELS = {
  walking: 'pieszo',
  metro: 'metro i autobus',
  car: 'samochodem',
  bike: 'rowerem',
};

const buildPrompt = (data) => {
  const interests = (data.interests || []).map((i) => INTEREST_LABELS[i] ?? i).join(', ');
  const transport = (data.transport || []).map((t) => TRANSPORT_LABELS[t] ?? t).join(', ');
  const attractionsPerDay = data.attractionsPerDay ?? 3;

  return `Jesteś ekspertem od podróży. Wygeneruj szczegółowy plan wycieczki na podstawie poniższych danych.

DANE WYCIECZKI:
- Cel podróży: ${data.destination}
- Data wylotu: ${data.departureDate}
- Data powrotu: ${data.returnDate}
- Liczba podróżujących: ${data.travelers} osób
- Budżet całkowity: ${data.budget} PLN (${Math.round(data.budget / data.travelers)} PLN/osobę)
- Zainteresowania: ${interests || 'ogólne zwiedzanie'}
- Preferowany transport na miejscu: ${transport || 'dowolny'}
- Liczba atrakcji dziennie: ${attractionsPerDay}

Zwróć WYŁĄCZNIE obiekt JSON (bez markdown, bez komentarzy) w tym schemacie:
{
  "destination": "string",
  "englishDestination": "string (angielska nazwa miasta dla Unsplash)", 
  "summary": "string",
  "imageUrl": "string (zostaw puste, wygenerujemy to sami)",
  "totalDays": number,
  "estimatedTotalCost": number,
  "currency": "PLN",
  "days": [
    {
      "day": number,
      "date": "string (dd.mm.rrrr)",
      "title": "string (krótki tytuł dnia)",
      "activities": [
        {
          "time": "string (np. 09:00)",
          "name": "string",
          "description": "string (1-2 zdania)",
          "category": "string (jedzenie|atrakcja|transport|nocleg|inne)",
          "estimatedCost": number,
          "location": "string (pełny adres: nazwa miejsca + ulica/dzielnica + miasto)",
          "durationMinutes": number (realistyczny czas wizyty w minutach),
          "coordinates": {
            "latitude": number (WGS84 — dokładne współrzędne miejsca),
            "longitude": number (WGS84)
          }
        }
      ],
      "estimatedDayCost": number,
      "tips": "string (jedna praktyczna wskazówka na ten dzień)"
    }
  ],
  "generalTips": ["string", "string", "string"],
  "bestTransport": "string (rekomendacja transportu)"
}

Każdy dzień powinien mieć dokładnie ${attractionsPerDay} atrakcji (nie licząc transportu i posiłków).
Wszystkie koszty (estimatedCost, estimatedDayCost, estimatedTotalCost) dotyczą CAŁEJ grupy ${data.travelers} osób, nie jednej osoby.
estimatedDayCost każdego dnia musi być równy sumie estimatedCost aktywności tego dnia.
Suma estimatedDayCost ze wszystkich dni powinna być zbliżona do budżetu ${data.budget} PLN.
Dla KAŻDEJ aktywności OBOWIĄZKOWO podaj location, durationMinutes oraz coordinates (latitude/longitude).
Pole location musi być na tyle precyzyjne, żeby dało się znaleźć miejsce na mapie — podaj nazwę obiektu, ulicę i miasto (np. "Wawel, Wawel 5, Kraków", nie samo "zamek").
Współrzędne muszą odpowiadać temu samemu miejscu co location i leżeć w ${data.destination}.
durationMinutes to realistyczny czas wizyty (np. muzeum 90–120, posiłek 60–90, krótka atrakcja 45–60).
Nie skracaj listy pól — każda aktywność musi mieć komplet danych.
Godziny aktywności muszą rosnąć chronologicznie w ciągu dnia.`;
};

module.exports = { buildPrompt, INTEREST_LABELS, TRANSPORT_LABELS };
