const { supabaseAuthClient } = require('../configs/supabaseClient');
const { getTripsByOwnerId, getTripById, getTripsByIds, deleteTripById } = require('../repositories/trip.repository');
const {
  getParticipantsByTripId,
  getParticipantsByTripIds,
  getParticipantsByUserId,
  getParticipantByTripAndUser,
  addParticipant,
  deleteParticipant,
  updateAllParticipantsAmountOwed,
} = require('../repositories/tripParticipants.repository');
const { resolveAvatarUrl } = require('./friends.controller'); // lub ścieżka do Twojego pliku
const { serializeCoordinatesForDb } = require('../utils/activityGeo');
const { getTripBoundaryTravelCost, getTripTravelFields } = require('../utils/tripTravelFields');

const {
  getActivitiesTotalCostByTripId,
  getActivitiesTotalCostsByTripIds,
  getActivitiesByTripId,
  getActivityWithDay,
  getNextOrderIndexForDay,
  createActivity,
  updateActivityById,
  deleteActivityById,
  updateActivitiesOrder,
} = require('../repositories/activities.repository');
const { getTripDaysByTripId, getTripDayById } = require('../repositories/tripDays.repository');
const {
  getFriendRowsBetweenProfiles,
  getProfileById,
  getProfilesByIds,
} = require('../repositories/friends.repository');

const getUserIdFromRequest = async (req) => {
  const accessToken = req.headers.authorization?.slice(7);
  if (!accessToken) return null;

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;

  return data.user.id;
};

const getDisplayName = (profile) => {
  const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  return name || 'Uzytkownik WhereWeGoing';
};

const parseTripPlanFromNotes = (notes) => {
  if (!notes) return {};
  try {
    return typeof notes === 'string' ? JSON.parse(notes) : notes;
  } catch {
    return {};
  }
};

const sumTransitCostsFromTripPlan = (tripPlan) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];
  return days.reduce((total, day) => {
    const transits = Array.isArray(day?.transits) ? day.transits : [];
    return total + transits.reduce((sum, transit) => sum + (Number(transit?.estimatedCost) || 0), 0);
  }, 0);
};

const sumTransitCostsFromTripNotes = (notes) => sumTransitCostsFromTripPlan(parseTripPlanFromNotes(notes));

const getTripTravelTotal = (trip) => getTripBoundaryTravelCost(trip);

const getTripTravelSource = (trip) => ({
  ...parseTripPlanFromNotes(trip?.notes),
  travel_cost: trip?.travel_cost,
  return_cost: trip?.return_cost,
  travel_way: trip?.travel_way,
  return_way: trip?.return_way,
});

const normalizeTrip = (trip, userId, participantsCount = 0, totalCost = null) => ({
  id: trip.id,
  ownerId: trip.owner_id,
  destination: trip.destination,
  startDate: trip.start_date,
  endDate: trip.end_date,
  totalBudget: trip.total_budget === null || trip.total_budget === undefined ? null : Number(trip.total_budget),
  totalCost: totalCost !== null && totalCost !== undefined && Number(totalCost) > 0 ? Number(totalCost) : null,
  travelCost: getTripTravelFields(getTripTravelSource(trip)).travelCost,
  returnCost: getTripTravelFields(getTripTravelSource(trip)).returnCost,
  travelDurationMinutes: getTripTravelFields(getTripTravelSource(trip)).travelDurationMinutes,
  returnDurationMinutes: getTripTravelFields(getTripTravelSource(trip)).returnDurationMinutes,
  travelWay: getTripTravelFields(getTripTravelSource(trip)).travelWay,
  returnWay: getTripTravelFields(getTripTravelSource(trip)).returnWay,
  status: trip.status,
  imageUrl: trip.image_url,
  notes: trip.notes,
  createdAt: trip.created_at,
  updatedAt: trip.updated_at,
  participantsCount: Math.max(Number(participantsCount) || 0, 1),
  accessRole: trip.owner_id === userId ? 'owner' : 'participant',
});

