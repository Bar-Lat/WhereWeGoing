export const DEFAULT_ACTIVITY_DURATION_MINUTES = 60;
export const NEW_ACTIVITY_GAP_MINUTES = 30;
export const MINUTES_PER_DAY = 24 * 60;

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
  const normalized = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const isOvernightTimeRange = (startTime: string, endTime: string): boolean => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return start !== null && end !== null && end <= start;
};

export const formatEndTimeLabel = (startTime: string, endTime: string): string =>
  isOvernightTimeRange(startTime, endTime) ? `${endTime} (+1)` : endTime;

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
  if (start === null || end === null) return null;
  if (end <= start) {
    return end + MINUTES_PER_DAY - start;
  }
  return end - start;
};

export const formatActivityTimeRange = (startTime: string, durationMinutes?: number | null): string => {
  const endTime = computeEndTime(startTime, durationMinutes);
  if (isOvernightTimeRange(startTime, endTime)) {
    return `${startTime} - ${endTime} (+1)`;
  }
  return `${startTime} - ${endTime}`;
};

export const getDefaultNewActivityTimes = (
  activities: Array<{ time: string; durationMinutes?: number | null }>,
  nextDayActivities: Array<{ time: string; durationMinutes?: number | null }> = []
): { startTime: string; endTime: string } => {
  if (!activities.length) {
    const startTime = '09:00';
    return {
      startTime,
      endTime: computeEndTime(startTime, DEFAULT_ACTIVITY_DURATION_MINUTES),
    };
  }

  const lastActivity = activities[activities.length - 1];
  const lastEnd = getActivityEndMinutes(lastActivity.time, lastActivity.durationMinutes);
  if (lastEnd === null) {
    const startTime = '09:00';
    return {
      startTime,
      endTime: computeEndTime(startTime, DEFAULT_ACTIVITY_DURATION_MINUTES),
    };
  }

  let startTime = formatMinutesAsTime(lastEnd + NEW_ACTIVITY_GAP_MINUTES);
  let endTime = computeEndTime(startTime, DEFAULT_ACTIVITY_DURATION_MINUTES);

  const scheduleContext = buildDayScheduleContext(
    activities.map((activity) => toActivityTimeRange(activity)),
    nextDayActivities.map((activity) => toActivityTimeRange(activity))
  );

  let candidate: ActivityTimeRangeInput = { startTime, endTime };
  let guard = 0;

  while (activityRangeOverlapsSchedule(candidate, scheduleContext) && guard < 48) {
    const startMinutes = parseTimeToMinutes(startTime);
    if (startMinutes === null) break;
    startTime = formatMinutesAsTime(startMinutes + 30);
    endTime = computeEndTime(startTime, DEFAULT_ACTIVITY_DURATION_MINUTES);
    candidate = { startTime, endTime };
    guard += 1;
  }

  return { startTime, endTime };
};

export type ActivityTimeRangeInput = {
  startTime: string;
  endTime?: string;
  durationMinutes?: number | null;
};

export type DayActivityScheduleContext = {
  sameDay: ActivityTimeRangeInput[];
  nextDay?: ActivityTimeRangeInput[];
  previousDay?: ActivityTimeRangeInput[];
};

export const toActivityTimeRange = (activity: {
  time: string;
  durationMinutes?: number | null;
}): ActivityTimeRangeInput => ({
  startTime: activity.time,
  endTime: computeEndTime(activity.time, activity.durationMinutes),
  durationMinutes: activity.durationMinutes,
});

export const getOvernightSpilloverRange = (
  startTime: string,
  endTime: string
): { start: number; end: number } | null => {
  if (!isOvernightTimeRange(startTime, endTime)) return null;
  const end = parseTimeToMinutes(endTime);
  if (end === null) return null;
  return { start: 0, end };
};

export const getMorningClockRange = (
  input: ActivityTimeRangeInput
): { start: number; end: number } | null => {
  const endTime = input.endTime ?? computeEndTime(input.startTime, input.durationMinutes);
  const spillover = getOvernightSpilloverRange(input.startTime, endTime);
  if (spillover) return spillover;

  const range = getActivityRangeMinutes(input);
  if (!range || range.start >= MINUTES_PER_DAY) return null;

  const end = Math.min(range.end, MINUTES_PER_DAY);
  if (end <= range.start) return null;
  return { start: range.start, end };
};

export const activityRangesConflict = (
  a: ActivityTimeRangeInput,
  b: ActivityTimeRangeInput
): boolean => {
  const rangeA = getActivityRangeMinutes(a);
  const rangeB = getActivityRangeMinutes(b);
  if (!rangeA || !rangeB) return false;

  if (activityRangesOverlap(rangeA, rangeB)) return true;

  const morningA = getMorningClockRange(a);
  const morningB = getMorningClockRange(b);

  if (morningA && morningB && activityRangesOverlap(morningA, morningB)) return true;

  if (morningA && rangeB.end <= MINUTES_PER_DAY && activityRangesOverlap(morningA, rangeB)) {
    return true;
  }

  if (morningB && rangeA.end <= MINUTES_PER_DAY && activityRangesOverlap(morningB, rangeA)) {
    return true;
  }

  return false;
};

export const getActivityRangeMinutes = (
  input: ActivityTimeRangeInput
): { start: number; end: number } | null => {
  const start = parseTimeToMinutes(input.startTime);
  if (start === null) return null;

  let end: number | null = null;
  if (input.endTime) {
    end = parseTimeToMinutes(input.endTime);
    if (end === null) return null;
    if (end <= start) {
      end += MINUTES_PER_DAY;
    }
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
): boolean => activityRangeOverlapsSchedule(candidate, { sameDay: others });

export const activityRangeOverlapsSchedule = (
  candidate: ActivityTimeRangeInput,
  context: DayActivityScheduleContext
): boolean => {
  const candidateRange = getActivityRangeMinutes(candidate);
  if (!candidateRange) return true;

  const sameDayConflict = context.sameDay.some((other) => activityRangesConflict(candidate, other));
  if (sameDayConflict) return true;

  const candidateEndTime =
    candidate.endTime ?? computeEndTime(candidate.startTime, candidate.durationMinutes);
  const candidateSpillover = getOvernightSpilloverRange(candidate.startTime, candidateEndTime);

  if (candidateSpillover && context.nextDay?.length) {
    const nextDayConflict = context.nextDay.some((other) => {
      const otherMorning = getMorningClockRange(other);
      if (!otherMorning) return false;
      return activityRangesOverlap(candidateSpillover, otherMorning);
    });
    if (nextDayConflict) return true;
  }

  const candidateMorning = getMorningClockRange(candidate);
  if (candidateMorning && context.previousDay?.length) {
    const previousDayConflict = context.previousDay.some((other) => {
      const otherEndTime = other.endTime ?? computeEndTime(other.startTime, other.durationMinutes);
      const otherSpillover = getOvernightSpilloverRange(other.startTime, otherEndTime);
      if (!otherSpillover) return false;
      return activityRangesOverlap(candidateMorning, otherSpillover);
    });
    if (previousDayConflict) return true;
  }

  return false;
};

export const buildDayScheduleContext = (
  sameDay: ActivityTimeRangeInput[],
  nextDay?: ActivityTimeRangeInput[],
  previousDay?: ActivityTimeRangeInput[]
): DayActivityScheduleContext => ({
  sameDay,
  nextDay,
  previousDay,
});

export const isValidActivityTimeRange = (startTime: string, endTime: string): boolean => {
  const duration = durationFromTimes(startTime, endTime);
  return duration !== null && duration > 0;
};

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
