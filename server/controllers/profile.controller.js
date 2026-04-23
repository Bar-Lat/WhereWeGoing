const { supabaseAuthClient, supabaseDbClient } = require('../configs/supabaseClient');
const {
  getUserProfileById,
  upsertUserProfile,
  profileSchema,
  profileTable,
} = require('../repositories/profile.repository');

const avatarBucket = process.env.PROFILE_AVATAR_BUCKET || 'avatars';
const avatarSignedUrlTtl = Number(process.env.PROFILE_AVATAR_SIGNED_URL_TTL || 3600);
const isAvatarBucketPublic = String(process.env.PROFILE_AVATAR_BUCKET_PUBLIC || 'false').toLowerCase() === 'true';

const parseAccessToken = (req) => {
  const header = req.headers.authorization;

  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  if (typeof req.body?.accessToken === 'string') {
    return req.body.accessToken;
  }

  return null;
};

const extractFileExtension = (mimeType) => {
  const safeMime = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';

  if (safeMime === 'image/jpeg') {
    return 'jpg';
  }

  if (safeMime === 'image/png') {
    return 'png';
  }

  if (safeMime === 'image/webp') {
    return 'webp';
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

const deleteAvatarObject = async (avatarValue) => {
  const avatarPath = resolveAvatarPath(avatarValue);

  if (!avatarPath || /^https?:\/\//i.test(avatarPath)) {
    return;
  }

  await supabaseDbClient.storage.from(avatarBucket).remove([avatarPath]);
};

const normalizeProfileResponse = async (profile, user) => ({
  id: user.id,
  email: user.email || null,
  firstName: profile?.first_name || '',
  lastName: profile?.last_name || '',
  avatar: await resolveAvatarUrl(profile?.avatar || null),
  createdAt: profile?.created_at || null,
  updatedAt: profile?.updated_at || null,
});

const getMyProfile = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const { data, error } = await getUserProfileById(user.id);

    if (error) {
      return res.status(500).json({
        message: `Nie udalo sie odczytac profilu z ${profileSchema}.${profileTable}`,
      });
    }

    return res.status(200).json({
      message: 'Profil pobrany poprawnie.',
      profile: await normalizeProfileResponse(data, user),
    });
  } catch (err) {
    return next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : undefined;
    const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : undefined;

    const profilePatch = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (firstName !== undefined) {
      profilePatch.first_name = firstName;
    }

    if (lastName !== undefined) {
      profilePatch.last_name = lastName;
    }

    const { error: upsertError } = await upsertUserProfile(profilePatch);

    if (upsertError) {
      return res.status(500).json({
        message: `Nie udalo sie zapisac profilu w ${profileSchema}.${profileTable}`,
      });
    }

    const { data: profileData, error: profileError } = await getUserProfileById(user.id);

    if (profileError) {
      return res.status(500).json({
        message: `Nie udalo sie odczytac profilu z ${profileSchema}.${profileTable}`,
      });
    }

    return res.status(200).json({
      message: 'Profil zapisany poprawnie.',
      profile: await normalizeProfileResponse(profileData, user),
    });
  } catch (err) {
    return next(err);
  }
};

const uploadMyAvatar = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(req, res);

    if (!user) {
      return;
    }

    const base64Data = typeof req.body?.base64Data === 'string' ? req.body.base64Data : '';
    const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : '';

    const extension = extractFileExtension(mimeType);

    if (!base64Data || !extension) {
      return res.status(400).json({
        message: 'Niepoprawne dane avatara. Dozwolone formaty: jpeg, png, webp.',
      });
    }

    const rawBase64 = base64Data.includes(',') ? base64Data.split(',').pop() : base64Data;

    if (!rawBase64) {
      return res.status(400).json({
        message: 'Brak danych obrazu do zapisu.',
      });
    }

    const fileBuffer = Buffer.from(rawBase64, 'base64');

    if (fileBuffer.byteLength === 0) {
      return res.status(400).json({
        message: 'Nie udalo sie odczytac danych obrazu.',
      });
    }

    const { data: currentProfile } = await getUserProfileById(user.id);
    const previousAvatarPath = resolveAvatarPath(currentProfile?.avatar || null);

    const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error: uploadError } = await supabaseDbClient.storage
      .from(avatarBucket)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({
        message: `Nie udalo sie zapisac avatara w bucket ${avatarBucket}`,
      });
    }

    const { error: upsertError } = await upsertUserProfile({
      id: user.id,
      avatar: filePath,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return res.status(500).json({
        message: `Avatar zapisany, ale nie udalo sie zapisac URL w ${profileSchema}.${profileTable}`,
      });
    }

    const { data: profileData, error: profileError } = await getUserProfileById(user.id);

    if (profileError) {
      return res.status(500).json({
        message: `Nie udalo sie odczytac profilu z ${profileSchema}.${profileTable}`,
      });
    }

    if (previousAvatarPath && previousAvatarPath !== filePath) {
      await deleteAvatarObject(previousAvatarPath);
    }

    return res.status(200).json({
      message: 'Avatar zapisany poprawnie.',
      profile: await normalizeProfileResponse(profileData, user),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
};