const getTripStartTime = (trip) => {
  const parsed = new Date(`${trip.startDate || trip.start_date || ''}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripEndTime = (trip) => {
  const parsed = new Date(`${trip.endDate || trip.end_date || ''}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getTripDateRank = (trip, todayTime) => {
  const startTime = getTripStartTime(trip);
  const endTime = getTripEndTime(trip);

  if (startTime !== null && endTime !== null && startTime <= todayTime && endTime >= todayTime) return 0;
  if (startTime !== null && startTime > todayTime) return 1;
  if (endTime !== null && endTime < todayTime) return 2;
  return 3;
};

const sortTripsByNearestDate = (trips) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  return [...trips].sort((a, b) => {
    const aStart = getTripStartTime(a);
    const bStart = getTripStartTime(b);
    const aRank = getTripDateRank(a, todayTime);
    const bRank = getTripDateRank(b, todayTime);

    if (aRank !== bRank) return aRank - bRank;

    if (aStart === null && bStart === null) {
      return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
    }

    if (aStart === null) return 1;
    if (bStart === null) return -1;

    if (aRank === 2) return bStart - aStart;
    return aStart - bStart;
  });
};

const normalizeParticipant = (profile, row, ownerId) => ({
  id: profile.id,
  profileId: profile.id,
  relationId: row?.id || null,
  firstName: profile.first_name || '',
  lastName: profile.last_name || '',
  displayName: getDisplayName(profile),
  avatar: profile.avatar || null,
  role: profile.id === ownerId ? 'owner' : row?.role || 'participant',
  isOwner: profile.id === ownerId,
  amountOwed: row?.amount_owed !== null && row?.amount_owed !== undefined ? Number(row.amount_owed) : null,
  currency: row?.currency || 'PLN',
});

const getVisibleTrip = async (tripId, userId) => {
  const { data: trip, error } = await getTripById(tripId);

  if (error) {
    return { trip: null, error, statusCode: 500 };
  }

  if (!trip) {
    return { trip: null, error: null, statusCode: 404 };
  }

  if (trip.owner_id === userId) {
    return { trip, error: null, statusCode: 200, accessRole: 'owner' };
  }

  const { data: participant, error: participantError } = await getParticipantByTripAndUser(tripId, userId);

  if (participantError) {
    return { trip: null, error: participantError, statusCode: 500 };
  }

  if (!participant) {
    return { trip: null, error: null, statusCode: 403 };
  }

  return { trip, error: null, statusCode: 200, accessRole: 'participant' };
};

const recalculateTripCostSplit = async (tripId) => {
  const { data: trip, error: tripError } = await getTripById(tripId);
  if (tripError || !trip) {
    return { error: tripError || new Error('Wycieczka nie znaleziona') };
  }

  let { data: participantRows, error: participantsError } = await getParticipantsByTripId(tripId);
  if (participantsError) {
    return { error: participantsError };
  }

  const ownerId = trip.owner_id;
  if (ownerId) {
    const rowsBefore = participantRows || [];
    const hasOwnerRow = rowsBefore.some((row) => row.user_id === ownerId);
    if (!hasOwnerRow) {
      const { error: insertOwnerError } = await addParticipant({
        tripId,
        userId: ownerId,
        role: 'owner',
        amountOwed: 0,
      });
      if (insertOwnerError) {
        const msg = String(insertOwnerError.message || '').toLowerCase();
        const code = insertOwnerError.code;
        const isDuplicate =
          code === '23505' || msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists');
        if (!isDuplicate) {
          return { error: insertOwnerError };
        }
      }
      const refetched = await getParticipantsByTripId(tripId);
      if (refetched.error) {
        return { error: refetched.error };
      }
      participantRows = refetched.data;
    }
  }

  const rows = participantRows || [];
  if (rows.length === 0) {
    return { amountPerPerson: 0, participantCount: 0, totalCost: 0 };
  }

  const { total: activitiesTotal, error: activitiesError } = await getActivitiesTotalCostByTripId(tripId);
  if (activitiesError) {
    return { error: activitiesError };
  }

  const activityNumeric =
    activitiesTotal !== null && activitiesTotal !== undefined && Number.isFinite(Number(activitiesTotal))
      ? Number(activitiesTotal)
      : null;
  const budgetParsed = Number(trip.total_budget);
  const safeBudget = Number.isFinite(budgetParsed) ? budgetParsed : 0;
  const transitTotal = sumTransitCostsFromTripNotes(trip.notes);
  const boundaryTravelTotal = getTripTravelTotal(trip);
  const planCost =
    (activityNumeric !== null && activityNumeric > 0 ? activityNumeric : 0) + transitTotal + boundaryTravelTotal;
  const totalCost = planCost > 0 ? planCost : safeBudget;
  const totalCostSafe = Number.isFinite(totalCost) ? Math.max(0, totalCost) : 0;

  const amountPerPerson = totalCostSafe / rows.length;
  const amountPerPersonSafe = Number.isFinite(amountPerPerson) ? amountPerPerson : 0;
  // Często amount_owed w bazie to INTEGER / BIGINT — ułamki powodują błąd zapisu i komunikat o nieudanym przeliczeniu.
  const amountPerPersonRounded = Math.round(amountPerPersonSafe);

  const { error: updateError } = await updateAllParticipantsAmountOwed(tripId, amountPerPersonRounded);

  if (updateError) {
    return { error: updateError };
  }

  return { amountPerPerson: amountPerPersonRounded, participantCount: rows.length, totalCost: totalCostSafe };
};

const buildParticipantsList = async (trip) => {
  const { data: participantRows, error } = await getParticipantsByTripId(trip.id);
  if (error) {
    return { participants: [], error };
  }

  const safeParticipantRows = participantRows || [];
  const profileIds = Array.from(new Set([trip.owner_id, ...safeParticipantRows.map((row) => row.user_id)].filter(Boolean)));
  
  const { data: profiles, error: profilesError } = await getProfilesByIds(profileIds);
  if (profilesError) {
    return { participants: [], error: profilesError };
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  
  // Tego brakowało - musimy stworzyć tymczasową tablicę!
  const rawParticipants = []; 
  
  const ownerRow = safeParticipantRows.find((row) => row.user_id === trip.owner_id);
  const ownerProfile = profileById.get(trip.owner_id);
  if (ownerProfile) {
    // Wrzucamy do rawParticipants, a nie do niezainicjalizowanego participants
    rawParticipants.push(normalizeParticipant(ownerProfile, ownerRow || null, trip.owner_id)); 
  }

  safeParticipantRows.forEach((row) => {
    const profile = profileById.get(row.user_id);
    if (profile && profile.id !== trip.owner_id) {
      rawParticipants.push(normalizeParticipant(profile, row, trip.owner_id));
    }
  });
  
  // Teraz mapujemy surowych uczestników na końcową listę z pełnymi adresami URL avatarów
  const participants = await Promise.all(
    rawParticipants.map(async (p) => ({
      ...p,
      avatar: await resolveAvatarUrl(p.avatar || null) 
    }))
  );
  
  return { participants, error: null };
};


const getTrips = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { data: ownedTrips, error: ownedError } = await getTripsByOwnerId(userId);
    const { data: participantRows, error: participantError } = await getParticipantsByUserId(userId);

    if (ownedError || participantError) {
      return res.status(500).json({ message: ownedError?.message || participantError?.message || 'Nie udalo sie pobrac wycieczek' });
    }

    const safeOwnedTrips = ownedTrips || [];
    const safeParticipantRows = participantRows || [];
    const ownedTripIds = new Set(safeOwnedTrips.map((trip) => trip.id));
    const sharedTripIds = Array.from(new Set(safeParticipantRows.map((row) => row.trip_id).filter((tripId) => !ownedTripIds.has(tripId))));
    const { data: sharedTrips, error: sharedError } = await getTripsByIds(sharedTripIds);

    if (sharedError) {
      return res.status(500).json({ message: sharedError.message });
    }

    const mergedTrips = [...safeOwnedTrips, ...(sharedTrips || [])];
    const seenTripIds = new Set();
    const trips = mergedTrips.filter((trip) => {
      if (!trip?.id || seenTripIds.has(trip.id)) return false;
      seenTripIds.add(trip.id);
      return true;
    });
    const tripIds = trips.map((trip) => trip.id);
    const { data: allParticipantRows, error: participantCountError } = await getParticipantsByTripIds(tripIds);

    if (participantCountError) {
      return res.status(500).json({ message: participantCountError.message });
    }

    const participantsByTripId = (allParticipantRows || []).reduce((acc, row) => {
      if (!acc[row.trip_id]) acc[row.trip_id] = new Set();
      if (row.user_id) acc[row.trip_id].add(row.user_id);
      return acc;
    }, {});

    const { totalsByTripId, error: totalsError } = await getActivitiesTotalCostsByTripIds(tripIds);
    if (totalsError) {
      return res.status(500).json({ message: totalsError.message });
    }

    const normalizedTrips = sortTripsByNearestDate(trips
      .map((trip) => {
        const uniqueParticipantIds = participantsByTripId[trip.id] || new Set();
        uniqueParticipantIds.add(trip.owner_id);
        const activityTotal = totalsByTripId[trip.id] ?? null;
        const transitTotal = sumTransitCostsFromTripNotes(trip.notes);
        const boundaryTravelTotal = getTripTravelTotal(trip);
        const totalCost =
          activityTotal !== null || transitTotal > 0 || boundaryTravelTotal > 0
            ? (Number(activityTotal) || 0) + transitTotal + boundaryTravelTotal
            : null;
        return normalizeTrip(trip, userId, uniqueParticipantIds.size, totalCost);
      }));

    return res.status(200).json({ trips: normalizedTrips });
  } catch (err) {
    return next(err);
  }
};

const getTripByIdHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { trip, error, statusCode } = await getVisibleTrip(id, userId);

    if (error) {
      return res.status(statusCode).json({ message: error.message });
    }

    if (!trip) {
      const message = statusCode === 404 ? 'Wycieczka nie znaleziona' : 'Brak dostepu do tej wycieczki';
      return res.status(statusCode).json({ message });
    }

    const { data: participantRows } = await getParticipantsByTripId(trip.id);
    const participantIds = new Set((participantRows || []).map((row) => row.user_id).filter(Boolean));
    participantIds.add(trip.owner_id);
    const { total: activityTotal } = await getActivitiesTotalCostByTripId(trip.id);
    const tripTotal =
      activityTotal !== null || sumTransitCostsFromTripNotes(trip.notes) > 0 || getTripTravelTotal(trip) > 0
        ? (Number(activityTotal) || 0) + sumTransitCostsFromTripNotes(trip.notes) + getTripTravelTotal(trip)
        : null;
    return res.status(200).json({ trip: normalizeTrip(trip, userId, participantIds.size, tripTotal) });
  } catch (err) {
    return next(err);
  }
};

const deleteTripHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { data: trip, error: fetchError } = await getTripById(id);

    if (fetchError) {
      return res.status(500).json({ message: fetchError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze usunac wycieczke' });
    }

    const { error } = await deleteTripById(id);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ message: 'Wycieczka usunieta' });
  } catch (err) {
    return next(err);
  }
};

const getTripParticipantsHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { trip, error, statusCode } = await getVisibleTrip(id, userId);

    if (error) {
      return res.status(statusCode).json({ message: error.message });
    }

    if (!trip) {
      const message = statusCode === 404 ? 'Wycieczka nie znaleziona' : 'Brak dostepu do tej wycieczki';
      return res.status(statusCode).json({ message });
    }

    const { participants, error: participantsError } = await buildParticipantsList(trip);

    if (participantsError) {
      return res.status(500).json({ message: 'Nie udalo sie pobrac uczestnikow' });
    }

    return res.status(200).json({
      participants,
      count: participants.length,
      accessRole: trip.owner_id === userId ? 'owner' : 'participant',
    });
  } catch (err) {
    return next(err);
  }
};

const addTripParticipantHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const profileId = typeof req.body?.profileId === 'string' ? req.body.profileId.trim() : '';

    if (!profileId) {
      return res.status(400).json({ message: 'Brak identyfikatora uczestnika' });
    }

    const { data: trip, error: tripError } = await getTripById(id);

    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze dodawac uczestnikow' });
    }

    if (profileId === userId) {
      return res.status(400).json({ message: 'Jestes juz wlascicielem tej wycieczki' });
    }

    const { data: profile, error: profileError } = await getProfileById(profileId);

    if (profileError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic profilu uczestnika' });
    }

    if (!profile) {
      return res.status(404).json({ message: 'Nie znaleziono profilu uczestnika' });
    }

    const { data: friendship, error: friendshipError } = await getFriendRowsBetweenProfiles(userId, profileId);

    if (friendshipError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic listy znajomych' });
    }

    if (!friendship || friendship.length === 0) {
      return res.status(400).json({ message: 'Do wycieczki mozna dodawac tylko swoich znajomych' });
    }

    const { data: existing, error: existingError } = await getParticipantByTripAndUser(id, profileId);

    if (existingError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic uczestnika' });
    }

    if (existing) {
      return res.status(409).json({ message: 'Ta osoba jest juz uczestnikiem wycieczki' });
    }

    const { data: participantRow, error } = await addParticipant({ tripId: id, userId: profileId });

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie dodac uczestnika' });
    }

    const splitResult = await recalculateTripCostSplit(id);
    if (splitResult.error) {
      return res.status(500).json({ message: 'Uczestnik dodany, ale nie udalo sie przeliczyc kosztow' });
    }

    const { participants } = await buildParticipantsList(trip);
    const participant = participants.find((item) => item.profileId === profileId)
      || normalizeParticipant(profile, participantRow, trip.owner_id);

    return res.status(201).json({
      message: 'Uczestnik zostal dodany.',
      participant,
      amountPerPerson: splitResult.amountPerPerson,
      participants,
    });
  } catch (err) {
    return next(err);
  }
};

const removeTripParticipantHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id, profileId } = req.params;
    const { data: trip, error: tripError } = await getTripById(id);

    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze usuwac uczestnikow' });
    }

    if (profileId === trip.owner_id) {
      return res.status(400).json({ message: 'Nie mozna usunac wlasciciela wycieczki' });
    }

    const { error } = await deleteParticipant(id, profileId);

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie usunac uczestnika' });
    }

    const splitResult = await recalculateTripCostSplit(id);
    if (splitResult.error) {
      return res.status(500).json({ message: 'Uczestnik usuniety, ale nie udalo sie przeliczyc kosztow' });
    }

    const { participants } = await buildParticipantsList(trip);

    return res.status(200).json({
      message: 'Uczestnik zostal usuniety.',
      amountPerPerson: splitResult.amountPerPerson,
      participants,
    });
  } catch (err) {
    return next(err);
  }
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

const buildActivityTimestamp = (dayDate, timeValue) => {
  const safeDate = typeof dayDate === 'string' ? dayDate.slice(0, 10) : '1970-01-01';
  const safeTime = formatActivityTime(timeValue);
  return `${safeDate}T${safeTime}:00`;
};

const parseActivityCoordinates = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return parseActivityCoordinates(JSON.parse(trimmed));
    } catch {
      const parts = trimmed.split(',').map((part) => Number(part.trim()));
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        return { latitude: parts[0], longitude: parts[1] };
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    const latitude = Number(value.latitude ?? value.lat);
    const longitude = Number(value.longitude ?? value.lng ?? value.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
};

const normalizeScheduleActivity = (row) => ({
  id: row.id,
  dayId: row.day_id,
  time: formatActivityTime(row.time),
  name: row.name || 'Aktywność',
  description: row.description || '',
  category: row.type || 'inne',
  location: row.location || '',
  cost: row.cost !== null && row.cost !== undefined ? Number(row.cost) : 0,
  orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
  durationMinutes:
    row.duration_minutes !== null && row.duration_minutes !== undefined
      ? Number(row.duration_minutes)
      : null,
  coordinates: parseActivityCoordinates(row.coordinates),
});

const normalizeScheduleTransit = (transit, index) => ({
  afterActivityIndex: typeof transit?.afterActivityIndex === 'number' ? transit.afterActivityIndex : index,
  modeLabel: typeof transit?.modeLabel === 'string' ? transit.modeLabel : 'Transport',
  estimatedCost: Number(transit?.estimatedCost) || 0,
  startTime: typeof transit?.startTime === 'string' ? transit.startTime.slice(0, 5) : '09:00',
  endTime: typeof transit?.endTime === 'string' ? transit.endTime.slice(0, 5) : '09:30',
});

const getTransitsByDayNumber = (tripPlan) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];
  return days.reduce((acc, day) => {
    const dayNumber = Number(day?.day);
    if (!Number.isFinite(dayNumber) || !Array.isArray(day?.transits) || day.transits.length === 0) {
      return acc;
    }
    acc[dayNumber] = day.transits.map(normalizeScheduleTransit);
    return acc;
  }, {});
};

