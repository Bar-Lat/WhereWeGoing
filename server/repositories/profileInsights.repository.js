const { supabaseDbClient } = require('../configs/supabaseClient');

const getTripsByOwnerId = async (ownerId) => {
  const { data, error } = await supabaseDbClient
    .from('trips')
    .select('id, total_budget, status, start_date, end_date')
    .eq('owner_id', ownerId);

  return { data: data || [], error };
};

const getTripDaysByTripIds = async (tripIds) => {
  if (!Array.isArray(tripIds) || tripIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from('trip_days')
    .select('id, trip_id')
    .in('trip_id', tripIds);

  return { data: data || [], error };
};

const getActivitiesByDayIds = async (dayIds) => {
  if (!Array.isArray(dayIds) || dayIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from('activities')
    .select('id, day_id, cost')
    .in('day_id', dayIds);

  return { data: data || [], error };
};

const getFriendRowsByProfileId = async (profileId) => {
  const { data, error } = await supabaseDbClient
    .from('friendlist')
    .select('id, friendProfile_id')
    .eq('profile_id', profileId);

  return { data: data || [], error };
};

module.exports = {
  getTripsByOwnerId,
  getTripDaysByTripIds,
  getActivitiesByDayIds,
  getFriendRowsByProfileId,
};
