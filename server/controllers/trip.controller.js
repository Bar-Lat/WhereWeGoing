const { supabaseDbClient, supabaseAuthClient } = require('../configs/supabaseClient');
const { createTrip, getTripById, updateTripById } = require('../repositories/trip.repository');
const { createTripDays } = require('../repositories/tripDays.repository');
const { createActivities } = require('../repositories/activities.repository');
const { addParticipant } = require('../repositories/tripParticipants.repository');
const { getFriendRowsBetweenProfiles } = require('../repositories/friends.repository');
const {
  parseActivityCoordinates,
  parseActivityDurationMinutes,
  serializeCoordinatesForDb,
  enrichTripPlanActivities,
  normalizeDurationMinutes,
  validateTripPlanCoordinates,
} = require('../utils/activityGeo');
const { alignTransitAfterActivity } = require('../utils/scheduleTransit');
const { buildPrompt, TRANSPORT_LABELS } = require('../utils/buildTripPrompt');
const { toISO } = require('../utils/tripDates');

const getUserIdFromRequest = async (req) => {
  const accessToken = req.headers.authorization?.slice(7);
  if (!accessToken) return null;
  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;
  return data.user.id;
};

const buildActivityRow = (act, day, actIndex) => ({
  day_id: null,
  time: `${toISO(day.date)}T${act.time ?? '09:00'}:00`,
  name: act.name ?? null,
  type: act.category ?? 'inne',
  description: act.description ?? null,
  location: act.location ?? null,
  cost: act.estimatedCost ?? null,
  coordinates: serializeCoordinatesForDb(act.coordinates),
  duration_minutes: parseActivityDurationMinutes(act),
  order_index: actIndex,
});

