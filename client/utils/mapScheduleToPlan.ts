import type { DayPlan } from '@/stores/tripStore';
import type { TripScheduleDayDto } from '@/types/trips';
import { parseActivityCoordinates } from '@/utils/activityMap';

export const formatPlanDateFromIso = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

export const mapScheduleDaysToPlanDays = (days: TripScheduleDayDto[]): DayPlan[] =>
  days.map((day, index) => {
    const activities = (day.activities || []).map((activity) => ({
      id: activity.id,
      time: activity.time || '09:00',
      name: activity.name || 'Aktywność',
      description: activity.description || '',
      category: activity.category || 'inne',
      estimatedCost: Number(activity.cost) || 0,
      location: activity.location || '',
      durationMinutes: activity.durationMinutes ?? undefined,
      coordinates: parseActivityCoordinates(activity.coordinates) ?? undefined,
    }));

    return {
      day: day.dayNumber || index + 1,
      date: formatPlanDateFromIso(day.date),
      title: day.title || `Dzień ${day.dayNumber || index + 1}`,
      activities,
      estimatedDayCost: activities.reduce((sum, activity) => sum + (Number(activity.estimatedCost) || 0), 0),
      tips: '',
      transits: day.transits,
    };
  });