const buildSchedulePayload = async (tripId) => {
  const { data: trip, error: tripError } = await getTripById(tripId);
  if (tripError) {
    return { error: tripError };
  }

  const parsedTripPlan = parseTripPlanFromNotes(trip?.notes);
  const transitsByDayNumber = getTransitsByDayNumber(parsedTripPlan);

  const { data: dayRows, error: daysError } = await getTripDaysByTripId(tripId);
  if (daysError) {
    return { error: daysError };
  }

  const { data: activityRows, error: activitiesError } = await getActivitiesByTripId(tripId);
  if (activitiesError) {
    return { error: activitiesError };
  }

  const activitiesByDayId = (activityRows || []).reduce((acc, row) => {
    if (!acc[row.day_id]) {
      acc[row.day_id] = [];
    }
    acc[row.day_id].push(normalizeScheduleActivity(row));
    return acc;
  }, {});

  const days = (dayRows || []).map((day) => ({
    id: day.id,
    dayNumber: day.day_number,
    date: day.date,
    title: day.title || '',
    activities: (activitiesByDayId[day.id] || []).sort((a, b) => a.orderIndex - b.orderIndex),
    transits: transitsByDayNumber[day.day_number] || undefined,
  }));

  const totalCost = days.reduce((sum, day) => {
    const activityTotal = day.activities.reduce((daySum, activity) => daySum + (Number(activity.cost) || 0), 0);
    const transitTotal = (day.transits || []).reduce(
      (daySum, transit) => daySum + (Number(transit.estimatedCost) || 0),
      0
    );
    return sum + activityTotal + transitTotal;
  }, getTripTravelTotal(trip));

  return {
    days,
    totalCost: totalCost > 0 ? totalCost : null,
    ...getTripTravelFields(getTripTravelSource(trip)),
  };
};

const getTripScheduleHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { trip, error, statusCode } = await getVisibleTrip(id, userId);

    if (error) {
      return res.status(statusCode).json({ message: error.message });
    }

    if (!trip) {
      const message = statusCode === 404 ? 'Wycieczka nie znaleziona' : 'Brak dostepu do tej wycieczki';
      return res.status(statusCode).json({ message });
    }

    const schedule = await buildSchedulePayload(id);
    if (schedule.error) {
      return res.status(500).json({ message: schedule.error.message || 'Nie udalo sie pobrac harmonogramu' });
    }

    return res.status(200).json({
      days: schedule.days,
      totalCost: schedule.totalCost,
      travelCost: schedule.travelCost,
      returnCost: schedule.returnCost,
      travelDurationMinutes: schedule.travelDurationMinutes,
      returnDurationMinutes: schedule.returnDurationMinutes,
      travelWay: schedule.travelWay,
      returnWay: schedule.returnWay,
      accessRole: trip.owner_id === userId ? 'owner' : 'participant',
    });
  } catch (err) {
    return next(err);
  }
};

const createTripActivityHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id, dayId } = req.params;
    const { data: trip, error: tripError } = await getTripById(id);

    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze edytowac harmonogram' });
    }

    const { data: day, error: dayError } = await getTripDayById(dayId);
    if (dayError) {
      return res.status(500).json({ message: dayError.message });
    }

    if (!day || day.trip_id !== id) {
      return res.status(404).json({ message: 'Nie znaleziono dnia wycieczki' });
    }

    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Nowa aktywnosc';
    const time = typeof req.body?.time === 'string' ? req.body.time : '12:00';
    const description = typeof req.body?.description === 'string' ? req.body.description : '';
    const category = typeof req.body?.category === 'string' ? req.body.category : 'inne';
    const location = typeof req.body?.location === 'string' ? req.body.location : '';
    const cost = Number(req.body?.cost) || 0;
    const durationMinutes = Number(req.body?.durationMinutes);
    const coordinates = serializeCoordinatesForDb(req.body?.coordinates);

    const { orderIndex, error: orderError } = await getNextOrderIndexForDay(dayId);
    if (orderError) {
      return res.status(500).json({ message: orderError.message });
    }

    const { data: created, error: createError } = await createActivity({
      day_id: dayId,
      time: buildActivityTimestamp(day.date, time),
      name,
      type: category,
      description,
      location,
      coordinates: coordinates ?? null,
      cost,
      duration_minutes:
        Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
      order_index: orderIndex,
    });

    if (createError || !created) {
      return res.status(500).json({ message: createError?.message || 'Nie udalo sie dodac aktywnosci' });
    }

    const splitResult = await recalculateTripCostSplit(id);
    if (splitResult.error) {
      return res.status(500).json({ message: 'Aktywnosc dodana, ale nie udalo sie przeliczyc kosztow' });
    }

    const schedule = await buildSchedulePayload(id);
    const { participants } = await buildParticipantsList(trip);

    return res.status(201).json({
      message: 'Aktywnosc zostala dodana.',
      activity: normalizeScheduleActivity(created),
      days: schedule.days,
      totalCost: schedule.totalCost,
      amountPerPerson: splitResult.amountPerPerson,
      participants,
    });
  } catch (err) {
    return next(err);
  }
};

const updateTripActivityHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id, activityId } = req.params;
    const { data: trip, error: tripError } = await getTripById(id);

    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze edytowac harmonogram' });
    }

    const { activity, day, error: activityError } = await getActivityWithDay(activityId);
    if (activityError) {
      return res.status(500).json({ message: activityError.message });
    }

    if (!activity || !day || day.trip_id !== id) {
      return res.status(404).json({ message: 'Nie znaleziono aktywnosci' });
    }

    const updates = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      updates.name = req.body.name.trim();
    }
    if (typeof req.body?.description === 'string') {
      updates.description = req.body.description;
    }
    if (typeof req.body?.category === 'string') {
      updates.type = req.body.category;
    }
    if (typeof req.body?.location === 'string') {
      updates.location = req.body.location;
    }
    if (req.body?.cost !== undefined && req.body?.cost !== null) {
      updates.cost = Number(req.body.cost) || 0;
    }
    if (typeof req.body?.time === 'string') {
      updates.time = buildActivityTimestamp(day.date, req.body.time);
    }
    if (req.body?.durationMinutes !== undefined && req.body?.durationMinutes !== null) {
      const durationMinutes = Number(req.body.durationMinutes);
      updates.duration_minutes =
        Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null;
    }
    if (req.body?.coordinates !== undefined) {
      updates.coordinates = serializeCoordinatesForDb(req.body.coordinates);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Brak danych do aktualizacji' });
    }

    const { data: updated, error: updateError } = await updateActivityById(activityId, updates);
    if (updateError || !updated) {
      return res.status(500).json({ message: updateError?.message || 'Nie udalo sie zaktualizowac aktywnosci' });
    }

    const splitResult = await recalculateTripCostSplit(id);
    if (splitResult.error) {
      return res.status(500).json({ message: 'Aktywnosc zaktualizowana, ale nie udalo sie przeliczyc kosztow' });
    }

    const schedule = await buildSchedulePayload(id);
    const { participants } = await buildParticipantsList(trip);

    return res.status(200).json({
      message: 'Aktywnosc zostala zaktualizowana.',
      activity: normalizeScheduleActivity(updated),
      days: schedule.days,
      totalCost: schedule.totalCost,
      amountPerPerson: splitResult.amountPerPerson,
      participants,
    });
  } catch (err) {
    return next(err);
  }
};

const deleteTripActivityHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id, activityId } = req.params;
    const { data: trip, error: tripError } = await getTripById(id);

    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze edytowac harmonogram' });
    }

    const { activity, day, error: activityError } = await getActivityWithDay(activityId);
    if (activityError) {
      return res.status(500).json({ message: activityError.message });
    }

    if (!activity || !day || day.trip_id !== id) {
      return res.status(404).json({ message: 'Nie znaleziono aktywnosci' });
    }

    const { error: deleteError } = await deleteActivityById(activityId);
    if (deleteError) {
      return res.status(500).json({ message: deleteError.message });
    }

    const splitResult = await recalculateTripCostSplit(id);
    if (splitResult.error) {
      return res.status(500).json({ message: 'Aktywnosc usunieta, ale nie udalo sie przeliczyc kosztow' });
    }

    const schedule = await buildSchedulePayload(id);
    const { participants } = await buildParticipantsList(trip);

    return res.status(200).json({
      message: 'Aktywnosc zostala usunieta.',
      days: schedule.days,
      totalCost: schedule.totalCost,
      amountPerPerson: splitResult.amountPerPerson,
      participants,
    });
  } catch (err) {
    return next(err);
  }
};

const reorderTripDayActivitiesHandler = async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id, dayId } = req.params;
    const activityIds = Array.isArray(req.body?.activityIds)
      ? req.body.activityIds.filter((value) => typeof value === 'string')
      : [];

    if (activityIds.length === 0) {
      return res.status(400).json({ message: 'Brak kolejnosci aktywnosci' });
    }

    const { data: trip, error: tripError } = await getTripById(id);
    if (tripError) {
      return res.status(500).json({ message: tripError.message });
    }
    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }
    if (trip.owner_id !== userId) {
      return res.status(403).json({ message: 'Tylko wlasciciel moze edytowac harmonogram' });
    }

    const { data: day, error: dayError } = await getTripDayById(dayId);
    if (dayError) {
      return res.status(500).json({ message: dayError.message });
    }
    if (!day || day.trip_id !== id) {
      return res.status(404).json({ message: 'Nie znaleziono dnia wycieczki' });
    }

    const { getActivitiesByDayId } = require('../repositories/activities.repository');
    const { data: dayActivities, error: activitiesError } = await getActivitiesByDayId(dayId);
    if (activitiesError) {
      return res.status(500).json({ message: activitiesError.message });
    }

    const existingIds = new Set((dayActivities || []).map((row) => row.id));
    if (activityIds.length !== existingIds.size || activityIds.some((activityId) => !existingIds.has(activityId))) {
      return res.status(400).json({ message: 'Nieprawidlowa kolejnosc aktywnosci' });
    }

    const { error: orderError } = await updateActivitiesOrder(activityIds);
    if (orderError) {
      return res.status(500).json({ message: orderError.message || 'Nie udalo sie zmienic kolejnosci' });
    }

    const schedule = await buildSchedulePayload(id);
    const { participants } = await buildParticipantsList(trip);

    return res.status(200).json({
      message: 'Kolejnosc aktywnosci zostala zaktualizowana.',
      days: schedule.days,
      totalCost: schedule.totalCost,
      participants,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getTrips,
  getTripByIdHandler,
  deleteTripHandler,
  getTripParticipantsHandler,
  addTripParticipantHandler,
  removeTripParticipantHandler,
  getTripScheduleHandler,
  createTripActivityHandler,
  updateTripActivityHandler,
  deleteTripActivityHandler,
  reorderTripDayActivitiesHandler,
  buildActivityTimestamp,
  sortTripsByNearestDate,
  normalizeScheduleActivity,
  normalizeTrip,
  formatActivityTime
};
