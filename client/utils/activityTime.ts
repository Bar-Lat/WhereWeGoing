export const DEFAULT_ACTIVITY_DURATION_MINUTES = 60;

export const parseTimeToMinutes = (time?: string): number | null => {
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

export const formatMinutesAsTime = (minutes: number): string => {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const computeEndTime = (startTime: string, durationMinutes?: number | null): string => {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return startTime;

  const duration =
    typeof durationMinutes === 'number' && durationMinutes > 0
      ? durationMinutes
      : DEFAULT_ACTIVITY_DURATION_MINUTES;

  return formatMinutesAsTime(start + duration);
};

export const durationFromTimes = (startTime: string, endTime: string): number | null => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  return end - start;
};

export const formatActivityTimeRange = (startTime: string, durationMinutes?: number | null): string => {
  const endTime = computeEndTime(startTime, durationMinutes);
  return `${startTime} - ${endTime}`;
};

export type ActivityTimeRangeInput = {
  startTime: string;
  endTime?: string;
  durationMinutes?: number | null;
};

export const getActivityRangeMinutes = (
  input: ActivityTimeRangeInput
): { start: number; end: number } | null => {
  const start = parseTimeToMinutes(input.startTime);
  if (start === null) return null;

  let end: number | null = null;
  if (input.endTime) {
    end = parseTimeToMinutes(input.endTime);
  } else {
    const duration =
      typeof input.durationMinutes === 'number' && input.durationMinutes > 0
        ? input.durationMinutes
        : DEFAULT_ACTIVITY_DURATION_MINUTES;
    end = start + duration;
  }

  if (end === null || end <= start) return null;
  return { start, end };
};

export const activityRangesOverlap = (
  a: { start: number; end: number },
  b: { start: number; end: number }
) => a.start < b.end && b.start < a.end;

export const activityRangeOverlapsOthers = (
  candidate: ActivityTimeRangeInput,
  others: ActivityTimeRangeInput[]
): boolean => {
  const candidateRange = getActivityRangeMinutes(candidate);
  if (!candidateRange) return true;

  return others.some((other) => {
    const otherRange = getActivityRangeMinutes(other);
    if (!otherRange) return false;
    return activityRangesOverlap(candidateRange, otherRange);
  });
};

export const isValidActivityTimeRange = (startTime: string, endTime: string): boolean =>
  durationFromTimes(startTime, endTime) !== null;

export const getActivityEndMinutes = (
  startTime: string,
  durationMinutes?: number | null
): number | null => {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return null;

  const duration =
    typeof durationMinutes === 'number' && durationMinutes > 0
      ? durationMinutes
      : DEFAULT_ACTIVITY_DURATION_MINUTES;

  return start + duration;
};

export const computeScheduleGaps = (
  items: Array<{ time: string; durationMinutes?: number | null }>
): number[] => {
  const gaps: number[] = [];

  for (let index = 0; index < items.length - 1; index += 1) {
    const currentEnd = getActivityEndMinutes(items[index].time, items[index].durationMinutes);
    const nextStart = parseTimeToMinutes(items[index + 1].time);
    if (currentEnd === null || nextStart === null) {
      gaps.push(0);
      continue;
    }
    gaps.push(Math.max(0, nextStart - currentEnd));
  }

  return gaps;
};

export const recalculateActivityTimesAfterReorder = <T extends { time: string; durationMinutes?: number | null }>(
  orderedItems: T[],
  baselineItems: Array<{ time: string; durationMinutes?: number | null }>
): T[] => {
  if (orderedItems.length === 0) return orderedItems;

  const anchorStart = parseTimeToMinutes(baselineItems[0]?.time);
  if (anchorStart === null) return orderedItems;

  const gaps = computeScheduleGaps(baselineItems);
  let slotStart = anchorStart;

  return orderedItems.map((item, index) => {
    const updated = {
      ...item,
      time: formatMinutesAsTime(slotStart),
    };

    const duration =
      typeof item.durationMinutes === 'number' && item.durationMinutes > 0
        ? item.durationMinutes
        : DEFAULT_ACTIVITY_DURATION_MINUTES;

    if (index < orderedItems.length - 1) {
      slotStart += duration + (gaps[index] ?? 0);
    }

    return updated;
  });
};
