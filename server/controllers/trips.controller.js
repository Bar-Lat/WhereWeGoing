const { supabaseAuthClient } = require('../configs/supabaseClient');
const { getTripsByOwnerId, getTripById, deleteTripById } = require('../repositories/trip.repository');

// Pomocnik — wyciąga userId z Bearer tokena
const getUserIdFromRequest = async (req) => {
  const accessToken = req.headers.authorization?.slice(7);
  if (!accessToken) return null;

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;

  return data.user.id;
};

// GET /api/trip
const getTrips = async (req, res, next) => {
  try {
    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { data, error } = await getTripsByOwnerId(ownerId);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ trips: data });
  } catch (err) {
    return next(err);
  }
};

// GET /api/trip/:id
const getTripByIdHandler = async (req, res, next) => {
  try {
    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;
    const { data, error } = await getTripById(id);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (data.owner_id !== ownerId) {
      return res.status(403).json({ message: 'Brak dostępu do tej wycieczki' });
    }

    return res.status(200).json({ trip: data });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/trip/:id
const deleteTripHandler = async (req, res, next) => {
  try {
    const ownerId = await getUserIdFromRequest(req);
    if (!ownerId) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    const { id } = req.params;

    // Sprawdź czy wycieczka należy do usera
    const { data: trip, error: fetchError } = await getTripById(id);

    if (fetchError) {
      return res.status(500).json({ message: fetchError.message });
    }

    if (!trip) {
      return res.status(404).json({ message: 'Wycieczka nie znaleziona' });
    }

    if (trip.owner_id !== ownerId) {
      return res.status(403).json({ message: 'Brak dostępu do tej wycieczki' });
    }

    const { error } = await deleteTripById(id);

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ message: 'Wycieczka usunięta' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getTrips,
  getTripByIdHandler,
  deleteTripHandler,
};
