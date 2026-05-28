const { supabaseDbClient } = require('../configs/supabaseClient');

const profileTable = process.env.PROFILE_TABLE || 'profiles';
const friendlistTable = process.env.FRIENDLIST_TABLE || 'friendlist';

const profileSelect = 'id, first_name, last_name, avatar, created_at, updated_at';
const friendSelect = 'id, profile_id, friendProfile_id';

const getProfileQuery = () => supabaseDbClient.from(profileTable);
const getFriendQuery = () => supabaseDbClient.from(friendlistTable);

const getFriendRowsByProfileId = async (profileId) => {
  const { data, error } = await getFriendQuery()
    .select(friendSelect)
    .eq('profile_id', profileId);

  return { data: data || [], error };
};

const getFriendRowsBetweenProfiles = async (profileId, friendProfileId) => {
  const { data, error } = await getFriendQuery()
    .select(friendSelect)
    .eq('profile_id', profileId)
    .eq('friendProfile_id', friendProfileId);

  return { data: data || [], error };
};

const getProfilesByIds = async (profileIds) => {
  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await getProfileQuery()
    .select(profileSelect)
    .in('id', profileIds);

  return { data: data || [], error };
};

const getProfileById = async (profileId) => {
  const { data, error } = await getProfileQuery()
    .select(profileSelect)
    .eq('id', profileId)
    .maybeSingle();

  return { data, error };
};

const searchProfiles = async (query, currentProfileId, excludedProfileIds = []) => {
  const normalizedQuery = String(query || '').trim();

  if (normalizedQuery.length < 2) {
    return { data: [], error: null };
  }

  const excluded = Array.from(new Set([currentProfileId, ...excludedProfileIds].filter(Boolean)));
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedQuery);

  let request = getProfileQuery().select(profileSelect).limit(20);

  if (isUuid) {
    request = request.eq('id', normalizedQuery);
  } else {
    const safeQuery = normalizedQuery.replace(/[%_]/g, '').slice(0, 60);
    request = request.or(`first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%`);
  }

  if (excluded.length > 0) {
    request = request.not('id', 'in', `(${excluded.join(',')})`);
  }

  const { data, error } = await request;
  return { data: data || [], error };
};

const addFriendRow = async (profileId, friendProfileId) => {
  const { data, error } = await getFriendQuery()
    .insert({ profile_id: profileId, friendProfile_id: friendProfileId })
    .select(friendSelect)
    .single();

  return { data, error };
};

const deleteFriendRows = async (profileId, friendProfileId) => {
  const { error } = await getFriendQuery()
    .delete()
    .eq('profile_id', profileId)
    .eq('friendProfile_id', friendProfileId);

  return { error };
};

module.exports = {
  getFriendRowsByProfileId,
  getFriendRowsBetweenProfiles,
  getProfilesByIds,
  getProfileById,
  searchProfiles,
  addFriendRow,
  deleteFriendRows,
};