const getUnsplashImage = async (searchQuery) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const encodedQuery = encodeURIComponent(searchQuery || 'city');
  const fallbackUrl = `https://loremflickr.com/800/600/${encodedQuery},landmark/all`;
  
  if (!accessKey) return fallbackUrl;

  try {
    const query = encodeURIComponent(`${searchQuery} city`);
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`, {
      headers: { Authorization: `Client-ID ${accessKey}` }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Unsplash API Error:", response.status, errorData);
      throw new Error(`Unsplash returned ${response.status}`);
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    } else {
      console.warn("⚠️ Unsplash nie znalazł zdjęć dla:", searchQuery);
      return fallbackUrl;
    }
  } catch (error) {
    console.error("❌ Błąd w funkcji Unsplash:", error);
    return fallbackUrl;
  }
};

const calculateTripTotalCost = (tripPlan, fallbackBudget) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];
  const fromDays = days.reduce((sum, day) => {
    const activities = Array.isArray(day.activities) ? day.activities : [];
    const activityTotal = activities.reduce((daySum, activity) => daySum + (Number(activity.estimatedCost) || 0), 0);
    if (activityTotal > 0) return sum + activityTotal;
    if (typeof day.estimatedDayCost === 'number' && !Number.isNaN(day.estimatedDayCost)) return sum + day.estimatedDayCost;
    return sum;
  }, 0);

  if (fromDays > 0) return fromDays;
  if (typeof tripPlan?.estimatedTotalCost === 'number' && !Number.isNaN(tripPlan.estimatedTotalCost)) return tripPlan.estimatedTotalCost;
  return typeof fallbackBudget === 'number' ? fallbackBudget : 0;
};

const getTripPlanSummary = (tripPlan, destination) => {
  if (typeof tripPlan?.summary === 'string' && tripPlan.summary.trim()) {
    return tripPlan.summary.trim();
  }

  const safeDestination = destination || tripPlan?.destination || 'wybranego miejsca';
  return `Plan podróży do ${safeDestination}.`;
};

const persistTripPlan = async ({ ownerId, formData, tripPlan }) => {
  const coordinateValidation = validateTripPlanCoordinates(tripPlan);
  if (!coordinateValidation.valid) {
    return { error: new Error(coordinateValidation.message) };
  }

  const { destination, departureDate, returnDate, budget } = formData;
  const totalCost = calculateTripTotalCost(tripPlan, budget);

  // Zabezpieczenie z Unsplash
  const searchTarget = tripPlan.englishDestination || destination;
  const generatedImageUrl = await getUnsplashImage(searchTarget);
  tripPlan.imageUrl = generatedImageUrl;

  const tripRow = {
    owner_id: ownerId,
    destination,
    start_date: toISO(departureDate),
    end_date: toISO(returnDate),
    total_budget: budget,
    status: 'planned',
    image_url: generatedImageUrl,
    notes: getTripPlanSummary(tripPlan, destination),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: trip, error: tripError } = await createTrip(tripRow);
  if (tripError || !trip) return { error: tripError || new Error('Nie udało się zapisać wycieczki') };

  const tripDays = (tripPlan.days || []).map((day) => ({
    trip_id: trip.id,
    day_number: day.day,
    date: toISO(day.date),
    title: day.title ?? null,
  }));

  const { data: savedDays, error: daysError } = await createTripDays(tripDays);
  if (daysError) return { error: daysError };

  const activities = [];
  (tripPlan.days || []).forEach((day, dayIndex) => {
    const savedDay = savedDays?.[dayIndex];
    if (!savedDay) return;

    (day.activities || []).forEach((act, actIndex) => {
      activities.push({
        ...buildActivityRow(act, day, actIndex),
        day_id: savedDay.id,
      });
    });
  });

  if (activities.length > 0) {
    const { error: activitiesError } = await createActivities(activities);
    if (activitiesError) return { error: activitiesError };
  }

  return { trip, totalCost };
};

const addTripParticipantsWithSplit = async ({ tripId, ownerId, selectedFriendIds, totalCost }) => {
  const uniqueFriendIds = Array.from(new Set((selectedFriendIds || []).filter((id) => typeof id === 'string' && id !== ownerId)));
  const participantIds = [ownerId, ...uniqueFriendIds];
  const amountPerPerson = participantIds.length > 0 
  ? Math.floor(totalCost / participantIds.length) 
  : 0;

  for (const friendId of uniqueFriendIds) {
    const { data: friendship, error: friendshipError } = await getFriendRowsBetweenProfiles(ownerId, friendId);
    if (friendshipError) return { error: friendshipError };
    if (!friendship || friendship.length === 0) return { error: new Error('Do wycieczki można dodawać tylko swoich znajomych') };
  }

  const { error: ownerParticipantError } = await addParticipant({ tripId, userId: ownerId, role: 'owner', amountOwed: amountPerPerson });
  if (ownerParticipantError) return { error: ownerParticipantError };

  for (const friendId of uniqueFriendIds) {
    const { error: friendError } = await addParticipant({ tripId, userId: friendId, role: 'participant', amountOwed: amountPerPerson });
    if (friendError) return { error: friendError };
  }

  return { participantCount: participantIds.length, amountPerPerson, participantIds };
};

const generateTripPlan = async (req, res, next) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ message: 'Brak klucza GROQ_API_KEY na serwerze' });
    }

    const { destination, departureDate, returnDate, travelers, budget } = req.body;

    if (!destination) {
      return res.status(400).json({ message: 'Brak wymaganego pola destination' });
    }
    if (!departureDate) {
      return res.status(400).json({ message: 'Brak wymaganego pola departureDate' });
    }
    if (!returnDate) {
      return res.status(400).json({ message: 'Brak wymaganego pola returnDate' });
    }
    if (travelers === undefined || travelers === null || travelers === '') {
      return res.status(400).json({ message: 'Brak wymaganego pola travelers' });
    }
    if (budget === undefined || budget === null || budget === '') {
      return res.status(400).json({ message: 'Brak wymaganego pola budget' });
    }

    const promptBody = { ...req.body, travelers };

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Jesteś ekspertem planowania podróży. Odpowiadasz wyłącznie JSON. Dla każdej aktywności podaj dokładny location, poprawne coordinates (WGS84) oraz durationMinutes. Nie zgaduj — używaj realnych miejsc.',
          },
          { role: 'user', content: buildPrompt(promptBody) },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.json();
      return res.status(502).json({ message: err.error?.message ?? `Groq error: ${groqResponse.status}` });
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;

    let tripPlan;
    try {
      tripPlan = JSON.parse(content);
    } catch {
      return res.status(502).json({ message: 'Nie udało się sparsować odpowiedzi AI' });
    }

    tripPlan = await enrichTripPlanActivities(tripPlan, destination);

    const coordinateValidation = validateTripPlanCoordinates(tripPlan);
    if (!coordinateValidation.valid) {
      return res.status(422).json({ message: coordinateValidation.message });
    }

    // Zapis do bazy tylko w POST /trip/accept — inaczej powstają dwie wycieczki (generate + accept).
    return res.status(200).json({ tripPlan, tripId: null });
  } catch (err) {
    return next(err);
  }
};

const acceptTripPlan = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);
    if (!user) return;

    const { formData, tripPlan, selectedFriendIds } = req.body;
    if (!formData || !tripPlan) return res.status(400).json({ message: 'Brak danych planu do zapisania' });

    const { destination, departureDate, returnDate, budget } = formData;
    if (!destination || !departureDate || !returnDate || !budget) {
      return res.status(400).json({ message: 'Brakujące dane formularza' });
    }

    const enrichedPlan = await enrichTripPlanActivities(tripPlan, destination);

    const coordinateValidation = validateTripPlanCoordinates(enrichedPlan);
    if (!coordinateValidation.valid) {
      return res.status(422).json({ message: coordinateValidation.message });
    }

    const { trip, totalCost, error: persistError } = await persistTripPlan({
      ownerId: user.id,
      formData,
      tripPlan: enrichedPlan,
    });
    if (persistError || !trip) return res.status(500).json({ message: persistError?.message || 'Nie udało się zapisać wycieczki' });

    const { participantCount, amountPerPerson, error: participantsError } = await addTripParticipantsWithSplit({
      tripId: trip.id,
      ownerId: user.id,
      selectedFriendIds: Array.isArray(selectedFriendIds) ? selectedFriendIds : [],
      totalCost,
    });

    if (participantsError) return res.status(500).json({ message: participantsError.message || 'Nie udało się dodać uczestników' });

    return res.status(201).json({
      message: 'Wycieczka została zaakceptowana i zapisana.',
      tripId: trip.id,
      tripPlan: enrichedPlan,
      totalCost,
      participantCount,
      amountPerPerson,
    });
  } catch (err) {
    return next(err);
  }
};

const updateTripHandler = async (req, res, next) => {
  try {
    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) return res.status(401).json({ message: 'Brak autoryzacji' });

    const { id } = req.params;
    const { tripPlan } = req.body;
    if (!tripPlan) return res.status(400).json({ message: 'Brak danych do zapisu' });

    const { data: trip, error: fetchError } = await getTripById(id);
    if (fetchError || !trip) return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    if (trip.owner_id !== ownerId) return res.status(403).json({ message: 'Brak dostępu do tej wycieczki' });

    const enrichedPlan = await enrichTripPlanActivities(tripPlan, trip.destination || tripPlan.destination || '');

    const coordinateValidation = validateTripPlanCoordinates(enrichedPlan);
    if (!coordinateValidation.valid) {
      return res.status(422).json({ message: coordinateValidation.message });
    }

    const updateData = {
      notes: getTripPlanSummary(enrichedPlan, trip.destination || tripPlan.destination),
      total_budget: enrichedPlan.estimatedTotalCost || trip.total_budget,
      image_url: enrichedPlan.imageUrl || trip.image_url,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await updateTripById(id, updateData);
    if (updateError) return res.status(500).json({ message: updateError.message });

    const { supabaseDbClient } = require('../configs/supabaseClient');
    const { data: oldDays } = await supabaseDbClient.from('trip_days').select('id').eq('trip_id', id);
    if (oldDays && oldDays.length > 0) {
      const oldDayIds = oldDays.map(d => d.id);
      await supabaseDbClient.from('activities').delete().in('day_id', oldDayIds);
      await supabaseDbClient.from('trip_days').delete().eq('trip_id', id);
    }

    if (enrichedPlan.days && enrichedPlan.days.length > 0) {
      const newTripDays = enrichedPlan.days.map((day) => ({
        trip_id: id,
        day_number: day.day,
        date: toISO(day.date),
        title: day.title ?? null,
      }));

      const { data: savedDays, error: daysError } = await createTripDays(newTripDays);
      if (!daysError && savedDays) {
        const activities = [];
        enrichedPlan.days.forEach((day, dayIndex) => {
          const savedDay = savedDays[dayIndex];
          if (!savedDay) return;
          day.activities.forEach((act, actIndex) => {
            const timeStr = act.time ? `${toISO(day.date)}T${act.time}:00` : null;
            activities.push({
              day_id: savedDay.id,
              time: timeStr,
              name: act.name ?? null,
              type: act.category ?? 'inne',
              description: act.description ?? null,
              location: act.location ?? null,
              cost: act.estimatedCost ?? null,
              coordinates: serializeCoordinatesForDb(act.coordinates),
              duration_minutes: parseActivityDurationMinutes(act),
              order_index: actIndex,
            });
          });
        });
        if (activities.length > 0) await createActivities(activities);
      }
    }
    return res.status(200).json({
      message: 'Pełna synchronizacja wycieczki zakończona sukcesem',
      tripPlan: enrichedPlan,
    });
  } catch (err) {
    console.error("Błąd aktualizacji:", err);
    return next(err);
  }
};

const parseAccessToken = (req) => {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  if (typeof req.body?.accessToken === 'string') return req.body.accessToken;
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
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatActivityTime = (value) => {
  if (!value || typeof value !== 'string') {
    return '09:00';
  }

  if (value.includes('T')) {
    const timePart = value.split('T')[1] || '';
    return timePart.slice(0, 5) || '09:00';
  }

  return value.slice(0, 5);
};

const getTripHistory = async (req, res, next) => {
  // Pomińmy ciało getTripHistory dla oszczędności znaków - ono jest takie jak miałeś z wersji 'main'
  try {
    const user = await resolveAuthenticatedUser(req, res);
    if (!user) return;

    const { data: participantRows, error: participantError } = await supabaseDbClient
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', user.id);
    if (participantError) return res.status(500).json({ message: 'Nie udało się pobrać uczestnictwa użytkownika.' });

    const tripIds = (participantRows || []).map((row) => row.trip_id).filter((id) => typeof id === 'string');
    if (tripIds.length === 0) return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips: [] });

    const { data: tripsData, error: tripsError } = await supabaseDbClient
      .from('trips')
      .select('id, destination, start_date, end_date, total_budget, image_url')
      .in('id', tripIds);
    if (tripsError) return res.status(500).json({ message: 'Nie udało się pobrać wycieczek do historii.' });

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
    if (dayError) return res.status(500).json({ message: 'Nie udało się pobrać dni podróży.' });

    const dayIds = (dayRows || []).map((row) => row.id).filter((id) => typeof id === 'string');
    const activitiesData = [];
    if (dayIds.length > 0) {
      const { data: rawActivities, error: activityError } = await supabaseDbClient
        .from('activities')
        .select('id, day_id, name, time, type, description, location, coordinates, cost, duration_minutes, order_index')
        .in('day_id', dayIds)
        .order('order_index', { ascending: true });
      if (activityError) return res.status(500).json({ message: 'Nie udało się pobrać aktywności.' });
      activitiesData.push(...(rawActivities || []));
    }

    const daysById = new Map();
    (dayRows || []).forEach((row) => {
      daysById.set(row.id, {
        dayId: row.id,
        tripId: row.trip_id,
        dayNumber: typeof row.day_number === 'number' ? row.day_number : null,
        date: typeof row.date === 'string' ? row.date : null,
        title: typeof row.title === 'string' ? row.title : null,
        activities: [],
      });
    });

    const spentByTripId = new Map();
    (activitiesData || []).forEach((activity) => {
      const day = daysById.get(activity.day_id);
      if (!day) return;
      const cost = toNumber(activity.cost);
      if (cost !== null) spentByTripId.set(day.tripId, (spentByTripId.get(day.tripId) || 0) + cost);
      day.activities.push({
        id: activity.id,
        dayId: activity.day_id,
        name: activity.name || 'Aktywność',
        time: formatActivityTime(activity.time),
        category: activity.type || 'inne',
        description: activity.description || '',
        location: activity.location || '',
        coordinates: parseActivityCoordinates(activity.coordinates),
        cost,
        duration_minutes: toNumber(activity.duration_minutes),
        order_index: typeof activity.order_index === 'number' ? activity.order_index : null,
      });
    });

    const daysByTrip = new Map();
    Array.from(daysById.values()).forEach((day) => {
      if (!daysByTrip.has(day.tripId)) daysByTrip.set(day.tripId, []);
      daysByTrip.get(day.tripId).push(day);
    });

    const trips = validTrips.map((trip) => {
      const days = (daysByTrip.get(trip.id) || [])
        .sort((a, b) => (a.dayNumber !== null && b.dayNumber !== null) ? a.dayNumber - b.dayNumber : 0)
        .map((day) => ({
          dayId: day.dayId,
          dayNumber: day.dayNumber,
          date: day.date,
          title: day.title,
          activities: day.activities.sort((a, b) => (a.order_index !== null && b.order_index !== null) ? a.order_index - b.order_index : 0),
        }));
      const spentTotal = spentByTripId.get(trip.id);
      return { ...trip, total: spentTotal !== undefined ? spentTotal : null, days };
    });

    return res.status(200).json({ message: 'Historia podróży pobrana poprawnie.', trips });
  } catch (err) {
    return next(err);
  }
};

const roundMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
};

const parseScheduleTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const validateTripPlanScheduleTimes = (tripPlan) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];

  for (const day of days) {
    const activities = Array.isArray(day?.activities) ? day.activities : [];
    if (activities.length <= 1) continue;

    const seenMinutes = new Set();
    let previousMinutes = null;

    for (const activity of activities) {
      const minutes = parseScheduleTimeToMinutes(activity?.time);
      if (minutes === null) {
        return {
          valid: false,
          message: `Dzien ${day.day}: nieprawidlowa godzina "${activity?.time || ''}" przy "${activity?.name || 'atrakcji'}".`,
        };
      }
      if (seenMinutes.has(minutes)) {
        return {
          valid: false,
          message: `Dzien ${day.day}: dwie aktywnosci maja ta sama godzine (${activity.time}).`,
        };
      }
      if (previousMinutes !== null && minutes < previousMinutes) {
        return {
          valid: false,
          message: `Dzien ${day.day}: "${activity.name}" (${activity.time}) jest wczesniej niz poprzednia aktywnosc w kolejnosci.`,
        };
      }
      seenMinutes.add(minutes);
      previousMinutes = minutes;
    }
  }

  return { valid: true, message: '' };
};

const resolveActivityLocation = (primary, fallback) => {
  const primaryLocation = typeof primary?.location === 'string' ? primary.location.trim() : '';
  if (primaryLocation) return primaryLocation;
  const fallbackLocation = typeof fallback?.location === 'string' ? fallback.location.trim() : '';
  if (fallbackLocation) return fallbackLocation;
  return '';
};

const canGenerateTransitBetween = (from, to) => {
  const fromLocation = resolveActivityLocation(from, to);
  const toLocation = resolveActivityLocation(to, from);
  if (!fromLocation || !toLocation) return false;
  return fromLocation.toLowerCase() !== toLocation.toLowerCase();
};

const buildRefinePrompt = (tripPlan, preferredTransport) => {
  const transport = (preferredTransport || []).map((t) => TRANSPORT_LABELS[t] ?? t).join(', ') || 'dowolny';
  const destination = tripPlan?.destination || 'cel podróży';
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

Dla KAŻDEJ aktywności uzupełnij brakujące pola:
- location — pełny adres w ${destination}, jeśli brakuje lub jest zbyt ogólny
- durationMinutes — realistyczny czas wizyty (min.), spójny z godziną następnej aktywności
- coordinates — WGS84 dla tego samego miejsca co location (gdy brak pewności — uzupełnij location tak precyzyjnie, że da się je znaleźć na mapie)

Priorytet: POPRAWNOŚĆ, nie szybkość. Nie zmieniaj kolejności, nazw ani godzin aktywnosci (time).

Preferowany transport na miejscu: ${transport}.
Generuj transit tylko miedzy sasiednimi aktywnosciami, gdy da sie ustalic trase: uzyj location aktywnosci, a gdy brak - location sasiedniej aktywnosci. Gdy nadal brak sensownej trasy - pomin ten transit.
Godziny transitow musza byc chronologiczne wzgledem godzin aktywnosci.
startTime kazdego transitu MUSI byc >= koniec poprzedniej aktywnosci (time + durationMinutes). Transport nie moze zaczynac sie w trakcie poprzedniej atrakcji.

Zwróć WYŁĄCZNIE pełny obiekt JSON planu (ten sam schemat co wejście + transits w każdym dniu + uzupełnione location/durationMinutes).

PLAN:
${JSON.stringify(tripPlan)}`;
};

