const { supabaseDbClient } = require('../configs/supabaseClient');

const TABLE = 'trip_participants';

const selectFields = 'id, trip_id, user_id, role, amount_paid, amount_owed, currency';

const getParticipantsByTripId = async (tripId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select(selectFields)
    .eq('trip_id', tripId)
    .order('role', { ascending: true });

  return { data: data || [], error };
};

const getParticipantsByTripIds = async (tripIds) => {
  if (!Array.isArray(tripIds) || tripIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select(selectFields)
    .in('trip_id', tripIds);

  return { data: data || [], error };
};

const getParticipantsByUserId = async (userId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select(selectFields)
    .eq('user_id', userId);

  return { data: data || [], error };
};

const getParticipantByTripAndUser = async (tripId, userId) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .select(selectFields)
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
};

const addParticipant = async ({ tripId, userId, role = 'participant', amountOwed = 0, amountPaid = 0, currency = 'PLN' }) => {
  const { data, error } = await supabaseDbClient
    .from(TABLE)
    .insert({
      trip_id: tripId,
      user_id: userId,
      role,
      amount_paid: amountPaid,
      amount_owed: amountOwed,
      currency,
    })
    .select(selectFields)
    .single();

  return { data, error };
};

const updateParticipantsAmountOwed = async (tripId, userIds, amountOwed, currency = 'PLN') => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { error: null };
  }

  const { error } = await supabaseDbClient
    .from(TABLE)
    .update({ amount_owed: amountOwed, currency })
    .eq('trip_id', tripId)
    .in('user_id', userIds);

  return { error };
};

const updateAllParticipantsAmountOwed = async (tripId, amountOwed, currency = 'PLN') => {
  const { error } = await supabaseDbClient
    .from(TABLE)
    .update({ amount_owed: amountOwed, currency })
    .eq('trip_id', tripId);

  return { error };
};

const deleteParticipant = async (tripId, userId) => {
  const { error } = await supabaseDbClient
    .from(TABLE)
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  return { error };
};

module.exports = {
  getParticipantsByTripId,
  getParticipantsByTripIds,
  getParticipantsByUserId,
  getParticipantByTripAndUser,
  addParticipant,
  updateParticipantsAmountOwed,
  updateAllParticipantsAmountOwed,
  deleteParticipant,
};
