import axios from 'axios';
import { api } from './api';
import type { AddFriendResponse, FriendSearchResponse, FriendsResponse } from '@/types/friends';

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

export const getMyFriends = async (accessToken: string) => {
  try {
    const { data } = await api.get<FriendsResponse>('/friends', authHeaders(accessToken));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie pobrac listy znajomych'));
  }
};

export const searchFriendCandidates = async (accessToken: string, query: string) => {
  try {
    const { data } = await api.get<FriendSearchResponse>('/friends/search', {
      ...authHeaders(accessToken),
      params: { query },
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie wyszukac uzytkownikow'));
  }
};

export const addFriend = async (accessToken: string, friendProfileId: string) => {
  try {
    const { data } = await api.post<AddFriendResponse>(
      '/friends',
      { friendProfileId },
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie dodac znajomego'));
  }
};

export const removeFriend = async (accessToken: string, friendProfileId: string) => {
  try {
    const { data } = await api.delete<{ message: string }>(
      `/friends/${friendProfileId}`,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie usunac znajomego'));
  }
};
