import { create } from 'zustand';
import { TripDto } from '@/types/trips';

export interface TripFormData {
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  interests: string[];
  transport: string[];
  attractionsPerDay: number;
  selectedFriendIds: string[];
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
  id?: string;
  destination: string;
  summary: string;
  totalDays: number;
  estimatedTotalCost: number;
  currency: string;
  days: DayPlan[];
  generalTips: string[];
  bestTransport: string;
  imageUrl?: string;
}

interface TripsListStore {
  tripsCount: number;
  setTripsCount: (count: number) => void;
}

export const useTripsListStore = create<TripsListStore>((set) => ({
  tripsCount: 0,
  setTripsCount: (count) => set({ tripsCount: count }),
}));

interface TripStore {
  formData: TripFormData | null;
  tripPlan: TripPlan | null;
  savedTripId: string | null;
  isLoading: boolean;
  error: string | null;
  trips: TripDto[]; 
  setTrips: (trips: TripDto[]) => void;
  setFormData: (data: TripFormData) => void;
  setTripPlan: (plan: TripPlan) => void;
  setSavedTripId: (tripId: string | null) => void;
  setLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
  updateBudget: (newBudget: number) => void;
  deleteDay: (dayIndex: number) => void;
  addDay: (newDay: DayPlan) => void;
  deleteActivity: (dayIndex: number, activityIndex: number) => void;
  updateActivity: (dayIndex: number, activityIndex: number, updatedActivity: any) => void;
  addActivity: (dayIndex: number, newActivity: any) => void;
}

export const useTripStore = create<TripStore>((set) => ({
  formData: null,
  tripPlan: null,
  savedTripId: null,
  isLoading: false,
  error: null,
  trips: [],
  setTrips: (trips) => set({ trips }),
  setFormData: (data) => set({ formData: data }),
  setTripPlan: (plan) => set({ tripPlan: plan }),
  setSavedTripId: (tripId) => set({ savedTripId: tripId }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),
  
  reset: () => set({ formData: null, tripPlan: null, savedTripId: null, isLoading: false, error: null }),
  
  updateBudget: (newBudget) => set((state) => {
    if (!state.tripPlan) return state;
    return { tripPlan: { ...state.tripPlan, estimatedTotalCost: newBudget } };
  }),

  deleteDay: (dayIndex: number) => set((state) => {
    if (!state.tripPlan) return {};
    const newDays = state.tripPlan.days.filter((_, idx) => idx !== dayIndex);
    return { tripPlan: { ...state.tripPlan, days: newDays } };
  }),

  addDay: (newDay) => set((state) => {
    if (!state.tripPlan) return state;
    const updatedDays = [...state.tripPlan.days, newDay];
    return {
      tripPlan: {
        ...state.tripPlan,
        days: updatedDays,
        totalDays: updatedDays.length
      }
    };
  }),

  deleteActivity: (dayIndex: number, actIndex: number) => set((state) => {
    if (!state.tripPlan) return {};
    const newDays = [...state.tripPlan.days];
    newDays[dayIndex].activities = newDays[dayIndex].activities.filter((_, idx) => idx !== actIndex);
    return { tripPlan: { ...state.tripPlan, days: newDays } };
  }),

  updateActivity: (dayIndex, activityIndex, updatedActivity) => set((state) => {
    if (!state.tripPlan) return state;
    const newDays = [...state.tripPlan.days];
    
    newDays[dayIndex].activities[activityIndex] = updatedActivity;
    
    const newDayCost = newDays[dayIndex].activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
    newDays[dayIndex].estimatedDayCost = newDayCost;

    return { tripPlan: { ...state.tripPlan, days: newDays } };
  }),

  addActivity: (dayIndex, newActivity) => set((state) => {
    if (!state.tripPlan) return state;
    const newDays = [...state.tripPlan.days];
    
    newDays[dayIndex].activities.push(newActivity);
    newDays[dayIndex].activities.sort((a, b) => a.time.localeCompare(b.time));
    
    const newDayCost = newDays[dayIndex].activities.reduce((sum, act) => sum + (act.estimatedCost || 0), 0);
    newDays[dayIndex].estimatedDayCost = newDayCost;

    return { tripPlan: { ...state.tripPlan, days: newDays } };
  }),
}));