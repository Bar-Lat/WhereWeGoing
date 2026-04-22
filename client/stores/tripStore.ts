import { create } from 'zustand';

export interface TripFormData {
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  interests: string[];
  transport: string[];
}

export interface DayPlan {
  day: number;
  date: string;
  title: string;
  activities: {
    time: string;
    name: string;
    description: string;
    category: string;
    estimatedCost: number;
    location: string;
  }[];
  estimatedDayCost: number;
  tips: string;
}

export interface TripPlan {
  destination: string;
  summary: string;
  totalDays: number;
  estimatedTotalCost: number;
  currency: string;
  days: DayPlan[];
  generalTips: string[];
  bestTransport: string;
}

interface TripStore {
  formData: TripFormData | null;
  tripPlan: TripPlan | null;
  isLoading: boolean;
  error: string | null;
  setFormData: (data: TripFormData) => void;
  setTripPlan: (plan: TripPlan) => void;
  setLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  formData: null,
  tripPlan: null,
  isLoading: false,
  error: null,
  setFormData: (data) => set({ formData: data }),
  setTripPlan: (plan) => set({ tripPlan: plan }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),
  reset: () => set({ formData: null, tripPlan: null, isLoading: false, error: null }),
}));