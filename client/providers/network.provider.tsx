import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NetworkContextValue = {
  isOnline: boolean;
  isOffline: boolean;
  goOffline: () => Promise<void>;
  goOnline: () => Promise<void>;
  toggleOffline: () => Promise<void>;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [forceOffline, setForceOffline] = useState(false);
  const PERSIST_KEY = 'wherewegoing_forceOffline_v1';

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isMounted) {
        return;
      }

      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(PERSIST_KEY);
        if (stored === '1') {
          setForceOffline(true);
        }
      } catch (e) {
        console.warn('Failed to read persisted offline flag', e);
      }

      try {
        const state = await NetInfo.fetch();
        if (!isMounted) {
          return;
        }

        setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

    const effectiveOnline = isOnline && !forceOffline;

    const goOffline = async () => {
      setForceOffline(true);
      try {
        await AsyncStorage.setItem(PERSIST_KEY, '1');
      } catch (e) {
        console.warn('Failed to persist offline flag', e);
      }
    };

    const goOnline = async () => {
      setForceOffline(false);
      try {
        await AsyncStorage.removeItem(PERSIST_KEY);
      } catch (e) {
        console.warn('Failed to remove persisted offline flag', e);
      }
    };

    const toggleOffline = async () => {
      if (forceOffline) {
        await goOnline();
      } else {
        await goOffline();
      }
    };

    const value = useMemo<NetworkContextValue>(
      () => ({
        isOnline: effectiveOnline,
        isOffline: !effectiveOnline,
        goOffline,
        goOnline,
        toggleOffline,
      }),
      [effectiveOnline, forceOffline]
    );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error('useNetwork musi byc uzywany wewnatrz NetworkProvider.');
  }

  return context;
};