const mergeRefinedTripPlan = (originalPlan, refinedPlan) => {
  const originalDays = Array.isArray(originalPlan?.days) ? originalPlan.days : [];
  const refinedDays = Array.isArray(refinedPlan?.days) ? refinedPlan.days : [];

  return {
    ...originalPlan,
    ...refinedPlan,
    days: originalDays.map((day, index) => {
      const refinedDay = refinedDays.find((item) => item.day === day.day) || refinedDays[index];
      if (!refinedDay) return day;

      const activities = Array.isArray(day.activities) ? day.activities : [];
      const refinedActivities = Array.isArray(refinedDay.activities) ? refinedDay.activities : activities;

      return {
        ...day,
        activities: activities.map((activity, actIndex) => {
          const refined = refinedActivities[actIndex] || {};
          const merged = {
            ...activity,
            ...refined,
            id: activity.id,
            location: refined.location || activity.location,
          };

          return {
            ...merged,
            durationMinutes: normalizeDurationMinutes(merged, activities, actIndex),
            coordinates:
              serializeCoordinatesForDb(refined.coordinates) ??
              serializeCoordinatesForDb(activity.coordinates) ??
              undefined,
          };
        }),
        transits: Array.isArray(refinedDay.transits)
          ? refinedDay.transits
              .map((transit, transitIndex) => {
                const mergedActivities = activities.map((activity, actIndex) => ({
                  ...activity,
                  ...(refinedActivities[actIndex] || {}),
                  durationMinutes: normalizeDurationMinutes(
                    { ...(refinedActivities[actIndex] || {}), ...activity },
                    activities,
                    actIndex
                  ),
                }));
                const from = mergedActivities[
                  typeof transit.afterActivityIndex === 'number' ? transit.afterActivityIndex : transitIndex
                ];
                const rawStart = String(transit.startTime || '09:00').slice(0, 5);
                const rawEnd = String(transit.endTime || '09:30').slice(0, 5);
                const aligned = from
                  ? alignTransitAfterActivity(from, rawStart, rawEnd)
                  : { startTime: rawStart, endTime: rawEnd };

                return {
                  afterActivityIndex:
                    typeof transit.afterActivityIndex === 'number' ? transit.afterActivityIndex : transitIndex,
                  modeLabel: transit.modeLabel || 'Transport',
                  estimatedCost: roundMoney(transit.estimatedCost),
                  startTime: aligned.startTime,
                  endTime: aligned.endTime,
                };
              })
              .filter((transit) => {
                const mergedActivities = activities.map((activity, actIndex) => ({
                  ...activity,
                  ...(refinedActivities[actIndex] || {}),
                }));
                const from = mergedActivities[transit.afterActivityIndex];
                const to = mergedActivities[transit.afterActivityIndex + 1];
                return from && to && canGenerateTransitBetween(from, to);
              })
          : day.transits,
      };
    }),
  };
};

