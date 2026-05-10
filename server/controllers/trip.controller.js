const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
  const interests = (data.interests || [])
    .map((i) => INTEREST_LABELS[i] ?? i)
    .join(', ');
  const transport = (data.transport || [])
    .map((t) => TRANSPORT_LABELS[t] ?? t)
    .join(', ');
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
  "summary": "string (2-3 zdania o wycieczce)",
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
          "location": "string (adres lub dzielnica)"
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
Zadbaj żeby suma estimatedDayCost ze wszystkich dni była zbliżona do budżetu ${data.budget} PLN.`;
};

const generateTripPlan = async (req, res, next) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ message: 'Brak klucza GROQ_API_KEY na serwerze' });
    }

    const { destination, departureDate, returnDate, travelers, budget, interests, transport, attractionsPerDay } = req.body;

    if (!destination || !departureDate || !returnDate || !travelers || !budget) {
      return res.status(400).json({ message: 'Brakujące dane formularza' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Jesteś asystentem planowania podróży. Zawsze odpowiadasz wyłącznie w formacie JSON, bez żadnego dodatkowego tekstu.',
          },
          {
            role: 'user',
            content: buildPrompt(req.body),
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({
        message: err.error?.message ?? `Groq error: ${response.status}`,
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let tripPlan;
    try {
      tripPlan = JSON.parse(content);
    } catch {
      return res.status(502).json({ message: 'Nie udało się sparsować odpowiedzi AI' });
    }

    return res.status(200).json({ tripPlan });
  } catch (err) {
    return next(err);
  }
};

module.exports = { generateTripPlan };