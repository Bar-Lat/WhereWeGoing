const { supabaseAuthClient } = require('../configs/supabaseClient');
const { getTripsByOwnerId, getTripById, getTripsByIds, deleteTripById } = require('../repositories/trip.repository');
const {
  getParticipantsByTripId,
  getParticipantsByTripIds,
  getParticipantsByUserId,
  getParticipantByTripAndUser,
  addParticipant,
  deleteParticipant,
} = require('../repositories/tripParticipants.repository');
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

const normalizeTrip = (trip, userId, participantsCount = 0) => ({
  id: trip.id,
  ownerId: trip.owner_id,
  destination: trip.destination,
  startDate: trip.start_date,
  endDate: trip.end_date,
  totalBudget: trip.total_budget === null || trip.total_budget === undefined ? null : Number(trip.total_budget),
  status: trip.status,
  imageUrl: trip.image_url,
  notes: trip.notes,
  createdAt: trip.created_at,
  updatedAt: trip.updated_at,
  participantsCount: Math.max(Number(participantsCount) || 0, 1),
  accessRole: trip.owner_id === userId ? 'owner' : 'participant',
});

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
  const ownerProfile = profileById.get(trip.owner_id);
  const participants = [];

  if (ownerProfile) {
    participants.push(normalizeParticipant(ownerProfile, null, trip.owner_id));
  }

  safeParticipantRows.forEach((row) => {
    const profile = profileById.get(row.user_id);
    if (profile && profile.id !== trip.owner_id) {
      participants.push(normalizeParticipant(profile, row, trip.owner_id));
    }
  });

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

    const trips = [...safeOwnedTrips, ...(sharedTrips || [])];
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

    const normalizedTrips = trips
      .map((trip) => {
        const uniqueParticipantIds = participantsByTripId[trip.id] || new Set();
        uniqueParticipantIds.add(trip.owner_id);
        return normalizeTrip(trip, userId, uniqueParticipantIds.size);
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
    return res.status(200).json({ trip: normalizeTrip(trip, userId, participantIds.size) });
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

    const participant = normalizeParticipant(profile, participantRow, trip.owner_id);

    return res.status(201).json({
      message: 'Uczestnik zostal dodany.',
      participant,
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

    return res.status(200).json({ message: 'Uczestnik zostal usuniety.' });
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
};
