import axios from 'axios';
import { api } from './api';

export type TripHistoryActivity = {
  id: string;
  dayId: string;
  name: string;
  time: string | null;
  cost: number | null;
  duration_minutes: number | null;
  order_index: number | null;
};

export type TripHistoryDay = {
  dayId: string;
  dayNumber: number | null;
  date: string | null;
  activities: TripHistoryActivity[];
};

export type TripHistoryItem = {
  id: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  total: number | null;
  budget: number | null;
  imageUrl: string | null;
  days: TripHistoryDay[];
};

type TripHistoryResponse = {
  message: string;
  trips: TripHistoryItem[];
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

export const getTripHistory = async (accessToken: string) => {
  try {
    const { data } = await api.get<TripHistoryResponse>('/trip/history', authHeaders(accessToken));
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Nie udało się pobrać historii podróży'));
  }
};
