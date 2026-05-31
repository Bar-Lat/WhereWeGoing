import type { TripScheduleDayDto } from '@/types/trips';

export const getTodayIsoDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const toIsoDateKey = (value: string | null | undefined): string | null => {
  if (!value) return null;

  if (value.includes('T')) {
    return value.slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parts = value.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
};

export const resolveHomeScheduleDay = (
  scheduleDays: TripScheduleDayDto[],
  options: { isOngoing: boolean; isPast: boolean }
): { day: TripScheduleDayDto | null; label: string } => {
  if (!scheduleDays.length) {
    return { day: null, label: 'Harmonogram' };
  }

  const todayKey = getTodayIsoDateKey();
  const todayDay = scheduleDays.find((day) => toIsoDateKey(day.date) === todayKey);

  if (todayDay) {
    const dayNumber = todayDay.dayNumber ?? scheduleDays.indexOf(todayDay) + 1;
    return {
      day: todayDay,
      label: options.isOngoing ? 'Dziś w planie' : `Dzień ${dayNumber} wycieczki`,
    };
  }

  if (options.isPast) {
    const lastDay = scheduleDays[scheduleDays.length - 1];
    const dayNumber = lastDay.dayNumber ?? scheduleDays.length;
    return { day: lastDay, label: `Ostatni dzień — dzień ${dayNumber}` };
  }

  const firstDay = scheduleDays[0];
  const dayNumber = firstDay.dayNumber ?? 1;
  return { day: firstDay, label: `Dzień ${dayNumber} wycieczki` };
};
