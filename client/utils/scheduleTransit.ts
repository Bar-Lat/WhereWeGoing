import {
  DEFAULT_ACTIVITY_DURATION_MINUTES,
  formatEndTimeLabel,
  formatMinutesAsTime,
  getActivityEndMinutes,
  parseTimeToMinutes,
} from '@/utils/activityTime';

export type ScheduleActivityLike = {
  name: string;
  location?: string;
  category?: string;
  time?: string;
  durationMinutes?: number | null;
};

export type TransitLegOverride = {
  modeLabel?: string;
  cost?: number;
  startTime?: string;
  endTime?: string;
};

export type TransitLeg = {
  mode: string;
  modeLabel: string;
  cost: number;
  startTime: string;
  endTime: string;
  timeRangeLabel: string;
  fromLocation: string;
  toLocation: string;
};

export const TRANSPORT_MODES = {
  walking: { label: 'Pieszo', speedKmh: 4.5, costPerKm: 0 },
  metro: { label: 'Metro/autobus', speedKmh: 22, costPerKm: 0.85 },
  car: { label: 'Samochód', speedKmh: 32, costPerKm: 2.4 },
  bike: { label: 'Rower', speedKmh: 14, costPerKm: 0 },
} as const;

type TransportMode = keyof typeof TRANSPORT_MODES;

/** Odległość po powierzchni Ziemi (km). */
export const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const modesForOriginLeg = (preferredTransport: string[] | undefined, distanceKm: number): TransportMode[] => {
  const prefs = (preferredTransport || []).filter((id): id is TransportMode => id in TRANSPORT_MODES);
  if (prefs.length > 0) return prefs;
  return [pickTransportMode(undefined, distanceKm)];
};

/**
 * Trasa z bieżącej lokalizacji do pierwszej atrakcji dnia — wybór najkrótszego czasu
 * spośród preferowanych środków transportu. Czasy kończą się na starcie pierwszej atrakcji.
 */
export const computeFastestOriginToFirstActivityLeg = (
  distanceKm: number,
  firstActivity: ScheduleActivityLike,
  preferredTransport?: string[]
): TransitLeg | null => {
  const toLocation =
    firstActivity.location?.trim() ||
    firstActivity.name?.trim() ||
    'Pierwszy punkt planu';

  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;

  const modes = modesForOriginLeg(preferredTransport, Math.max(distanceKm, 0.05));
  let best: { mode: TransportMode; durationMinutes: number; cost: number } | null = null;

  for (const modeKey of modes) {
    const mode = TRANSPORT_MODES[modeKey];
    const durationMinutes = Math.max(5, Math.round((distanceKm / mode.speedKmh) * 60));
    const cost = Math.round(distanceKm * mode.costPerKm * 2) / 2;
    if (!best || durationMinutes < best.durationMinutes) {
      best = { mode: modeKey, durationMinutes, cost };
    }
  }

  if (!best) return null;

  const mode = TRANSPORT_MODES[best.mode];
  const activityStart =
    parseTimeToMinutes(firstActivity.time ?? '09:00') ?? 9 * 60;
  const endMinutes = activityStart;
  const startMinutes = endMinutes - best.durationMinutes;
  const startTime = formatMinutesAsTime(startMinutes);
  const endTime = formatMinutesAsTime(endMinutes);

  return {
    mode: best.mode,
    modeLabel: mode.label,
    cost: best.cost,
    startTime,
    endTime,
    timeRangeLabel: `${startTime} - ${formatEndTimeLabel(startTime, endTime)}`,
    fromLocation: 'Twoja lokalizacja',
    toLocation,
  };
};

const MINUTES_PER_DAY = 24 * 60;

const estimateDistanceKm = (from?: string, to?: string) => {
  const fromText = (from || '').trim().toLowerCase();
  const toText = (to || '').trim().toLowerCase();
  if (!fromText || !toText) return 2.5;
  if (fromText === toText) return 0.4;
  const fromTokens = new Set(fromText.split(/\s+/));
  const overlap = toText.split(/\s+/).filter((token) => fromTokens.has(token)).length;
  if (overlap >= 2) return 1.2;
  if (overlap >= 1) return 2.8;
  return 5.5;
};

const pickTransportMode = (
  preferredTransport?: string[],
  distanceKm = 2.5
): TransportMode => {
  const prefs = (preferredTransport || []).filter(Boolean);
  if (prefs.includes('walking') && distanceKm <= 2) return 'walking';
  if (prefs.includes('bike') && distanceKm <= 6) return 'bike';
  if (prefs.includes('car')) return 'car';
  if (prefs.includes('metro')) return 'metro';
  if (distanceKm <= 1.5) return 'walking';
  if (distanceKm <= 8) return 'metro';
  return 'car';
};

const resolveActivityLocation = (
  primary: ScheduleActivityLike,
  fallback: ScheduleActivityLike
): string | null => {
  const primaryLocation = primary.location?.trim();
  if (primaryLocation) return primaryLocation;

  const fallbackLocation = fallback.location?.trim();
  if (fallbackLocation) return fallbackLocation;

  return null;
};

const resolveTransitDurationMinutes = (
  startTime: string,
  endTime: string,
  fallbackDuration: number
): number => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return fallbackDuration;

  let duration = end - start;
  if (duration <= 0) duration += MINUTES_PER_DAY;
  return Math.max(5, duration);
};

