import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import type { ActivityCoordinates } from '@/utils/activityMap';
import { resolveMapLocation } from '@/utils/googleMapsLinks';
import {
  computeFastestOriginToFirstActivityLeg,
  haversineDistanceKm,
  type TransitLeg,
} from '@/utils/scheduleTransit';

export type OriginFirstActivityInput = {
  name: string;
  location?: string;
  coordinates?: unknown;
  time: string;
  durationMinutes?: number | null;
  category?: string;
};

export function useOriginToFirstActivityTransit(
  enabled: boolean,
  firstActivity: OriginFirstActivityInput | null,
  destination: string,
  preferredTransport?: string[]
) {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leg, setLeg] = useState<TransitLeg | null>(null);
  const [userCoords, setUserCoords] = useState<ActivityCoordinates | null>(null);

  const firstRef = useRef(firstActivity);
  firstRef.current = firstActivity;

  const preferredRef = useRef(preferredTransport);
  preferredRef.current = preferredTransport;

  const fingerprint = useMemo(() => {
    if (!firstActivity) return '';
    return [
      firstActivity.name,
      firstActivity.location ?? '',
      firstActivity.time,
      JSON.stringify(firstActivity.coordinates ?? null),
    ].join('\u0001');
  }, [firstActivity]);

  const refresh = useCallback(async () => {
    if (!enabled || Platform.OS === 'web') {
      setPermissionStatus(null);
      setLeg(null);
      setUserCoords(null);
      setLoading(false);
      return;
    }

    const fa = firstRef.current;
    if (!fa) {
      setLeg(null);
      setUserCoords(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(perm.status);

      if (perm.status !== 'granted') {
        setUserCoords(null);
        setLeg(null);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const user: ActivityCoordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserCoords(user);

      const dest = await resolveMapLocation(
        {
          name: fa.name,
          location: fa.location,
          coordinates: fa.coordinates,
        },
        destination
      );

      if (!dest) {
        setLeg(null);
        return;
      }

      const km = haversineDistanceKm(user.latitude, user.longitude, dest.latitude, dest.longitude);
      const computed = computeFastestOriginToFirstActivityLeg(km, fa, preferredRef.current);
      setLeg(computed);
    } catch {
      setLeg(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, destination]);

  useEffect(() => {
    if (!enabled || !fingerprint) {
      setPermissionStatus(null);
      setLeg(null);
      setUserCoords(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, fingerprint, destination, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  const requestPermission = useCallback(async () => {
    if (!enabled || Platform.OS === 'web') return;
    const res = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(res.status);
    await refresh();
  }, [enabled, refresh]);

  const granted = permissionStatus === 'granted';

  return {
    loading,
    leg,
    permissionStatus,
    granted,
    userCoords,
    refresh,
    requestPermission,
  };
}
