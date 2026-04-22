import { TripFormData, TripPlan } from '@/stores/tripStore';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

function buildPrompt(data: TripFormData): string {
  const interestLabels: Record<string, string> = {
    sightseeing: 'zwiedzanie zabytków',
    food: 'lokalna kuchnia i restauracje',
    nature: 'natura i parki',
    parties: 'życie nocne i imprezy',
    shopping: 'zakupy',
    art: 'muzea i sztuka',
    sport: 'aktywność sportowa',
    beach: 'plaża i relaks',
  };
  const transportLabels: Record<string, string> = {
    walking: 'pieszo',
    metro: 'metro i autobus',
    car: 'samochodem',
    bike: 'rowerem',
  };

  const interests = data.interests.map((i) => interestLabels[i] ?? i).join(', ');
  const transport = data.transport.map((t) => transportLabels[t] ?? t).join(', ');

  return `Jesteś ekspertem od podróży. Wygeneruj szczegółowy plan wycieczki na podstawie poniższych danych.

DANE WYCIECZKI:
- Cel podróży: ${data.destination}
- Data wylotu: ${data.departureDate}
- Data powrotu: ${data.returnDate}
- Liczba podróżujących: ${data.travelers} osób
- Budżet całkowity: ${data.budget} PLN (${Math.round(data.budget / data.travelers)} PLN/osobę)
- Zainteresowania: ${interests || 'ogólne zwiedzanie'}
- Preferowany transport na miejscu: ${transport || 'dowolny'}

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

Zadbaj żeby suma estimatedDayCost ze wszystkich dni była zbliżona do budżetu ${data.budget} PLN.`;
}

export async function generateTripPlan(formData: TripFormData): Promise<TripPlan> {
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
        content: buildPrompt(formData),
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  }),
});

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message ?? `Gemini error: ${response.status}`);
  }

  const data = await response.json();
    console.log('=== GROQ RAW RESPONSE ===', JSON.stringify(data, null, 2));
    const content = data.choices[0].message.content;

  try {
    return JSON.parse(content) as TripPlan;
  } catch {
    throw new Error('Nie udało się sparsować odpowiedzi AI');
  }
}