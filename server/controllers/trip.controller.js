const { supabaseAuthClient } = require('../configs/supabaseClient');
const { createTrip, getTripById, updateTripById } = require('../repositories/trip.repository'); // <-- DODANO getTripById
const { createTripDays } = require('../repositories/tripDays.repository');
const { createActivities } = require('../repositories/activities.repository');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Pomocnik do wyciągania userId z tokena bezpośrednio w tym kontrolerze
const getUserIdFromRequest = async (req) => {
  const accessToken = req.headers.authorization?.slice(7);
  if (!accessToken) return null;

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;

  return data.user.id;
};

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

const toISO = (ddmmyyyy) => {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return null;
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

const getUnsplashImage = async (searchQuery) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  // Zabezpieczamy URI na wypadek, gdyby searchQuery było puste
  const encodedQuery = encodeURIComponent(searchQuery || 'city');
  const fallbackUrl = `https://loremflickr.com/800/600/${encodedQuery},landmark/all`;
  
  console.log("Czy klucz API istnieje?", !!accessKey);

  if (!accessKey) return fallbackUrl;

  try {
    // Zmienna zadeklarowana tylko raz
    const query = encodeURIComponent(`${searchQuery} city`);
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Unsplash API Error:", response.status, errorData);
      throw new Error(`Unsplash returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const url = data.results[0].urls.regular;
      console.log("✅ Znaleziono zdjęcie na Unsplash:", url);
      return url;
    } else {
      console.warn("⚠️ Unsplash nie znalazł zdjęć dla:", searchQuery);
      return fallbackUrl;
    }
  } catch (error) {
    console.error("❌ Błąd w funkcji Unsplash:", error);
    return fallbackUrl;
  }
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

    const accessToken = req.headers.authorization?.slice(7);
    let ownerId = null;

    if (accessToken) {
      const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
      ownerId = data?.user?.id ?? null;
    }

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

    let savedTrip = null;
    
    if (ownerId) {
      // DODANO ZABEZPIECZENIE: Użyj englishDestination od AI, a w razie jego braku - użyj oryginalnego destination
      const searchTarget = tripPlan.englishDestination || destination;
      
      const generatedImageUrl = await getUnsplashImage(searchTarget);
      console.log("Wygenerowany URL obrazu:", generatedImageUrl);
      
      tripPlan.imageUrl = generatedImageUrl; 

      const tripRow = {
        owner_id: ownerId,
        destination,

        start_date: toISO(departureDate),
        end_date: toISO(returnDate),
        total_budget: budget,
        status: 'planned',
        image_url: generatedImageUrl,
        notes: JSON.stringify(tripPlan),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: trip, error: tripError } = await createTrip(tripRow);

      if (tripError) {
        console.error('⚠️ Nie udało się zapisać wycieczki:', tripError.message);
      } else {
        savedTrip = trip;

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
          }
        }
      }
    }

    return res.status(200).json({ tripPlan, tripId: savedTrip?.id ?? null });
  } catch (err) {
    return next(err);
  }
};

const updateTripHandler = async (req, res, next) => {
  try {
    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { tripPlan } = req.body;

    if (!tripPlan) {
      return res.status(400).json({ message: 'Brak danych do zapisu' });
    }

    const { data: trip, error: fetchError } = await getTripById(id);
    if (fetchError || !trip) return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    if (trip.owner_id !== ownerId) return res.status(403).json({ message: 'Brak dostępu do tej wycieczki' });

    // 1. Aktualizacja głównej tabeli (trips)
    const updateData = {
  notes: JSON.stringify(tripPlan),
  total_budget: tripPlan.estimatedTotalCost || trip.total_budget,
  image_url: tripPlan.imageUrl || trip.image_url,
  updated_at: new Date().toISOString()
};

    const { error: updateError } = await updateTripById(id, updateData);
    if (updateError) {
      return res.status(500).json({ message: updateError.message });
    }

    // 2. SYNCHRONIZACJA TABEL RELACYJNYCH (Twardy reset)
    const { supabaseDbClient } = require('../configs/supabaseClient');
    
    // a) Pobieramy stare dni i czyścimy bazę
    const { data: oldDays } = await supabaseDbClient.from('trip_days').select('id').eq('trip_id', id);
    if (oldDays && oldDays.length > 0) {
      const oldDayIds = oldDays.map(d => d.id);
      await supabaseDbClient.from('activities').delete().in('day_id', oldDayIds);
      await supabaseDbClient.from('trip_days').delete().eq('trip_id', id);
    }

    // b) Wstawiamy od nowa w 100% uaktualnione dane z aplikacji
    if (tripPlan.days && tripPlan.days.length > 0) {
      const newTripDays = tripPlan.days.map((day) => ({
        trip_id: id,
        day_number: day.day,
        date: toISO(day.date),
        title: day.title ?? null,
      }));

      const { data: savedDays, error: daysError } = await createTripDays(newTripDays);
      
      if (!daysError && savedDays) {
        const activities = [];
        
        tripPlan.days.forEach((day, dayIndex) => {
          const savedDay = savedDays[dayIndex];
          if (!savedDay) return;

          day.activities.forEach((act, actIndex) => {
            // Zabezpieczenie przed pustym czasem
            const timeStr = act.time ? `${toISO(day.date)}T${act.time}:00` : null;
            
            activities.push({
              day_id: savedDay.id,
              time: timeStr,
              name: act.name ?? null,
              type: act.category ?? 'inne',
              description: act.description ?? null,
              location: act.location ?? null,
              cost: act.estimatedCost ?? null,
              order_index: actIndex,
            });
          });
        });

        if (activities.length > 0) {
          await createActivities(activities);
        }
      }
    }

    return res.status(200).json({ message: 'Pełna synchronizacja wycieczki zakończona sukcesem' });
  } catch (err) {
    console.error("Błąd aktualizacji:", err);
    return next(err);
  }
};

module.exports = { generateTripPlan, updateTripHandler };