const { supabaseDbClient } = require('../configs/supabaseClient');

const TABLE = 'activities';

const createActivities = async (activities) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .insert(activities)
    .select('*');

  return { data, error };
};

const getActivitiesByDayId = async (dayId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select('*')
    .eq('day_id', dayId)
    .order('order_index', { ascending: true });

  return { data, error };
};

const getActivitiesTotalCostByTripId = async (tripId) => {
  const { data: days, error: daysError } = await supabaseDbClient
    .from('trip_days')
    .select('id')
    .eq('trip_id', tripId);

  if (daysError) {
    return { total: null, error: daysError };
  }

  const dayIds = (days || []).map((day) => day.id).filter(Boolean);
  if (dayIds.length === 0) {
    return { total: null, error: null };
  }

  const { data: activities, error } = await supabaseDbClient
    .from(TABLE)
    .select('cost')
    .in('day_id', dayIds);

  if (error) {
    return { total: null, error };
  }

  const total = (activities || []).reduce((sum, row) => sum + (Number(row.cost) || 0), 0);
  return { total: total > 0 ? total : null, error: null };
};

const getActivitiesTotalCostsByTripIds = async (tripIds) => {
  if (!Array.isArray(tripIds) || tripIds.length === 0) {
    return { totalsByTripId: {}, error: null };
  }

  const { data: days, error: daysError } = await supabaseDbClient
    .from('trip_days')
    .select('id, trip_id')
    .in('trip_id', tripIds);

  if (daysError) {
    return { totalsByTripId: {}, error: daysError };
  }

  const safeDays = days || [];
  const dayIds = safeDays.map((day) => day.id).filter(Boolean);
  const dayToTripId = new Map(safeDays.map((day) => [day.id, day.trip_id]));
  const totalsByTripId = Object.fromEntries(tripIds.map((tripId) => [tripId, 0]));

  if (dayIds.length === 0) {
    return { totalsByTripId, error: null };
  }

  const { data: activities, error } = await supabaseDbClient
    .from(TABLE)
    .select('day_id, cost')
    .in('day_id', dayIds);

  if (error) {
    return { totalsByTripId: {}, error };
  }

  (activities || []).forEach((row) => {
    const tripId = dayToTripId.get(row.day_id);
    if (!tripId) {
      return;
    }
    totalsByTripId[tripId] = (totalsByTripId[tripId] || 0) + (Number(row.cost) || 0);
  });

  return { totalsByTripId, error: null };
};

module.exports = {
  createActivities,
  getActivitiesByDayId,
  getActivitiesTotalCostByTripId,
  getActivitiesTotalCostsByTripIds,
};