const refineTripPlanWithAi = async (tripPlan, preferredTransport) => {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('Brak klucza GROQ_API_KEY na serwerze');
  }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Jesteś asystentem planowania podróży. Zawsze odpowiadasz wyłącznie w formacie JSON, bez dodatkowego tekstu.',
        },
        { role: 'user', content: buildRefinePrompt(tripPlan, preferredTransport) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.json();
    throw new Error(err.error?.message ?? `Groq error: ${groqResponse.status}`);
  }

  const groqData = await groqResponse.json();
  const content = groqData.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Pusta odpowiedz AI');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Nie udalo sie sparsowac odpowiedzi AI jako JSON');
  }
};

const refineTripPlanHandler = async (req, res, next) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'Brak klucza GROQ_API_KEY na serwerze' });
    }

    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { tripPlan, preferredTransport, tripId } = req.body;
    if (!tripPlan || !Array.isArray(tripPlan.days)) {
      return res.status(400).json({ message: 'Brak planu do dopracowania' });
    }

    if (tripId) {
      const { data: trip, error: fetchError } = await getTripById(tripId);
      if (fetchError || !trip) {
        return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
      }
      if (trip.owner_id !== ownerId) {
        return res.status(403).json({ message: 'Brak dostepu do tej wycieczki' });
      }
    }

    const scheduleValidation = validateTripPlanScheduleTimes(tripPlan);
    if (!scheduleValidation.valid) {
      return res.status(400).json({ message: scheduleValidation.message });
    }

    let refinedRaw;
    try {
      refinedRaw = await refineTripPlanWithAi(tripPlan, preferredTransport);
    } catch (error) {
      return res.status(502).json({ message: error.message || 'Nie udalo sie wygenerowac transportow' });
    }

    const mergedPlan = mergeRefinedTripPlan(tripPlan, refinedRaw);
    const enrichedPlan = await enrichTripPlanActivities(
      mergedPlan,
      mergedPlan?.destination || tripPlan?.destination || ''
    );

    const coordinateValidation = validateTripPlanCoordinates(enrichedPlan);
    if (!coordinateValidation.valid) {
      return res.status(422).json({ message: coordinateValidation.message });
    }

    if (tripId) {
      const { error: updateError } = await updateTripById(tripId, {
        notes: getTripPlanSummary(enrichedPlan, enrichedPlan?.destination || tripPlan?.destination),
        updated_at: new Date().toISOString(),
      });
      if (updateError) {
        return res.status(500).json({ message: updateError.message || 'Nie udalo sie zapisac transportow' });
      }
    }

    return res.status(200).json({
      tripPlan: enrichedPlan,
      refined: true,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { generateTripPlan, acceptTripPlan, updateTripHandler, getTripHistory, refineTripPlanHandler };
