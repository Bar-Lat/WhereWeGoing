import { create } from 'zustand';
import { TripDto, TripAccessRole } from '@/types/trips';

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

export type DayTransit = {
  afterActivityIndex: number;
  modeLabel: string;
  estimatedCost: number;
  startTime: string;
  endTime: string;
};

export interface DayPlan {
  day: number;
  date: string;
  title: string;
  activities: {
    id?: string;
    clientKey?: string;
    time: string;
    name: string;
    description: string;
    category: string;
    estimatedCost: number;
    location: string;
    durationMinutes?: number;
    coordinates?: { latitude: number; longitude: number } | null;
    imageUrl?: string | null;
  }[];
  transits?: DayTransit[];
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
  tripAccessRole: TripAccessRole | null;
  isEditingMode: boolean;
  removedTripId: string | null;
  setIsEditingMode: (val: boolean) => void;
  setTripAccessRole: (role: TripAccessRole | null) => void;
  setTrips: (trips: TripDto[]) => void;
  setFormData: (data: TripFormData) => void;
  setTripPlan: (plan: TripPlan) => void;
  setSavedTripId: (tripId: string | null) => void;
  setLoading: (val: boolean) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
  notifyTripDeleted: (tripId: string) => void;
  clearRemovedTripNotification: () => void;
  removeTripFromList: (tripId: string) => void;
  updateBudget: (newBudget: number) => void;
  deleteDay: (dayIndex: number) => void;
  addDay: (newDay: DayPlan) => void;
  deleteActivity: (dayIndex: number, activityIndex: number) => void;
  updateActivity: (dayIndex: number, activityIndex: number, updatedActivity: any) => void;
  addActivity: (dayIndex: number, newActivity: any) => void;
  setActivitiesOrder: (dayIndex: number, orderedActivities: DayPlan['activities']) => void;
  setDayTransits: (dayIndex: number, transits: DayTransit[]) => void;
}

export const useTripStore = create<TripStore>((set) => ({
  formData: null,
  tripPlan: null,
  savedTripId: null,
  isLoading: false,
  error: null,
  trips: [],
  tripAccessRole: null,
  isEditingMode: false,
  removedTripId: null,
  setIsEditingMode: (val) => set({ isEditingMode: val }),
  setTripAccessRole: (role) => set({ tripAccessRole: role }),
  setTrips: (trips) => set({ trips }),
  setFormData: (data) => set({ formData: data }),
  setTripPlan: (plan) => set({ tripPlan: plan }),
  setSavedTripId: (tripId) => set({ savedTripId: tripId }),
  setLoading: (val) => set({ isLoading: val }),
  setError: (msg) => set({ error: msg }),

  reset: () =>
    set({
      formData: null,
      tripPlan: null,
      savedTripId: null,
      tripAccessRole: null,
      isLoading: false,
      error: null,
      isEditingMode: false,
    }),

  notifyTripDeleted: (tripId) => set({ removedTripId: tripId }),
  clearRemovedTripNotification: () => set({ removedTripId: null }),

  removeTripFromList: (tripId) =>
    set((state) => ({
      trips: state.trips.filter((trip) => trip.id !== tripId),
      removedTripId: null,
    })),

  updateBudget: (newBudget) =>
    set((state) => {
      if (!state.tripPlan) return state;
      return { tripPlan: { ...state.tripPlan, estimatedTotalCost: newBudget } };
    }),

  deleteDay: (dayIndex: number) =>
    set((state) => {
      if (!state.tripPlan) return {};
      const newDays = state.tripPlan.days.filter((_, idx) => idx !== dayIndex);
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),

  addDay: (newDay) =>
    set((state) => {
      if (!state.tripPlan) return state;
      const updatedDays = [...state.tripPlan.days, newDay];
      return {
        tripPlan: {
          ...state.tripPlan,
          days: updatedDays,
          totalDays: updatedDays.length,
        },
      };
    }),

  deleteActivity: (dayIndex, actIndex) =>
    set((state) => {
      if (!state.tripPlan) return {};
      const newDays = [...state.tripPlan.days];
      newDays[dayIndex].activities = newDays[dayIndex].activities.filter((_, idx) => idx !== actIndex);
      newDays[dayIndex].estimatedDayCost = newDays[dayIndex].activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),

  updateActivity: (dayIndex, activityIndex, updatedActivity) =>
    set((state) => {
      if (!state.tripPlan) return state;
      const newDays = [...state.tripPlan.days];
      newDays[dayIndex].activities[activityIndex] = updatedActivity;
      newDays[dayIndex].estimatedDayCost = newDays[dayIndex].activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),

  addActivity: (dayIndex, newActivity) =>
    set((state) => {
      if (!state.tripPlan) return state;
      const newDays = [...state.tripPlan.days];
      newDays[dayIndex].activities.push({
        ...newActivity,
        clientKey:
          newActivity.clientKey ||
          (newActivity.id ? undefined : `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
      });
      newDays[dayIndex].estimatedDayCost = newDays[dayIndex].activities.reduce(
        (sum, act) => sum + (act.estimatedCost || 0),
        0
      );
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),

  setActivitiesOrder: (dayIndex, orderedActivities) =>
    set((state) => {
      if (!state.tripPlan) return state;
      const newDays = [...state.tripPlan.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        activities: orderedActivities,
      };
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),

  setDayTransits: (dayIndex, transits) =>
    set((state) => {
      if (!state.tripPlan) return state;
      const newDays = [...state.tripPlan.days];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        transits,
      };
      return { tripPlan: { ...state.tripPlan, days: newDays } };
    }),
}));
