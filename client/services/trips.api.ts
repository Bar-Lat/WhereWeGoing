import axios from 'axios';
import { api } from './api';
import type {
  AddTripParticipantResponse,
  RemoveTripParticipantResponse,
  TripParticipantsResponse,
  TripScheduleActivityInput,
  TripScheduleMutationResponse,
  TripScheduleResponse,
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
    const { data } = await api.delete<RemoveTripParticipantResponse>(
      `/trip/${tripId}/participants/${profileId}`,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie usunac uczestnika'));
  }
};

export const getTripSchedule = async (accessToken: string, tripId: string) => {
  try {
    const { data } = await api.get<TripScheduleResponse>(`/trip/${tripId}/schedule`, authHeaders(accessToken));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie pobrac harmonogramu'));
  }
};

export const createTripScheduleActivity = async (
  accessToken: string,
  tripId: string,
  dayId: string,
  payload: TripScheduleActivityInput
) => {
  try {
    const { data } = await api.post<TripScheduleMutationResponse>(
      `/trip/${tripId}/days/${dayId}/activities`,
      payload,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie dodac aktywnosci'));
  }
};

export const updateTripScheduleActivity = async (
  accessToken: string,
  tripId: string,
  activityId: string,
  payload: TripScheduleActivityInput
) => {
  try {
    const { data } = await api.put<TripScheduleMutationResponse>(
      `/trip/${tripId}/activities/${activityId}`,
      payload,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie zaktualizowac aktywnosci'));
  }
};

export const deleteTripScheduleActivity = async (accessToken: string, tripId: string, activityId: string) => {
  try {
    const { data } = await api.delete<TripScheduleMutationResponse>(
      `/trip/${tripId}/activities/${activityId}`,
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie usunac aktywnosci'));
  }
};

export const reorderTripDayActivities = async (
  accessToken: string,
  tripId: string,
  dayId: string,
  activityIds: string[]
) => {
  try {
    const { data } = await api.put<TripScheduleMutationResponse>(
      `/trip/${tripId}/days/${dayId}/activities/reorder`,
      { activityIds },
      authHeaders(accessToken)
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udalo sie zmienic kolejnosci'));
  }
};