/** Transport nie może zaczynać się przed końcem poprzedniej atrakcji. */
export const alignTransitAfterActivity = (
  from: ScheduleActivityLike,
  startTime: string,
  endTime: string,
  fallbackDurationMinutes = 30
): { startTime: string; endTime: string } => {
  const earliestStart = getActivityEndMinutes(from.time ?? '09:00', from.durationMinutes);
  if (earliestStart === null) {
    return {
      startTime: startTime.slice(0, 5),
      endTime: endTime.slice(0, 5),
    };
  }

  const proposedStart = parseTimeToMinutes(startTime);
  const duration = resolveTransitDurationMinutes(startTime, endTime, fallbackDurationMinutes);
  const alignedStart =
    proposedStart === null ? earliestStart : Math.max(proposedStart, earliestStart);

  return {
    startTime: formatMinutesAsTime(alignedStart),
    endTime: formatMinutesAsTime(alignedStart + duration),
  };
};

export const canGenerateTransitBetween = (
  from: ScheduleActivityLike,
  to: ScheduleActivityLike
): boolean => {
  const fromLocation = resolveActivityLocation(from, to);
  const toLocation = resolveActivityLocation(to, from);
  if (!fromLocation || !toLocation) return false;
  return fromLocation.toLowerCase() !== toLocation.toLowerCase();
};

export const computeTransitLeg = (
  from: ScheduleActivityLike,
  to: ScheduleActivityLike,
  options?: { preferredTransport?: string[]; override?: TransitLegOverride | null }
): TransitLeg | null => {
  const override = options?.override;
  const fromLocation = resolveActivityLocation(from, to);
  const toLocation = resolveActivityLocation(to, from);

  if (override?.modeLabel && override.startTime && override.endTime) {
    const aligned = alignTransitAfterActivity(from, override.startTime, override.endTime);
    return {
      mode: 'custom',
      modeLabel: override.modeLabel,
      cost: Number(override.cost) || 0,
      startTime: aligned.startTime,
      endTime: aligned.endTime,
      timeRangeLabel: `${aligned.startTime} - ${aligned.endTime}`,
      fromLocation: fromLocation || from.location || from.name,
      toLocation: toLocation || to.location || to.name,
    };
  }

  if (!fromLocation || !toLocation || fromLocation.toLowerCase() === toLocation.toLowerCase()) {
    return null;
  }

  const distanceKm = estimateDistanceKm(fromLocation, toLocation);
  const modeKey = pickTransportMode(options?.preferredTransport, distanceKm);
  const mode = TRANSPORT_MODES[modeKey];
  const durationMinutes = Math.max(5, Math.round((distanceKm / mode.speedKmh) * 60));
  const cost = Math.round(distanceKm * mode.costPerKm * 2) / 2;

  const earliestStart =
    getActivityEndMinutes(from.time ?? '09:00', from.durationMinutes) ??
    (parseTimeToMinutes(from.time) ?? 9 * 60) + DEFAULT_ACTIVITY_DURATION_MINUTES;
  const fallbackStart = formatMinutesAsTime(earliestStart);
  const fallbackEnd = formatMinutesAsTime(earliestStart + durationMinutes);

  const rawStart = override?.startTime?.slice(0, 5) || fallbackStart;
  const rawEnd = override?.endTime?.slice(0, 5) || fallbackEnd;
  const aligned = alignTransitAfterActivity(from, rawStart, rawEnd, durationMinutes);

  return {
    mode: modeKey,
    modeLabel: override?.modeLabel || mode.label,
    cost: typeof override?.cost === 'number' ? override.cost : cost,
    startTime: aligned.startTime,
    endTime: aligned.endTime,
    timeRangeLabel: `${aligned.startTime} - ${aligned.endTime}`,
    fromLocation,
    toLocation,
  };
};

export const buildTransitLegs = (
  activities: ScheduleActivityLike[],
  options?: { preferredTransport?: string[]; overrides?: Array<TransitLegOverride | null | undefined> }
): Array<TransitLeg | null> => {
  if (activities.length < 2) return [];

  const legs: Array<TransitLeg | null> = [];
  for (let index = 0; index < activities.length - 1; index += 1) {
    legs.push(
      computeTransitLeg(activities[index], activities[index + 1], {
        preferredTransport: options?.preferredTransport,
        override: options?.overrides?.[index] ?? null,
      })
    );
  }
  return legs;
};

export type ScheduleTransit = {
  afterActivityIndex: number;
  modeLabel: string;
  estimatedCost: number;
  startTime: string;
  endTime: string;
};

export const buildTransitsForActivities = (
  activities: ScheduleActivityLike[],
  preferredTransport?: string[]
): ScheduleTransit[] =>
  buildTransitLegs(activities, { preferredTransport })
    .map((leg, index) => {
      if (!leg) return null;
      return {
        afterActivityIndex: index,
        modeLabel: leg.modeLabel,
        estimatedCost: leg.cost,
        startTime: leg.startTime,
        endTime: leg.endTime,
      };
    })
    .filter((item): item is ScheduleTransit => item !== null);

export const mapDayTransitsToOverrides = (
  transits?: Array<{
    afterActivityIndex: number;
    modeLabel: string;
    estimatedCost: number;
    startTime: string;
    endTime: string;
  }> | null
): Array<TransitLegOverride | null | undefined> | undefined => {
  if (!transits?.length) return undefined;

  const overrides: Array<TransitLegOverride | null | undefined> = [];
  transits.forEach((transit) => {
    overrides[transit.afterActivityIndex] = {
      modeLabel: transit.modeLabel,
      cost: transit.estimatedCost,
      startTime: transit.startTime,
      endTime: transit.endTime,
    };
  });

  return overrides;
};
