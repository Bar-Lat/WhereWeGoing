const { supabaseDbClient } = require('../configs/supabaseClient');

const TABLE = 'trips';

const createTrip = async (tripRow) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .insert(tripRow)
    .select('*')
    .single();

  return { data, error };
};

const getTripsByOwnerId = async (ownerId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  return { data, error };
};


const getTripsByIds = async (tripIds) => {
  if (!Array.isArray(tripIds) || tripIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select('*')
    .in('id', tripIds)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
};

const getTripById = async (tripId) => {
  const { data, error } = await supabaseDbClient
    .from('trips')
    .select(`
      *,
      trip_days (
        *,
        activities (*)
      )
    `)
    .eq('id', tripId)
    .single();

  return { data, error };
};

const deleteTripById = async (tripId) => {
  const { error } = await supabaseDbClient
    .from(TABLE)
    .delete()
    .eq('id', tripId);

  return { error };
};

const updateTripById = async (id, updateData) => {
  return await supabaseDbClient
    .from('trips')
    .update(updateData)
    .eq('id', id)
    .select(); // Zwracamy zaktualizowany wiersz
};

module.exports = {
  createTrip,
  getTripsByOwnerId,
  getTripById,
  getTripsByIds,
  deleteTripById,
  updateTripById,
};
