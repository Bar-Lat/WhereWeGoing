import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { ApiRequestError, loginUser, logoutUser, refreshUserSession, type AuthSession } from '@/services/auth.api';
import { clearSession, getSession, saveSession } from '@/services/session.storage';
import { clearCachedProfile } from '@/services/profile.storage';
import { deleteCachedAvatar } from '@/services/avatar.storage';

type AuthContextValue = {
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: (reason?: 'manual' | 'bootstrap-missing-session' | 'bootstrap-refresh-failed' | 'timer-refresh-failed' | 'token-expired' | 'route-guard') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isRefreshTokenInvalidError = (error: unknown) => {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  if (error.status === 401 || error.status === 403) {
    return true;
  }

  return /refresh token|jwt|token is invalid|invalid token|session not found|sesja wygasła/i.test(
    error.message
  );
};

const requestInitialLocationPermission = async () => {
  if (Platform.OS === 'web') return;

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === 'undetermined') {
      await Location.requestForegroundPermissionsAsync();
    }
  } catch {
    // Uprawnienia lokalizacji nie moga blokowac logowania.
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const sessionRef = useRef<AuthSession | null>(null);
  const bootstrapStartedRef = useRef(false);
  const bootstrapInFlightRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const signOut = useCallback(async (reason: 'manual' | 'bootstrap-missing-session' | 'bootstrap-refresh-failed' | 'timer-refresh-failed' | 'token-expired' | 'route-guard' = 'manual') => {
    const currentSession = sessionRef.current;
    clearRefreshTimer();

    const accessToken = currentSession?.access_token;
    const refreshToken = currentSession?.refresh_token;
    const userId = currentSession?.user?.id ?? null;

    if (accessToken && refreshToken) {
      try {
        await logoutUser({ accessToken, refreshToken });
      } catch {
        // Lokalny cleanup wykonujemy zawsze, nawet gdy backend nie odpowie.
      }
    }

    if (userId) {
      await Promise.allSettled([
        clearCachedProfile(userId),
        deleteCachedAvatar(userId),
        //clearTrips(userId)
      ]);
    }

    sessionRef.current = null;
    setSession(null);
    await clearSession();
  }, [clearRefreshTimer]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const response = await loginUser({ email, password });

    if (!response.session) {
      throw new Error('Backend nie zwrocil sesji logowania.');
    }

    sessionRef.current = response.session;
    setSession(response.session);
    await saveSession(response.session);
    await requestInitialLocationPermission();
  }, []);

  const scheduleRefresh = useCallback((currentSession: AuthSession) => {
    clearRefreshTimer();

    if (!currentSession.refresh_token || !currentSession.expires_at) {
      return;
    }

    const expiresAtMs = currentSession.expires_at * 1000;
    const refreshDelayMs = Math.max(expiresAtMs - Date.now() - 60_000, 5_000);

    refreshTimerRef.current = setTimeout(async () => {
      const liveSession = sessionRef.current;

      if (!liveSession?.refresh_token) {
        return;
      }

      try {
        const response = await refreshUserSession({ refreshToken: liveSession.refresh_token });

        if (!response.session) {
          await signOut('token-expired');
          return;
        }

        sessionRef.current = response.session;
        setSession(response.session);
        await saveSession(response.session);
      } catch (error) {
          if (isRefreshTokenInvalidError(error)) {
            await signOut('timer-refresh-failed');
            return;
          }

          // Brak internetu / timeout / błąd serwera: zostawiamy lokalną sesję.
          scheduleRefresh(liveSession);
        }
    }, refreshDelayMs);
  }, [clearRefreshTimer, signOut]);

  const bootstrapSession = useCallback(async () => {
    if (bootstrapStartedRef.current || bootstrapInFlightRef.current) {
      return;
    }

    bootstrapStartedRef.current = true;
    bootstrapInFlightRef.current = true;

    try {
      const storedSession = await getSession();

      if (!storedSession) {
        sessionRef.current = null;
        setSession(null);
        return;
      }

      const refreshToken = storedSession.refresh_token;

      if (!refreshToken) {
        await signOut('bootstrap-missing-session');
        return;
      }

      try {
        const response = await refreshUserSession({ refreshToken });

        if (!response.session) {
          await signOut('bootstrap-refresh-failed');
        } else {
          sessionRef.current = response.session;
          setSession(response.session);
          await saveSession(response.session);
          scheduleRefresh(response.session);
        }
      } catch (error) {
        if (isRefreshTokenInvalidError(error)) {
          await signOut('bootstrap-refresh-failed');
          return;
        }

        // Brak internetu / timeout: używamy ostatniej lokalnej sesji.
        sessionRef.current = storedSession;
        setSession(storedSession);
        scheduleRefresh(storedSession);
      }
    } finally {
      bootstrapInFlightRef.current = false;
      setIsBootstrapping(false);
    }
  }, [scheduleRefresh, signOut]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (session) {
      scheduleRefresh(session);
    } else {
      clearRefreshTimer();
    }
  }, [clearRefreshTimer, scheduleRefresh, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isBootstrapping,
      isAuthenticated: Boolean(session?.access_token),
      session,
      signInWithPassword,
      signOut,
    }),
    [isBootstrapping, session, signInWithPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth musi byc uzywany wewnatrz AuthProvider.');
  }

  return context;
};
