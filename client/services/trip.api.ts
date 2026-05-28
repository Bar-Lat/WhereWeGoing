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
    return data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Nie udało się zapisać zmian');
  }
};