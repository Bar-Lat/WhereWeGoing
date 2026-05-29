const { supabaseDbClient, supabaseAuthClient } = require('../configs/supabaseClient');
const { createTrip } = require('../repositories/trip.repository');
const { createTripDays } = require('../repositories/tripDays.repository');
const { createActivities } = require('../repositories/activities.repository');
const { addParticipant } = require('../repositories/tripParticipants.repository');
const { getFriendRowsBetweenProfiles } = require('../repositories/friends.repository');

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
Wszystkie koszty (estimatedCost, estimatedDayCost, estimatedTotalCost) dotyczą CAŁEJ grupy ${data.travelers} osób, nie jednej osoby.
estimatedDayCost każdego dnia musi być równy sumie estimatedCost aktywności tego dnia.
Suma estimatedDayCost ze wszystkich dni powinna być zbliżona do budżetu ${data.budget} PLN.`;
};

const toISO = (ddmmyyyy) => {
  const [day, month, year] = ddmmyyyy.split('.');
  return `${year}-${month}-${day}`;
};

const calculateTripTotalCost = (tripPlan, fallbackBudget) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];
  const fromDays = days.reduce((sum, day) => {
    const activities = Array.isArray(day.activities) ? day.activities : [];
    const activityTotal = activities.reduce(
      (daySum, activity) => daySum + (Number(activity.estimatedCost) || 0),
      0
    );

    if (activityTotal > 0) {
      return sum + activityTotal;
    }

    if (typeof day.estimatedDayCost === 'number' && !Number.isNaN(day.estimatedDayCost)) {
      return sum + day.estimatedDayCost;
    }

    return sum;
  }, 0);

  if (fromDays > 0) {
    return fromDays;
  }

  if (typeof tripPlan?.estimatedTotalCost === 'number' && !Number.isNaN(tripPlan.estimatedTotalCost)) {
    return tripPlan.estimatedTotalCost;
  }

  return typeof fallbackBudget === 'number' ? fallbackBudget : 0;
};

const persistTripPlan = async ({ ownerId, formData, tripPlan }) => {
  const { destination, departureDate, returnDate, budget } = formData;
  const totalCost = calculateTripTotalCost(tripPlan, budget);

  const tripRow = {
    owner_id: ownerId,
    destination,
    start_date: toISO(departureDate),
    end_date: toISO(returnDate),
    total_budget: budget,
    status: 'planned',
    image_url: '',
    notes: tripPlan.summary ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: trip, error: tripError } = await createTrip(tripRow);
  if (tripError || !trip) {
    return { error: tripError || new Error('Nie udało się zapisać wycieczki') };
  }

  const tripDays = (tripPlan.days || []).map((day) => ({
    trip_id: trip.id,
    day_number: day.day,
    date: toISO(day.date),
    title: day.title ?? null,
  }));

  const { data: savedDays, error: daysError } = await createTripDays(tripDays);
  if (daysError) {
    return { error: daysError };
  }

  const activities = [];
  (tripPlan.days || []).forEach((day, dayIndex) => {
    const savedDay = savedDays?.[dayIndex];
    if (!savedDay) {
      return;
    }

    (day.activities || []).forEach((act, actIndex) => {
      activities.push({
        day_id: savedDay.id,
        time: `${toISO(day.date)}T${act.time ?? '09:00'}:00`,
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

  if (activities.length > 0) {
    const { error: activitiesError } = await createActivities(activities);
    if (activitiesError) {
      return { error: activitiesError };
    }
  }

  return { trip, totalCost };
};

const addTripParticipantsWithSplit = async ({ tripId, ownerId, selectedFriendIds, totalCost }) => {
  const uniqueFriendIds = Array.from(new Set((selectedFriendIds || []).filter((id) => typeof id === 'string' && id !== ownerId)));
  const participantIds = [ownerId, ...uniqueFriendIds];
  const amountPerPerson = participantIds.length > 0 ? totalCost / participantIds.length : 0;

  for (const friendId of uniqueFriendIds) {
    const { data: friendship, error: friendshipError } = await getFriendRowsBetweenProfiles(ownerId, friendId);
    if (friendshipError) {
      return { error: friendshipError };
    }
    if (!friendship || friendship.length === 0) {
      return { error: new Error('Do wycieczki można dodawać tylko swoich znajomych') };
    }
  }

  const { error: ownerParticipantError } = await addParticipant({
    tripId,
    userId: ownerId,
    role: 'owner',
    amountOwed: amountPerPerson,
  });

  if (ownerParticipantError) {
    return { error: ownerParticipantError };
  }

  for (const friendId of uniqueFriendIds) {
    const { error: friendError } = await addParticipant({
      tripId,
      userId: friendId,
      role: 'participant',
      amountOwed: amountPerPerson,
    });

    if (friendError) {
      return { error: friendError };
    }
  }

  return {
    participantCount: participantIds.length,
    amountPerPerson,
    participantIds,
  };
};

const generateTripPlan = async (req, res, next) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ message: 'Brak klucza GROQ_API_KEY na serwerze' });
    }

    const { destination, departureDate, returnDate, travelers, budget, selectedFriendIds } = req.body;
    const friendCount = Array.isArray(selectedFriendIds) ? selectedFriendIds.length : 0;
    const travelersCount = typeof travelers === 'number' && travelers > 0 ? travelers : friendCount + 1;

    if (!destination || !departureDate || !returnDate || !budget) {
      return res.status(400).json({ message: 'Brakujące dane formularza' });
    }

    const promptBody = {
      ...req.body,
      travelers: travelersCount,
    };

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
            content: buildPrompt(promptBody),
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

    return res.status(200).json({ tripPlan });
  } catch (err) {
    return next(err);
  }
};

const acceptTripPlan = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);
    if (!user) {
      return;
    }

    const { formData, tripPlan, selectedFriendIds } = req.body;

    if (!formData || !tripPlan) {
      return res.status(400).json({ message: 'Brak danych planu do zapisania' });
    }

    const { destination, departureDate, returnDate, budget } = formData;
    if (!destination || !departureDate || !returnDate || !budget) {
      return res.status(400).json({ message: 'Brakujące dane formularza' });
    }

    const { trip, totalCost, error: persistError } = await persistTripPlan({
      ownerId: user.id,
      formData,
      tripPlan,
    });

    if (persistError || !trip) {
      return res.status(500).json({ message: persistError?.message || 'Nie udało się zapisać wycieczki' });
    }

    const { participantCount, amountPerPerson, error: participantsError } = await addTripParticipantsWithSplit({
      tripId: trip.id,
      ownerId: user.id,
      selectedFriendIds: Array.isArray(selectedFriendIds) ? selectedFriendIds : [],
      totalCost,
    });

    if (participantsError) {
      return res.status(500).json({ message: participantsError.message || 'Nie udało się dodać uczestników' });
    }

    return res.status(201).json({
      message: 'Wycieczka została zaakceptowana i zapisana.',
      tripId: trip.id,
      totalCost,
      participantCount,
      amountPerPerson,
    });
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

const toNumber = (value) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripHistory = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);
    if (!user) {
      return;
    }

    const { data: participantRows, error: participantError } = await supabaseDbClient
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', user.id);

    if (participantError) {
      return res.status(500).json({ message: 'Nie udało się pobrać uczestnictwa użytkownika.' });
    }

    const tripIds = (participantRows || [])
      .map((row) => row.trip_id)
      .filter((id) => typeof id === 'string');

    if (tripIds.length === 0) {
      return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips: [] });
    }

    const { data: tripsData, error: tripsError } = await supabaseDbClient
      .from('trips')
      .select('id, destination, start_date, end_date, total_budget, image_url')
      .in('id', tripIds);

    if (tripsError) {
      return res.status(500).json({ message: 'Nie udało się pobrać wycieczek do historii.' });
    }

    const validTrips = (tripsData || [])
      .filter((trip) => trip && trip.id)
      .map((trip) => ({
        id: trip.id,
        destination: trip.destination || 'Brak celu',
        startDate: trip.start_date || null,
        endDate: trip.end_date || null,
        total: null,
        budget: toNumber(trip.total_budget),
        imageUrl: trip.image_url || null,
      }));

    const { data: dayRows, error: dayError } = await supabaseDbClient
      .from('trip_days')
      .select('id, trip_id, day_number, date, title')
      .in('trip_id', tripIds);

    if (dayError) {
      return res.status(500).json({ message: 'Nie udało się pobrać dni podróży.' });
    }

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
        return res.status(500).json({ message: 'Nie udało się pobrać aktywności.' });
      }

      activitiesData.push(...(rawActivities || []));
    }

    const daysById = new Map();
    (dayRows || []).forEach((row) => {
      daysById.set(row.id, {
        dayId: row.id,
        tripId: row.trip_id,
        dayNumber: typeof row.day_number === 'number' ? row.day_number : null,
        date: typeof row.date === 'string' ? row.date : null,
        activities: [],
      });
    });

    const spentByTripId = new Map();

    (activitiesData || []).forEach((activity) => {
      const day = daysById.get(activity.day_id);
      if (!day) {
        return;
      }

      const cost = toNumber(activity.cost);
      if (cost !== null) {
        spentByTripId.set(day.tripId, (spentByTripId.get(day.tripId) || 0) + cost);
      }

      day.activities.push({
        id: activity.id,
        dayId: activity.day_id,
        name: activity.name || 'Aktywność',
        time: typeof activity.time === 'string' ? activity.time : null,
        cost,
        duration_minutes: toNumber(activity.duration_minutes),
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
          return 0;
        })
        .map((day) => ({
          dayId: day.dayId,
          dayNumber: day.dayNumber,
          date: day.date,
          activities: day.activities.sort((a, b) => {
            if (a.order_index !== null && b.order_index !== null) {
              return a.order_index - b.order_index;
            }
            return 0;
          }),
        }));

      const spentTotal = spentByTripId.get(trip.id);

      return {
        ...trip,
        total: spentTotal !== undefined ? spentTotal : null,
        days,
      };
    });

    return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips });
  } catch (err) {
    return next(err);
  }
};

module.exports = { generateTripPlan, getTripHistory, acceptTripPlan };
