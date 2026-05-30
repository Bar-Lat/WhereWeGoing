import { Directory, File, Paths } from 'expo-file-system';

const AVATAR_CACHE_DIR = new Directory(Paths.document, 'avatars');
const AVATAR_EXTENSIONS = ['jpg', 'png', 'webp'] as const;

const getAvatarExtension = (avatarUrl: string) => {
  const cleanUrl = avatarUrl.split('?')[0];
  const extension = cleanUrl.split('.').pop()?.toLowerCase();

  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp') {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  return 'jpg';
};

const ensureAvatarCacheDir = () => {
  if (!AVATAR_CACHE_DIR.exists) {
    AVATAR_CACHE_DIR.create({
      intermediates: true,
      idempotent: true,
    });
  }
};

const getAvatarFile = (userId: string, extension: string) => {
  return new File(AVATAR_CACHE_DIR, `${userId}.${extension}`);
};

export const getCachedAvatarUri = async (userId: string): Promise<string | null> => {
  ensureAvatarCacheDir();

  for (const extension of AVATAR_EXTENSIONS) {
    const file = getAvatarFile(userId, extension);

    if (file.exists) {
      return file.uri;
    }
  }

  return null;
};

export const deleteCachedAvatar = async (userId: string) => {
  ensureAvatarCacheDir();

  for (const extension of AVATAR_EXTENSIONS) {
    const file = getAvatarFile(userId, extension);

    if (file.exists) {
      file.delete();
    }
  }
};

export const downloadAvatarToCache = async (
  userId: string,
  avatarUrl: string
): Promise<string | null> => {
  try {
    ensureAvatarCacheDir();

    const extension = getAvatarExtension(avatarUrl);
    const avatarFile = getAvatarFile(userId, extension);

    await deleteCachedAvatar(userId);

    const downloadedFile = await File.downloadFileAsync(avatarUrl, avatarFile, {
      idempotent: true,
    });

    return `${downloadedFile.uri}?t=${Date.now()}`;
  } catch (error) {
    console.warn('Failed to cache avatar', error);
    return null;
  }
};