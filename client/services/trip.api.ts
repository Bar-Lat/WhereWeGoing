import axios from 'axios';
import { api } from './api';

export const getMyTrips = async (accessToken: string) => {
  try {
    const { data } = await api.get('/trip', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.trips;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Nie udało się pobrać wycieczek');
  }
};

export const deleteTrip = async (tripId: string, accessToken: string) => {
  try {
    await api.delete(`/trip/${tripId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Nie udało się usunąć wycieczki');
  }
};

export const updateTrip = async (tripId: string, tripPlan: any, accessToken: string) => {
  try {
    const { data } = await api.put(`/trip/${tripId}`, 
      { tripPlan },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return data as { message?: string; tripPlan?: any };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Nie udało się zapisać zmian');
  }
};

export const refineTripPlanSchedule = async (
  tripPlan: any,
  accessToken: string,
  options?: { tripId?: string; preferredTransport?: string[] }
) => {
  try {
    const { data } = await api.post(
      '/trip/refine-plan',
      {
        tripPlan,
        tripId: options?.tripId,
        preferredTransport: options?.preferredTransport || [],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return data as { tripPlan: any; refined: boolean };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Nie udało się wygenerować transportów');
  }
};

// --- NOWE FUNKCJE Z MAIN ---
export type TripHistoryActivity = {
  id: string;
  dayId: string;
  name: string;
  time: string | null;
  category: string;
  description: string;
  location: string;
  coordinates?: { latitude: number; longitude: number } | null;
  cost: number | null;
  duration_minutes: number | null;
  order_index: number | null;
};

export type TripHistoryDay = {
  dayId: string;
  dayNumber: number | null;
  date: string | null;
  title: string | null;
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