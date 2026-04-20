import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from './auth.api';

const SESSION_STORAGE_KEY = 'wherewegoing_auth_session';

export const saveSession = async (session: AuthSession) => {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const getSession = async (): Promise<AuthSession | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    return null;
  }
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
};

