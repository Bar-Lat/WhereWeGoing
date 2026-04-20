const { supabaseDbClient } = require('../configs/supabaseClient');

const profileSchema = process.env.PROFILE_SCHEMA || 'public';
const profileTable = process.env.PROFILE_TABLE || 'profiles';

// Zwraca zapytanie do właściwego schematu i tabeli profilu.
const getProfileQuery = () => {
  if (profileSchema === 'public') {
    return supabaseDbClient.from(profileTable);
  }

  return supabaseDbClient.schema(profileSchema).from(profileTable);
};

// Upsert zapewnia idempotentny zapis rekordu profilu po id użytkownika.
const upsertUserProfile = async (profileRow) => {
  const { error } = await getProfileQuery().upsert(profileRow, { onConflict: 'id' });
  return { error };
};

const getUserProfileById = async (userId) => {
  const { data, error } = await getProfileQuery()
    .select('id, first_name, last_name, avatar, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  return { data, error };
};

const updateUserProfileById = async (userId, payload) => {
  const { data, error } = await getProfileQuery()
    .update(payload)
    .eq('id', userId)
    .select('id, first_name, last_name, avatar, created_at, updated_at')
    .single();

  return { data, error };
};

module.exports = {
  upsertUserProfile,
  getUserProfileById,
  updateUserProfileById,
  profileSchema,
  profileTable,
};
