import axios from 'axios';
import { api } from './api';

export type UserProfile = {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProfileResponse = {
  message: string;
  profile: UserProfile;
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

const authHeaders = (accessToken: string) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

export const getMyProfile = async (accessToken: string) => {
  try {
    const { data } = await api.get<ProfileResponse>('/profile/me', authHeaders(accessToken));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie pobrac profilu'));
  }
};

export const updateMyProfile = async (
  accessToken: string,
  payload: { firstName?: string; lastName?: string }
) => {
  try {
    const { data } = await api.patch<ProfileResponse>(
      '/profile/me',
      payload,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie zapisac profilu'));
  }
};

export const uploadMyAvatar = async (
  accessToken: string,
  payload: { base64Data: string; mimeType: string }
) => {
  try {
    const { data } = await api.post<ProfileResponse>(
      '/profile/avatar',
      payload,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie zapisac avatara'));
  }
};

