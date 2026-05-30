export type ActivityCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapActivityPoint = {
  key: string;
  orderNumber: number;
  name: string;
  category: string;
  imageUrl?: string | null;
  coordinates: ActivityCoordinates;
};

const isValidCoordinate = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export const parseActivityCoordinates = (value: unknown): ActivityCoordinates | null => {
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
    const record = value as Record<string, unknown>;
    const latitude = Number(record.latitude ?? record.lat);
    const longitude = Number(record.longitude ?? record.lng ?? record.lon);
    if (isValidCoordinate(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
};

export const buildGoogleMapsDirectionsUrl = (points: ActivityCoordinates[]): string | null => {
  if (points.length === 0) return null;

  if (points.length === 1) {
    const point = points[0];
    return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  }

  const path = points.map((point) => `${point.latitude},${point.longitude}`).join('/');
  return `https://www.google.com/maps/dir/${path}`;
};

export const getMapRegionForPoints = (
  points: ActivityCoordinates[],
  paddingFactor = 1.35
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} => {
  if (points.length === 0) {
    return { latitude: 52.2297, longitude: 21.0122, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latitudeDelta = Math.max(0.02, (maxLat - minLat) * paddingFactor || 0.05);
  const longitudeDelta = Math.max(0.02, (maxLng - minLng) * paddingFactor || 0.05);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const geocodeCache = new Map<string, ActivityCoordinates | null>();

export const geocodeActivityLocation = async (
  location: string,
  destination: string
): Promise<ActivityCoordinates | null> => {
  const query = `${location.trim()}, ${destination.trim()}`.trim();
  if (!location.trim() || !destination.trim()) return null;

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query) ?? null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WhereWeGoing/1.0',
        },
      }
    );

    if (!response.ok) {
      geocodeCache.set(query, null);
      return null;
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = results?.[0];
    if (!first) {
      geocodeCache.set(query, null);
      return null;
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!isValidCoordinate(latitude, longitude)) {
      geocodeCache.set(query, null);
      return null;
    }

    const coordinates = { latitude, longitude };
    geocodeCache.set(query, coordinates);
    return coordinates;
  } catch {
    geocodeCache.set(query, null);
    return null;
  }
};

export const resolveMapActivityPoints = async (
  activities: Array<{
    key: string;
    name: string;
    category: string;
    location?: string;
    imageUrl?: string | null;
    coordinates?: unknown;
  }>,
  destination: string
): Promise<MapActivityPoint[]> => {
  const points: MapActivityPoint[] = [];

  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index];
    let coordinates = parseActivityCoordinates(activity.coordinates);

    if (!coordinates && activity.location?.trim()) {
      coordinates = await geocodeActivityLocation(activity.location, destination);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    if (!coordinates) continue;

    points.push({
      key: activity.key,
      orderNumber: index + 1,
      name: activity.name,
      category: activity.category,
      imageUrl: activity.imageUrl,
      coordinates,
    });
  }

  return points;
};
