import { TripFormData, TripPlan } from '@/stores/tripStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export async function generateTripPlan(formData: TripFormData): Promise<TripPlan> {
  const response = await fetch(`${API_URL}/trip/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message ?? `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.tripPlan as TripPlan;
}