import { Linking } from 'react-native';
import {
  geocodeActivityLocation,
  parseActivityCoordinates,
  type ActivityCoordinates,
} from '@/utils/activityMap';

export type MapLocationInput = {
  name?: string;
  location?: string;
  coordinates?: unknown;
};

export const resolveMapLocation = async (
  input: MapLocationInput,
  destination: string
): Promise<ActivityCoordinates | null> => {
  const stored = parseActivityCoordinates(input.coordinates);
  if (stored) return stored;

  const queries = [
    [input.name, input.location, destination].filter(Boolean).join(', '),
    [input.location, destination].filter(Boolean).join(', '),
    [input.name, destination].filter(Boolean).join(', '),
    input.location?.trim() || '',
    input.name?.trim() || '',
  ].filter((query, index, list) => query && list.indexOf(query) === index);

  for (const query of queries) {
    const coordinates = await geocodeActivityLocation(query, '');
    if (coordinates) return coordinates;
  }

  return null;
};

export const buildGoogleMapsFromCurrentLocationUrl = (
  target: ActivityCoordinates | string
): string => {
  if (typeof target === 'string') {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
};

export const buildGoogleMapsBetweenUrl = (
  origin: ActivityCoordinates | string,
  destination: ActivityCoordinates | string
): string => {
  const originParam =
    typeof origin === 'string' ? encodeURIComponent(origin) : `${origin.latitude},${origin.longitude}`;
  const destinationParam =
    typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.latitude},${destination.longitude}`;

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}`;
};

export const openGoogleMapsFromCurrentLocation = async (
  input: MapLocationInput,
  tripDestination: string
) => {
  const coordinates = await resolveMapLocation(input, tripDestination);
  if (coordinates) {
    await Linking.openURL(buildGoogleMapsFromCurrentLocationUrl(coordinates));
    return;
  }

  const fallback = [input.location, input.name, tripDestination].filter(Boolean).join(', ');
  if (fallback) {
    await Linking.openURL(buildGoogleMapsFromCurrentLocationUrl(fallback));
  }
};

const buildMapLocationLabel = (input: MapLocationInput, tripDestination: string): string =>
  [input.location, input.name, tripDestination].filter(Boolean).join(', ');

export const openGoogleMapsBetweenActivities = async (
  from: MapLocationInput,
  to: MapLocationInput,
  tripDestination: string
) => {
  const [fromCoords, toCoords] = await Promise.all([
    resolveMapLocation(from, tripDestination),
    resolveMapLocation(to, tripDestination),
  ]);

  const origin = fromCoords ?? buildMapLocationLabel(from, tripDestination);
  const destination = toCoords ?? buildMapLocationLabel(to, tripDestination);

  if (origin && destination) {
    await Linking.openURL(buildGoogleMapsBetweenUrl(origin, destination));
  }
};
