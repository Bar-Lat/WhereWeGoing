import { TripFormData, TripPlan } from '@/stores/tripStore';

const normalizeApiUrl = (url: string) => {
  const trimmedUrl = url.trim();
  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return urlWithProtocol.replace(/\/$/, '');
};

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api');

export async function generateTripPlan(
  formData: TripFormData,
  accessToken?: string
): Promise<TripPlan> {
  const response = await fetch(`${API_URL}/trip/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message ?? `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.tripPlan as TripPlan;
}

export type AcceptTripResponse = {
  message: string;
  tripId: string;
  totalCost: number;
  participantCount: number;
  amountPerPerson: number;
};

export async function acceptTripPlan(
  formData: TripFormData,
  tripPlan: TripPlan,
  accessToken: string
): Promise<AcceptTripResponse> {
  const response = await fetch(`${API_URL}/trip/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      formData,
      tripPlan,
      selectedFriendIds: formData.selectedFriendIds,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message ?? `Server error: ${response.status}`);
  }

  return response.json();
}
