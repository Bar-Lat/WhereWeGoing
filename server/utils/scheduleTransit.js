const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_ACTIVITY_DURATION_MINUTES = 60;

const parseTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const formatMinutesAsTime = (minutes) => {
  const normalized = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const parseActivityDurationMinutes = (activity) => {
  const raw = activity?.durationMinutes ?? activity?.duration_minutes;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  return null;
};

const getActivityEndMinutes = (startTime, durationMinutes) => {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return null;
  const duration = parseActivityDurationMinutes({ durationMinutes }) ?? DEFAULT_ACTIVITY_DURATION_MINUTES;
  return start + duration;
};

const resolveTransitDurationMinutes = (startTime, endTime, fallbackDuration) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return fallbackDuration;

  let duration = end - start;
  if (duration <= 0) duration += MINUTES_PER_DAY;
  return Math.max(5, duration);
};

const alignTransitAfterActivity = (fromActivity, startTime, endTime, fallbackDurationMinutes = 30) => {
  const earliestStart = getActivityEndMinutes(
    fromActivity?.time,
    fromActivity?.durationMinutes ?? fromActivity?.duration_minutes
  );
  if (earliestStart === null) {
    return {
      startTime: String(startTime || '09:00').slice(0, 5),
      endTime: String(endTime || '09:30').slice(0, 5),
    };
  }

  const proposedStart = parseTimeToMinutes(startTime);
  const duration = resolveTransitDurationMinutes(startTime, endTime, fallbackDurationMinutes);
  const alignedStart = proposedStart === null ? earliestStart : Math.max(proposedStart, earliestStart);

  return {
    startTime: formatMinutesAsTime(alignedStart),
    endTime: formatMinutesAsTime(alignedStart + duration),
  };
};

module.exports = {
  alignTransitAfterActivity,
};
