import axios from 'axios';
import { api } from './api';
import type {
  AddTripParticipantResponse,
  TripParticipantsResponse,
  TripsResponse,
} from '@/types/trips';

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

export const getMyTrips = async (accessToken: string) => {
  try {
    const { data } = await api.get<TripsResponse>('/trip', authHeaders(accessToken));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie pobrac wycieczek'));
  }
};

export const getTripParticipants = async (accessToken: string, tripId: string) => {
  try {
    const { data } = await api.get<TripParticipantsResponse>(
      `/trip/${tripId}/participants`,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie pobrac uczestnikow'));
  }
};

export const addTripParticipant = async (accessToken: string, tripId: string, profileId: string) => {
  try {
    const { data } = await api.post<AddTripParticipantResponse>(
      `/trip/${tripId}/participants`,
      { profileId },
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie dodac uczestnika'));
  }
};

export const removeTripParticipant = async (accessToken: string, tripId: string, profileId: string) => {
  try {
    const { data } = await api.delete<{ message: string }>(
      `/trip/${tripId}/participants/${profileId}`,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie usunac uczestnika'));
  }
};
