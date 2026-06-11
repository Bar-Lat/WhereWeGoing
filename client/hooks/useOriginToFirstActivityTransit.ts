import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { ActivityCoordinates } from '@/utils/activityMap';
import { resolveMapLocation } from '@/utils/googleMapsLinks';
import {
  computeLastActivityToOriginLeg,
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

export type GpsTransitSnapshot = {
  fingerprint: string;
  leg: TransitLeg;
  userCoords: ActivityCoordinates;
};

export function buildGpsTransitFingerprint(firstActivity: OriginFirstActivityInput | null): string {
  if (!firstActivity) return '';
  return [
    firstActivity.name,
    firstActivity.location ?? '',
    firstActivity.time,
    JSON.stringify(firstActivity.coordinates ?? null),
  ].join('\u0001');
}

export type UseOriginToFirstActivityTransitOptions = {
  direction?: 'origin-to-activity' | 'activity-to-origin';
  /** Ten sam punkt planu — pokaż zapamiętaną trasę bez ponownego GPS (np. po powrocie z innej zakładki). */
  restoredSnapshot?: GpsTransitSnapshot | null;
  /** Po udanym przeliczeniu — zapis snapshotu w rodzicu. */
  onSnapshotCommit?: (snapshot: GpsTransitSnapshot) => void;
};

export function useOriginToFirstActivityTransit(
  enabled: boolean,
  firstActivity: OriginFirstActivityInput | null,
  destination: string,
  preferredTransport?: string[] | undefined,
  optsOrDirection?: UseOriginToFirstActivityTransitOptions | 'origin-to-activity' | 'activity-to-origin'
) {
  const opts: UseOriginToFirstActivityTransitOptions =
    optsOrDirection === 'origin-to-activity' || optsOrDirection === 'activity-to-origin'
      ? { direction: optsOrDirection }
      : optsOrDirection ?? {};

  const direction = opts.direction ?? 'origin-to-activity';
  const restoredSnapshot = opts.restoredSnapshot;
  const onSnapshotCommit = opts.onSnapshotCommit;
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leg, setLeg] = useState<TransitLeg | null>(null);
  const [userCoords, setUserCoords] = useState<ActivityCoordinates | null>(null);
  const [routeFetchFailed, setRouteFetchFailed] = useState(false);

  /** Użytkownik wyraźnie uruchomił sprawdzenie trasy / przeliczenie — dopiero wtedy czytamy GPS. */
  const allowLocationFetchRef = useRef(false);

  const firstRef = useRef(firstActivity);
  firstRef.current = firstActivity;

  const preferredRef = useRef(preferredTransport);
  preferredRef.current = preferredTransport;

  const fingerprint = useMemo(() => buildGpsTransitFingerprint(firstActivity), [firstActivity]);

  useEffect(() => {
    allowLocationFetchRef.current = false;
    setRouteFetchFailed(false);
    setLeg(null);
    setUserCoords(null);
  }, [fingerprint]);

  /** Tylko odczyt statusu uprawnień — bez zapytania systemowego ani GPS. */
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      setPermissionStatus(null);
      return;
    }
    void Location.getForegroundPermissionsAsync().then((r) => setPermissionStatus(r.status));
  }, [enabled]);

  const commitSnapshot = useCallback(
    (user: ActivityCoordinates, computed: TransitLeg) => {
      const fa = firstRef.current;
      if (!fa) return;
      onSnapshotCommit?.({
        fingerprint: buildGpsTransitFingerprint(fa),
        leg: computed,
        userCoords: user,
      });
    },
    [onSnapshotCommit]
  );

  const refresh = useCallback(
    async (options?: { resetLeg?: boolean; force?: boolean }) => {
      if (!enabled || Platform.OS === 'web') {
        setPermissionStatus(null);
        setLeg(null);
        setUserCoords(null);
        setLoading(false);
        return;
      }

      if (!options?.force && !allowLocationFetchRef.current) {
        return;
      }

      const fa = firstRef.current;
      if (!fa) {
        setLeg(null);
        setUserCoords(null);
        setLoading(false);
        return;
      }

      if (options?.resetLeg) {
        setLeg(null);
      }
      setLoading(true);
      setRouteFetchFailed(false);
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
          setRouteFetchFailed(true);
          return;
        }

        const km = haversineDistanceKm(user.latitude, user.longitude, dest.latitude, dest.longitude);
        const computed =
          direction === 'activity-to-origin'
            ? computeLastActivityToOriginLeg(km, fa, preferredRef.current)
            : computeFastestOriginToFirstActivityLeg(km, fa, preferredRef.current);
        setLeg(computed);
        if (computed) {
          commitSnapshot(user, computed);
        } else {
          setRouteFetchFailed(true);
        }
      } catch {
        setLeg(null);
        setRouteFetchFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [enabled, destination, direction, commitSnapshot]
  );

  /** Natychmiastowe przywrócenie z pamięci rodzica (np. po ponownym zamontowaniu harmonogramu). */
  useEffect(() => {
    if (!enabled || !fingerprint) return;
    if (loading) return;
    const snap = restoredSnapshot;
    if (snap && snap.fingerprint === fingerprint) {
      setPermissionStatus('granted');
      setUserCoords(snap.userCoords);
      setLeg(snap.leg);
      setLoading(false);
      setRouteFetchFailed(false);
    }
  }, [enabled, fingerprint, restoredSnapshot, loading]);

  const beginRouteCheck = useCallback(async () => {
    if (!enabled || Platform.OS === 'web') return;
    allowLocationFetchRef.current = true;
    try {
      let p = await Location.getForegroundPermissionsAsync();
      if (p.status !== 'granted') {
        p = await Location.requestForegroundPermissionsAsync();
      }
      setPermissionStatus(p.status);
      if (p.status !== 'granted') {
        setUserCoords(null);
        setLeg(null);
        setRouteFetchFailed(false);
        return;
      }
      await refresh({ force: true });
    } catch {
      setLeg(null);
      setRouteFetchFailed(true);
    }
  }, [enabled, refresh]);

  const recalculate = useCallback(async () => {
    allowLocationFetchRef.current = true;
    await refresh({ force: true, resetLeg: true });
  }, [refresh]);

  const granted = permissionStatus === 'granted';

  return {
    loading,
    leg,
    permissionStatus,
    granted,
    userCoords,
    beginRouteCheck,
    recalculate,
    routeFetchFailed,
  };
}
