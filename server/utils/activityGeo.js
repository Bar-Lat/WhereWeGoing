const geocodeCache = new Map();
const destinationCenterCache = new Map();

const NOMINATIM_MIN_INTERVAL_MS = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let nominatimChain = Promise.resolve();
let lastNominatimAt = 0;

const runNominatimRequest = async (fn) => {
  const task = nominatimChain.then(async () => {
    const wait = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimAt));
    if (wait > 0) await sleep(wait);
    lastNominatimAt = Date.now();
    return fn();
  });
  nominatimChain = task.catch(() => undefined);
  return task;
};

const isValidCoordinate = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const distanceKm = (a, b) => {
  if (!a || !b) return Infinity;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const parseActivityCoordinates = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return parseActivityCoordinates(JSON.parse(trimmed));
    } catch {
      const parts = trimmed.split(',').map((part) => Number(part.trim()));
      if (parts.length >= 2 && isValidCoordinate(parts[0], parts[1])) {
        return { latitude: parts[0], longitude: parts[1] };
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    const latitude = Number(value.latitude ?? value.lat);
    const longitude = Number(value.longitude ?? value.lng ?? value.lon);
    if (isValidCoordinate(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
};

const parseActivityDurationMinutes = (activity) => {
  const raw = activity?.durationMinutes ?? activity?.duration_minutes;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  return null;
};

const parseScheduleTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const CATEGORY_DURATION = {
  transport: { min: 15, default: 30, max: 90 },
  jedzenie: { min: 45, default: 75, max: 120 },
  food: { min: 45, default: 75, max: 120 },
  atrakcja: { min: 60, default: 90, max: 180 },
  attraction: { min: 60, default: 90, max: 180 },
  nocleg: { min: 30, default: 60, max: 120 },
  accommodation: { min: 30, default: 60, max: 120 },
  inne: { min: 30, default: 60, max: 120 },
  other: { min: 30, default: 60, max: 120 },
};

const getCategoryDurationBounds = (category) =>
  CATEGORY_DURATION[String(category || 'inne').toLowerCase()] ?? CATEGORY_DURATION.inne;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeDurationMinutes = (activity, activities, index) => {
  const bounds = getCategoryDurationBounds(activity?.category || activity?.type);
  const groqDuration = parseActivityDurationMinutes(activity);
  const start = parseScheduleTimeToMinutes(activity?.time);
  const next = activities[index + 1];
  const nextStart = next ? parseScheduleTimeToMinutes(next.time) : null;

  if (start !== null && nextStart !== null && nextStart > start) {
    const gap = nextStart - start;
    const transitBuffer = 15;
    const maxFromGap = Math.max(bounds.min, gap - transitBuffer);

    if (groqDuration !== null) {
      return clamp(groqDuration, bounds.min, Math.min(bounds.max, maxFromGap));
    }

    return clamp(bounds.default, bounds.min, Math.min(bounds.max, maxFromGap));
  }

  if (groqDuration !== null) {
    return clamp(groqDuration, bounds.min, bounds.max);
  }

  return bounds.default;
};

const buildGeocodeQueries = (activity, destination) => {
  const name = String(activity?.name || '').trim();
  const location = String(activity?.location || '').trim();
  const dest = String(destination || '').trim();

  return [
    [name, location, dest].filter(Boolean).join(', '),
    [location, dest].filter(Boolean).join(', '),
  ].filter((query, index, list) => query && list.indexOf(query) === index);
};

const scoreNominatimResult = (result, destinationCenter) => {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!isValidCoordinate(latitude, longitude)) return -Infinity;

  let score = Number(result.importance || 0) * 12;
  const resultType = `${result.class || ''} ${result.type || ''}`.toLowerCase();

  if (/tourism|museum|attraction|historic|monument|viewpoint|artwork/.test(resultType)) score += 8;
  if (/restaurant|cafe|food|bar|fast_food/.test(resultType)) score += 6;
  if (/hotel|hostel|guest/.test(resultType)) score += 5;
  if (/building|place_of_worship|castle|palace/.test(resultType)) score += 4;

  if (destinationCenter) {
    const dist = distanceKm({ latitude, longitude }, destinationCenter);
    if (dist > 100) return -Infinity;
    score -= dist * 0.35;
  }

  return score;
};

const searchNominatim = async (query, destinationCenter) => {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) return null;

  const cacheKey = `${normalizedQuery}|${destinationCenter?.latitude || ''}|${destinationCenter?.longitude || ''}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  return runNominatimRequest(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'WhereWeGoing/1.0',
          },
        }
      );

      if (!response.ok) {
        geocodeCache.set(cacheKey, null);
        return null;
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        geocodeCache.set(cacheKey, null);
        return null;
      }

      let best = null;
      let bestScore = -Infinity;

      for (const result of results) {
        const score = scoreNominatimResult(result, destinationCenter);
        if (score > bestScore) {
          bestScore = score;
          best = {
            latitude: Number(result.lat),
            longitude: Number(result.lon),
          };
        }
      }

      geocodeCache.set(cacheKey, best);
      return best;
    } catch {
      geocodeCache.set(cacheKey, null);
      return null;
    }
  });
};

const getDestinationCenter = async (destination) => {
  const dest = String(destination || '').trim();
  if (!dest) return null;
  if (destinationCenterCache.has(dest)) {
    return destinationCenterCache.get(dest) ?? null;
  }

  const result = await searchNominatim(dest, null);
  const center = result ? { latitude: result.latitude, longitude: result.longitude } : null;
  destinationCenterCache.set(dest, center);
  return center;
};

const isCoordinateNearDestination = (coordinates, destinationCenter, maxDistanceKm = 80) => {
  if (!coordinates || !destinationCenter) return Boolean(coordinates);
  return distanceKm(coordinates, destinationCenter) <= maxDistanceKm;
};

const resolveActivityCoordinates = async (activity, destination, destinationCenter) => {
  const center = destinationCenter ?? (await getDestinationCenter(destination));

  const aiCoords = parseActivityCoordinates(activity?.coordinates);
  if (aiCoords && isCoordinateNearDestination(aiCoords, center, 80)) {
    return aiCoords;
  }

  const queries = buildGeocodeQueries(activity, destination);
  for (const query of queries) {
    const result = await searchNominatim(query, center);
    if (result) {
      return { latitude: result.latitude, longitude: result.longitude };
    }
  }

  if (aiCoords) return aiCoords;
  return null;
};

const serializeCoordinatesForDb = (value) => {
  const parsed = parseActivityCoordinates(value);
  if (!parsed) return null;
  return {
    latitude: Number(parsed.latitude.toFixed(6)),
    longitude: Number(parsed.longitude.toFixed(6)),
  };
};

const activityRequiresCoordinates = (activity) => {
  const name = String(activity?.name || '').trim();
  const location = String(activity?.location || '').trim();
  return Boolean(name || location);
};

const collectMissingCoordinates = (tripPlan) => {
  const missing = [];
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];

  for (const day of days) {
    const activities = Array.isArray(day?.activities) ? day.activities : [];
    for (const activity of activities) {
      if (!activityRequiresCoordinates(activity)) continue;
      if (!serializeCoordinatesForDb(activity.coordinates)) {
        missing.push({
          day: day.day,
          name: activity.name || 'Aktywność',
          location: activity.location || '',
        });
      }
    }
  }

  return missing;
};

const formatMissingCoordinatesMessage = (missing) => {
  if (missing.length === 0) return '';
  const preview = missing
    .slice(0, 3)
    .map((item) => `"${item.name}" (dzień ${item.day})`)
    .join(', ');
  const suffix = missing.length > 3 ? ` i ${missing.length - 3} innych` : '';
  return `Nie udało się ustalić współrzędnych dla: ${preview}${suffix}.`;
};

const collectMissingDurations = (tripPlan) => {
  const missing = [];
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];

  for (const day of days) {
    const activities = Array.isArray(day?.activities) ? day.activities : [];
    for (const activity of activities) {
      if (!activityRequiresCoordinates(activity)) continue;
      if (!parseActivityDurationMinutes(activity)) {
        missing.push({
          day: day.day,
          name: activity.name || 'Aktywność',
        });
      }
    }
  }

  return missing;
};

const validateTripPlanActivities = (tripPlan) => {
  const missingCoordinates = collectMissingCoordinates(tripPlan);
  const missingDurations = collectMissingDurations(tripPlan);

  if (missingCoordinates.length === 0 && missingDurations.length === 0) {
    return { valid: true, message: '', missingCoordinates: [], missingDurations: [] };
  }

  const parts = [];
  if (missingCoordinates.length > 0) {
    parts.push(formatMissingCoordinatesMessage(missingCoordinates));
  }
  if (missingDurations.length > 0) {
    const preview = missingDurations
      .slice(0, 3)
      .map((item) => `"${item.name}" (dzień ${item.day})`)
      .join(', ');
    parts.push(`Brak czasu trwania (durationMinutes) dla: ${preview}.`);
  }

  return {
    valid: false,
    message: parts.join(' '),
    missingCoordinates,
    missingDurations,
  };
};

const validateTripPlanCoordinates = (tripPlan) => validateTripPlanActivities(tripPlan);

const enrichTripPlanActivities = async (tripPlan, destination) => {
  const days = Array.isArray(tripPlan?.days) ? tripPlan.days : [];
  const tripDestination = String(destination || tripPlan?.destination || '').trim();
  const destinationCenter = await getDestinationCenter(tripDestination);

  const jobs = [];

  for (const day of days) {
    const activities = Array.isArray(day?.activities) ? day.activities : [];

    for (let index = 0; index < activities.length; index += 1) {
      jobs.push(
        (async () => {
          const activity = activities[index];
          const durationMinutes = normalizeDurationMinutes(activity, activities, index);
          const coordinates = await resolveActivityCoordinates(
            activity,
            tripDestination,
            destinationCenter
          );

          activities[index] = {
            ...activity,
            durationMinutes,
            coordinates: coordinates || undefined,
          };
        })()
      );
    }
  }

  await Promise.all(jobs);
  return tripPlan;
};

module.exports = {
  parseActivityCoordinates,
  parseActivityDurationMinutes,
  serializeCoordinatesForDb,
  enrichTripPlanActivities,
  normalizeDurationMinutes,
  resolveActivityCoordinates,
  validateTripPlanCoordinates,
  validateTripPlanActivities,
  collectMissingCoordinates,
};
