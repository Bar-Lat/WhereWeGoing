const { supabaseDbClient, supabaseAuthClient } = require('../configs/supabaseClient');

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

const parseAccessToken = (req) => {
  const header = req.headers.authorization;

  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  if (typeof req.body?.accessToken === 'string') {
    return req.body.accessToken;
  }

  return null;
};

const resolveAuthenticatedUser = async (req, res) => {
  const accessToken = parseAccessToken(req);

  if (!accessToken) {
    res.status(401).json({ message: 'Brak access tokena' });
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    res.status(401).json({ message: 'Niepoprawny lub wygasly access token' });
    return null;
  }

  return data.user;
};

const getTripHistory = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);
    if (!user) {
      return;
    }

    console.log('📍 getTripHistory: Pobieranie historii dla użytkownika:', user.id);

    const { data: participantRows, error: participantError } = await supabaseDbClient
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', user.id);

    if (participantError) {
      console.error('❌ Błąd przy pobraniu trip_participants:', participantError);
      return res.status(500).json({ message: 'Nie udało się pobrać uczestnictwa użytkownika.' });
    }

    console.log('✅ trip_participants:', participantRows);

    const tripIds = (participantRows || [])
      .map((row) => row.trip_id)
      .filter((id) => typeof id === 'string');

    console.log('📍 tripIds:', tripIds);

    if (tripIds.length === 0) {
      console.log('⚠️  Użytkownik nie ma żadnych wycieczek');
      return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips: [] });
    }

    const { data: tripsData, error: tripsError } = await supabaseDbClient
      .from('trips')
      .select('id, destination, departure_date, return_date, total, budget, image_url')
      .in('id', tripIds);

    if (tripsError) {
      console.error('❌ Błąd przy pobraniu trips:', tripsError);
      return res.status(500).json({ message: 'Nie udało się pobrać wycieczek do historii.' });
    }

    console.log('✅ trips:', tripsData);

    const validTrips = (tripsData || [])
      .filter((trip) => trip && trip.id)
      .map((trip) => ({
        id: trip.id,
        destination: trip.destination || 'Brak celu',
        startDate: trip.departure_date || trip.start_date || null,
        endDate: trip.return_date || trip.end_date || null,
        total: typeof trip.total === 'number' ? trip.total : trip.total ? Number(trip.total) : null,
        budget: typeof trip.budget === 'number' ? trip.budget : trip.budget ? Number(trip.budget) : null,
        imageUrl: trip.image_url || null,
      }));

    console.log('📍 validTrips:', validTrips);

    const { data: dayRows, error: dayError } = await supabaseDbClient
      .from('trip_days')
      .select('id, trip_id, day_number, order_index')
      .in('trip_id', tripIds);

    if (dayError) {
      console.error('❌ Błąd przy pobraniu trip_days:', dayError);
      return res.status(500).json({ message: 'Nie udało się pobrać dni podróży.' });
    }

    console.log('✅ trip_days:', dayRows);

    const dayIds = (dayRows || [])
      .map((row) => row.id)
      .filter((id) => typeof id === 'string');

    const activitiesData = [];
    if (dayIds.length > 0) {
      const { data: rawActivities, error: activityError } = await supabaseDbClient
        .from('activities')
        .select('id, day_id, name, time, cost, duration_minutes, order_index')
        .in('day_id', dayIds)
        .order('order_index', { ascending: true });

      if (activityError) {
        console.error('❌ Błąd przy pobraniu activities:', activityError);
        return res.status(500).json({ message: 'Nie udało się pobrać aktywności.' });
      }

      console.log('✅ activities:', rawActivities);
      activitiesData.push(...(rawActivities || []));
    }

    const daysById = new Map();
    (dayRows || []).forEach((row) => {
      daysById.set(row.id, {
        dayId: row.id,
        tripId: row.trip_id,
        dayNumber: typeof row.day_number === 'number' ? row.day_number : null,
        orderIndex: typeof row.order_index === 'number' ? row.order_index : null,
        activities: [],
      });
    });

    (activitiesData || []).forEach((activity) => {
      const day = daysById.get(activity.day_id);
      if (!day) {
        return;
      }
      day.activities.push({
        id: activity.id,
        name: activity.name || 'Aktywność',
        time: typeof activity.time === 'string' ? activity.time : null,
        cost: typeof activity.cost === 'number' ? activity.cost : activity.cost ? Number(activity.cost) : null,
        duration_minutes: typeof activity.duration_minutes === 'number' ? activity.duration_minutes : activity.duration_minutes ? Number(activity.duration_minutes) : null,
        order_index: typeof activity.order_index === 'number' ? activity.order_index : null,
      });
    });

    const daysByTrip = new Map();
    Array.from(daysById.values()).forEach((day) => {
      if (!daysByTrip.has(day.tripId)) {
        daysByTrip.set(day.tripId, []);
      }
      daysByTrip.get(day.tripId).push(day);
    });

    const trips = validTrips.map((trip) => {
      const days = (daysByTrip.get(trip.id) || [])
        .sort((a, b) => {
          if (a.dayNumber !== null && b.dayNumber !== null) {
            return a.dayNumber - b.dayNumber;
          }
          if (a.orderIndex !== null && b.orderIndex !== null) {
            return a.orderIndex - b.orderIndex;
          }
          return 0;
        })
        .map((day) => ({
          dayId: day.dayId,
          dayNumber: day.dayNumber,
          activities: day.activities.sort((a, b) => {
            if (a.order_index !== null && b.order_index !== null) {
              return a.order_index - b.order_index;
            }
            return 0;
          }),
        }));

      return {
        ...trip,
        days,
      };
    });

    console.log('📍 Finalna odpowiedź trips:', trips);
    return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips });
  } catch (err) {
    console.error('❌ Błąd w getTripHistory:', err);
    return next(err);
  }
};

module.exports = { generateTripPlan, getTripHistory };