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

module.exports = {
  createActivities,
  getActivitiesByDayId,
};
