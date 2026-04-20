import { useMemo } from 'react';
import { type UserProfile } from '@/services/profile.api';
import { useProfile } from '@/providers/profile.provider';

const getProfileInitials = (profile: UserProfile | null) => {
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  if (fullName.length > 0) {
    const parts = fullName.split(' ').filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  const email = profile?.email ?? '';
  return email.slice(0, 2).toUpperCase() || 'U';
};

export const useCurrentUserProfile = () => {
  const { profile, isLoading, setProfile, refreshProfile } = useProfile();

  const userAvatarUrl = profile?.avatar ?? null;
  const userInitials = useMemo(() => getProfileInitials(profile), [profile]);

  return {
    profile,
    userAvatarUrl,
    userInitials,
    isLoading,
    setProfile,
    refreshProfile,
  };
};

