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

module.exports = {
  upsertUserProfile,
  profileSchema,
  profileTable,
};
