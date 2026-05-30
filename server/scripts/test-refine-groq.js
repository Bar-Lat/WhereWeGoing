require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TRANSPORT_LABELS = {
  walking: 'pieszo',
  metro: 'metro/autobus',
  car: 'samochodem',
  bike: 'rowerem',
};

const samplePlan = {
  destination: 'Kraków',
  days: [
    {
      day: 1,
      date: '01.06.2026',
      title: 'Dzień 1',
      activities: [
        {
          name: 'Rynek Główny',
          time: '10:00',
          durationMinutes: 90,
          location: 'Rynek Główny, Kraków',
          category: 'atrakcja',
          estimatedCost: 0,
        },
        {
          name: 'Wawel',
          time: '14:00',
          durationMinutes: 120,
          location: 'Wawel, Kraków',
          category: 'atrakcja',
          estimatedCost: 35,
        },
      ],
    },
  ],
};

const buildRefinePrompt = (tripPlan, preferredTransport) => {
  const transport = (preferredTransport || []).map((t) => TRANSPORT_LABELS[t] ?? t).join(', ') || 'dowolny';
  return `Jesteś ekspertem od planowania podróży. Otrzymujesz plan wycieczki w JSON.
Dla KAŻDEGO dnia dodaj tablicę "transits" opisującą przejazdy MIĘDZY kolejnymi aktywnościami (nie licz transportu jako osobnej aktywności).

Każdy element transits:
{
  "afterActivityIndex": number (0 = między aktywnością 0 a 1),
  "modeLabel": string (np. "Metro/autobus", "Pieszo", "Samochód"),
  "estimatedCost": number (PLN dla całej grupy, zaokrąglone),
  "startTime": "HH:MM",
  "endTime": "HH:MM"
}

Preferowany transport na miejscu: ${transport}.
Generuj transit tylko miedzy sasiednimi aktywnosciami, gdy da sie ustalic trase: uzyj location aktywnosci, a gdy brak - location sasiedniej aktywnosci. Gdy nadal brak sensownej trasy - pomin ten transit.
Godziny transitow musza byc chronologiczne wzgledem godzin aktywnosci.
NIE zmieniaj kolejnosci, nazw ani godzin aktywnosci.

Zwróć WYŁĄCZNIE pełny obiekt JSON planu (ten sam schemat co wejście + transits w każdym dniu).

PLAN:
${JSON.stringify(tripPlan)}`;
};

async function main() {
  if (!GROQ_API_KEY) {
    console.error('FAIL: brak GROQ_API_KEY');
    process.exit(1);
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
          content: 'Jesteś asystentem planowania podróży. Zawsze odpowiadasz wyłącznie w formacie JSON, bez dodatkowego tekstu.',
        },
        { role: 'user', content: buildRefinePrompt(samplePlan, ['metro', 'walking']) },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    console.error('FAIL HTTP', response.status, await response.text());
    process.exit(1);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  const transits = parsed?.days?.[0]?.transits;

  if (!Array.isArray(transits) || transits.length === 0) {
    console.error('FAIL: brak poprawnych transits');
    console.log(JSON.stringify(parsed, null, 2).slice(0, 1200));
    process.exit(1);
  }

  const first = transits[0];
  if (typeof first.afterActivityIndex !== 'number' || !first.modeLabel || !first.startTime) {
    console.error('FAIL: zły format transits', first);
    process.exit(1);
  }

  console.log('OK: refine-plan prompt działa');
  console.log(JSON.stringify(transits, null, 2));
}

main().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
