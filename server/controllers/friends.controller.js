const { supabaseAuthClient, supabaseDbClient } = require('../configs/supabaseClient');
const {
  getFriendRowsByProfileId,
  getFriendRowsBetweenProfiles,
  getProfilesByIds,
  getProfileById,
  searchProfiles,
  addFriendRow,
  deleteFriendRows,
} = require('../repositories/friends.repository');

const avatarBucket = process.env.PROFILE_AVATAR_BUCKET || 'avatars';
const avatarSignedUrlTtl = Number(process.env.PROFILE_AVATAR_SIGNED_URL_TTL || 3600);
const isAvatarBucketPublic = String(process.env.PROFILE_AVATAR_BUCKET_PUBLIC || 'false').toLowerCase() === 'true';

const parseAccessToken = (req) => {
  const header = req.headers.authorization;

  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  return null;
};

const resolveAuthenticatedUser = async (req, res) => {
  const accessToken = parseAccessToken(req);

  if (!accessToken) {
    res.status(401).json({ message: 'Brak access tokena' });
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error || !data?.user?.id) {
    res.status(401).json({ message: 'Niepoprawny lub wygasly access token' });
    return null;
  }

  return data.user;
};

const resolveAvatarPath = (avatarValue) => {
  if (typeof avatarValue !== 'string' || avatarValue.trim().length === 0) {
    return null;
  }

  const value = avatarValue.trim();

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  const marker = `/${avatarBucket}/`;
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return value;
  }

  const rawPath = value.slice(markerIndex + marker.length).split('?')[0];
  return decodeURIComponent(rawPath);
};

const resolveAvatarUrl = async (avatarValue) => {
  const pathOrUrl = resolveAvatarPath(avatarValue);

  if (!pathOrUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(pathOrUrl) && !pathOrUrl.includes(`/${avatarBucket}/`)) {
    return pathOrUrl;
  }

  const storage = supabaseDbClient.storage.from(avatarBucket);

  if (isAvatarBucketPublic) {
    const { data } = storage.getPublicUrl(pathOrUrl);
    return data?.publicUrl || null;
  }

  const ttl = Number.isFinite(avatarSignedUrlTtl) && avatarSignedUrlTtl > 0 ? avatarSignedUrlTtl : 3600;
  const { data, error } = await storage.createSignedUrl(pathOrUrl, ttl);

  return error ? null : data?.signedUrl || null;
};

const getDisplayName = (profile) => {
  const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  return name || 'Uzytkownik WhereWeGoing';
};

const normalizeProfile = async (profile, relationId = null) => ({
  id: profile.id,
  relationId,
  firstName: profile.first_name || '',
  lastName: profile.last_name || '',
  displayName: getDisplayName(profile),
  avatar: await resolveAvatarUrl(profile.avatar || null),
  profileCode: profile.id,
  createdAt: profile.created_at || null,
  updatedAt: profile.updated_at || null,
});

const normalizeFriendRows = async (friendRows) => {
  const friendIds = friendRows.map((row) => row.friendProfile_id).filter(Boolean);
  const { data: profiles, error } = await getProfilesByIds(friendIds);

  if (error) {
    return { friends: [], error };
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const friends = await Promise.all(
    friendRows
      .map((row) => ({ row, profile: profileById.get(row.friendProfile_id) }))
      .filter(({ profile }) => Boolean(profile))
      .map(({ row, profile }) => normalizeProfile(profile, row.id))
  );

  friends.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl'));
  return { friends, error: null };
};

const getMyFriends = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const { data: friendRows, error } = await getFriendRowsByProfileId(user.id);

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie pobrac listy znajomych' });
    }

    const { friends, error: profilesError } = await normalizeFriendRows(friendRows);

    if (profilesError) {
      return res.status(500).json({ message: 'Nie udalo sie pobrac danych znajomych' });
    }

    return res.status(200).json({
      message: 'Lista znajomych pobrana poprawnie.',
      friends,
      count: friends.length,
      profileCode: user.id,
    });
  } catch (err) {
    return next(err);
  }
};

const searchFriendCandidates = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const query = typeof req.query?.query === 'string' ? req.query.query.trim() : '';

    if (query.length < 2) {
      return res.status(200).json({ message: 'Wpisz przynajmniej 2 znaki.', results: [] });
    }

    const { data: friendRows, error: friendsError } = await getFriendRowsByProfileId(user.id);

    if (friendsError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic obecnych znajomych' });
    }

    const excludedProfileIds = friendRows.map((row) => row.friendProfile_id).filter(Boolean);
    const { data: profiles, error } = await searchProfiles(query, user.id, excludedProfileIds);

    if (error) {
      return res.status(500).json({ message: 'Nie udalo sie wyszukac uzytkownikow' });
    }

    const results = await Promise.all(profiles.map((profile) => normalizeProfile(profile)));

    return res.status(200).json({
      message: 'Wyniki wyszukiwania pobrane poprawnie.',
      results,
    });
  } catch (err) {
    return next(err);
  }
};

const addFriend = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const friendProfileId = typeof req.body?.friendProfileId === 'string' ? req.body.friendProfileId.trim() : '';

    if (!friendProfileId) {
      return res.status(400).json({ message: 'Brak identyfikatora znajomego' });
    }

    if (friendProfileId === user.id) {
      return res.status(400).json({ message: 'Nie mozesz dodac siebie do znajomych' });
    }

    const { data: friendProfile, error: friendProfileError } = await getProfileById(friendProfileId);

    if (friendProfileError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic profilu znajomego' });
    }

    if (!friendProfile) {
      return res.status(404).json({ message: 'Nie znaleziono takiego profilu' });
    }

    const { data: existingForward, error: existingForwardError } = await getFriendRowsBetweenProfiles(user.id, friendProfileId);
    const { data: existingBackward, error: existingBackwardError } = await getFriendRowsBetweenProfiles(friendProfileId, user.id);

    if (existingForwardError || existingBackwardError) {
      return res.status(500).json({ message: 'Nie udalo sie sprawdzic relacji znajomosci' });
    }

    let forwardRelationId = existingForward[0]?.id || null;

    if (existingForward.length === 0) {
      const { data, error } = await addFriendRow(user.id, friendProfileId);

      if (error) {
        return res.status(500).json({ message: 'Nie udalo sie dodac znajomego' });
      }

      forwardRelationId = data?.id || null;
    }

    if (existingBackward.length === 0) {
      const { error } = await addFriendRow(friendProfileId, user.id);

      if (error) {
        return res.status(500).json({ message: 'Nie udalo sie dodac relacji zwrotnej' });
      }
    }

    const normalizedFriend = await normalizeProfile(friendProfile, forwardRelationId);

    return res.status(201).json({
      message: 'Znajomy zostal dodany.',
      friend: normalizedFriend,
    });
  } catch (err) {
    return next(err);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const friendProfileId = typeof req.params?.friendProfileId === 'string' ? req.params.friendProfileId.trim() : '';

    if (!friendProfileId) {
      return res.status(400).json({ message: 'Brak identyfikatora znajomego' });
    }

    const { error: firstError } = await deleteFriendRows(user.id, friendProfileId);
    const { error: secondError } = await deleteFriendRows(friendProfileId, user.id);

    if (firstError || secondError) {
      return res.status(500).json({ message: 'Nie udalo sie usunac znajomego' });
    }

    return res.status(200).json({ message: 'Znajomy zostal usuniety.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyFriends,
  searchFriendCandidates,
  addFriend,
  removeFriend,
};
