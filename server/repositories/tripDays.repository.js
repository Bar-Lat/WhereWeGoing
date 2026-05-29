const { supabaseDbClient } = require('../configs/supabaseClient');

const TABLE = 'trip_days';

const createTripDays = async (days) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .insert(days)
    .select('*');

  return { data, error };
};

const getTripDaysByTripId = async (tripId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });

  return { data, error };
};

const getTripDayById = async (dayId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select('*')
    .eq('id', dayId)
    .maybeSingle();

  return { data, error };
};

module.exports = {
  createTripDays,
  getTripDaysByTripId,
  getTripDayById,
};
