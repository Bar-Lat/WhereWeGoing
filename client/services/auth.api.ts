import axios from 'axios';
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

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      return responseMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const registerUser = async (payload: {
  email: string;
  password: string;
}) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie utworzyc konta'));
  }
};

export const loginUser = async (payload: { email: string; password: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie zalogowac'));
  }
};

export const refreshUserSession = async (payload: { refreshToken: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/refresh', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie odswiezyc sesji'));
  }
};

export const logoutUser = async (payload: { accessToken: string }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/logout', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie wylogowac'));
  }
};



