import { isAxiosError } from 'axios';
import { api } from './api';

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
  };
};

type AuthResponse = {
  message: string;
  user?: {
    id: string | null;
    email: string;
  };
  session?: AuthSession | null;
};

export class ApiRequestError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(message: string, options?: { status?: number; isNetworkError?: boolean }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options?.status;
    this.isNetworkError = options?.isNetworkError ?? false;
  }
}

const toApiRequestError = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    const message =
      typeof responseMessage === 'string' && responseMessage.length > 0
        ? responseMessage
        : error.message || fallback;

    return new ApiRequestError(message, {
      status: error.response?.status,
      isNetworkError: !error.response,
    });
  }

  if (error instanceof Error && error.message) {
    return new ApiRequestError(error.message);
  }

  return new ApiRequestError(fallback);
};

export const registerUser = async (payload: {
  email: string;
  password: string;
}) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  } catch (error) {
    throw toApiRequestError(error, 'Nie udalo sie utworzyc konta');
  }
};

export const loginUser = async (payload: { email: string; password: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  } catch (error) {
    throw toApiRequestError(error, 'Nie udalo sie zalogowac');
  }
};

export const refreshUserSession = async (payload: { refreshToken: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/refresh', payload);
    return data;
  } catch (error) {
    throw toApiRequestError(error, 'Nie udalo sie odswiezyc sesji');
  }
};

export const logoutUser = async (payload: { accessToken: string; refreshToken: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/logout', payload);
    return data;
  } catch (error) {
    throw toApiRequestError(error, 'Nie udalo sie wylogowac');
  }
};



