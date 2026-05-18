const { supabaseAuthClient } = require('../configs/supabaseClient');
const { createTrip } = require('../repositories/trip.repository');
const { createTripDays } = require('../repositories/tripDays.repository');
const { createActivities } = require('../repositories/activities.repository');

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

// Pomocnik: dd.mm.rrrr → YYYY-MM-DD
const toISO = (ddmmyyyy) => {
  const [day, month, year] = ddmmyyyy.split('.');
  return `${year}-${month}-${day}`;
};

const generateTripPlan = async (req, res, next) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ message: 'Brak klucza GROQ_API_KEY na serwerze' });
    }

    const { destination, departureDate, returnDate, travelers, budget } = req.body;

    if (!destination || !departureDate || !returnDate || !travelers || !budget) {
      return res.status(400).json({ message: 'Brakujące dane formularza' });
    }

    // Pobierz użytkownika z tokena
    const accessToken = req.headers.authorization?.slice(7);
    let ownerId = null;

    if (accessToken) {
      const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
      console.log('=== getUser result ===');
      console.log('user id:', data?.user?.id);
      console.log('error:', error?.message);
      ownerId = data?.user?.id ?? null;
    }

    // Wywołaj Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    if (!groqResponse.ok) {
      const err = await groqResponse.json();
      return res.status(502).json({
        message: err.error?.message ?? `Groq error: ${groqResponse.status}`,
      });
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;

    let tripPlan;
    try {
      tripPlan = JSON.parse(content);
    } catch {
      return res.status(502).json({ message: 'Nie udało się sparsować odpowiedzi AI' });
    }

    // Zapis do bazy jeśli użytkownik jest zalogowany
    let savedTrip = null;

    if (ownerId) {
      const tripRow = {
        owner_id: ownerId,
        destination,
        start_date: toISO(departureDate),
        end_date: toISO(returnDate),
        total_budget: budget,
        status: 'planned',
        image_url: '',
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: trip, error: tripError } = await createTrip(tripRow);

      if (tripError) {
        console.error('⚠️ Nie udało się zapisać wycieczki:', tripError.message);
      } else {
        savedTrip = trip;
        console.log('✅ Wycieczka zapisana, id:', trip.id);

        // Zapis dni
        const tripDays = tripPlan.days.map((day) => ({
          trip_id: trip.id,
          day_number: day.day,
          date: toISO(day.date),
          title: day.title ?? null,
        }));

        const { data: savedDays, error: daysError } = await createTripDays(tripDays);

        if (daysError) {
          console.error('⚠️ Nie udało się zapisać dni wycieczki:', daysError.message);
        } else {
          console.log('✅ Dni wycieczki zapisane, count:', tripDays.length);

          // Zapis aktywności
          const activities = [];

          tripPlan.days.forEach((day, dayIndex) => {
            const savedDay = savedDays[dayIndex];
            if (!savedDay) return;

            day.activities.forEach((act, actIndex) => {
              const timeStr = `${toISO(day.date)}T${act.time ?? '09:00'}:00`;

              activities.push({
                day_id: savedDay.id,
                time: timeStr,
                name: act.name ?? null,
                type: act.category ?? 'inne',
                description: act.description ?? null,
                location: act.location ?? null,
                coordinates: null,
                cost: act.estimatedCost ?? null,
                duration_minutes: null,
                order_index: actIndex,
              });
            });
          });

          const { error: activitiesError } = await createActivities(activities);

          if (activitiesError) {
            console.error('⚠️ Nie udało się zapisać aktywności:', activitiesError.message);
          } else {
            console.log('✅ Aktywności zapisane, count:', activities.length);
          }
        }
      }
    }

    return res.status(200).json({ tripPlan, tripId: savedTrip?.id ?? null });
  } catch (err) {
    return next(err);
  }
};

module.exports = { generateTripPlan };
