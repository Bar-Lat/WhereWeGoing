import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth.provider';
import { getMyProfile, type UserProfile } from '@/services/profile.api';

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
      setProfile(response.profile);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

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

