import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth.provider';
import { getMyProfile, type UserProfile } from '@/services/profile.api';
import { getCachedProfile, saveCachedProfile } from '@/services/profile.storage';
import { downloadAvatarToCache } from '@/services/avatar.storage';

type ProfileContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const sessionUserId = session?.user?.id ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!accessToken) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getMyProfile(accessToken);
      let profileToStore = response.profile;

      if (response.profile.avatar) {
        const cachedAvatarUri = await downloadAvatarToCache(
          response.profile.id,
          response.profile.avatar
        );

        profileToStore = {
          ...response.profile,
          avatar: cachedAvatarUri ?? response.profile.avatar,
        };
      }

      setProfile(profileToStore);
      await saveCachedProfile(profileToStore);
    } catch {
      if (sessionUserId) {
        const cachedProfile = await getCachedProfile(sessionUserId);

        if (cachedProfile) {
          setProfile(cachedProfile);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sessionUserId]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      refreshProfile,
      setProfile,
    }),
    [isLoading, profile, refreshProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile musi byc uzywany wewnatrz ProfileProvider.');
  }

  return context;
};

