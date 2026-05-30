import type { TripPlan } from '@/stores/tripStore';

export type ScheduleValidationResult = {
  valid: boolean;
  message: string;
  dayNumber?: number;
};

const parseTimeToMinutes = (time?: string): number | null => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

export const validateDayActivityTimes = (
  dayNumber: number,
  activities: Array<{ name: string; time: string }>
): ScheduleValidationResult => {
  if (activities.length <= 1) {
    return { valid: true, message: '' };
  }

  const seenMinutes = new Set<number>();
  let previousMinutes: number | null = null;

  for (const activity of activities) {
    const minutes = parseTimeToMinutes(activity.time);
    if (minutes === null) {
      return {
        valid: false,
        dayNumber,
        message: `Dzień ${dayNumber}: nieprawidłowa godzina „${activity.time}” przy „${activity.name}”. Użyj formatu HH:MM.`,
      };
    }

    if (seenMinutes.has(minutes)) {
      return {
        valid: false,
        dayNumber,
        message: `Dzień ${dayNumber}: dwie atrakcje mają tę samą godzinę (${activity.time}). Popraw godziny przed zapisem.`,
      };
    }

    if (previousMinutes !== null && minutes < previousMinutes) {
      return {
        valid: false,
        dayNumber,
        message: `Dzień ${dayNumber}: „${activity.name}” (${activity.time}) jest wcześniej niż poprzednia atrakcja w kolejności. Godziny muszą iść rosnąco.`,
      };
    }

    seenMinutes.add(minutes);
    previousMinutes = minutes;
  }

  return { valid: true, message: '' };
};

export const validateTripPlanSchedule = (plan: TripPlan): ScheduleValidationResult => {
  for (const day of plan.days || []) {
    const result = validateDayActivityTimes(
      day.day,
      (day.activities || []).map((activity) => ({
        name: activity.name,
        time: activity.time,
      }))
    );
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true, message: '' };
};
