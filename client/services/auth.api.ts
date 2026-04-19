import axios from 'axios';
import { api } from './api';

type AuthResponse = {
  message: string;
  user?: {
    id: string | null;
    email: string;
  };
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



