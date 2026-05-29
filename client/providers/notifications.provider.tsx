import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/auth.provider';
import { getMyTrips } from '@/services/trips.api';
import { getInspirationOffers } from '@/services/inspiration.api';
import type { TripDto } from '@/types/trips';
import type { InspirationOfferDto } from '@/types/inspiration';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  icon: string;
  color: string;
  time?: string;
  kind: 'trip-reminder' | 'daily-inspiration';
  target?:
  | {
      type: 'inspiration';
      offerId: string;
    }
  | {
      type: 'trip';
      tripId: string;
    };
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  hasUnreadNotifications: boolean;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  markAsUnread: () => void;
  registerNotificationsScreenOpen: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysUntil = (dateKey: string) => {
  const today = new Date(`${getLocalDateKey()}T00:00:00`);
  const target = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

const getNearestUpcomingTrip = (trips: TripDto[]) => {
  return trips
    .map((trip) => ({
      trip,
      daysUntil: getDaysUntil(trip.startDate),
    }))
    .filter((item): item is { trip: TripDto; daysUntil: number } =>
      item.daysUntil !== null && item.daysUntil >= 0 && item.daysUntil < 14
    )
    .sort((a, b) => a.daysUntil - b.daysUntil)[0] ?? null;
};

const pickDailyOffer = (offers: InspirationOfferDto[], dateKey: string) => {
  if (offers.length === 0) return null;

  let seed = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    seed += dateKey.charCodeAt(i);
  }

  return offers[seed % offers.length];
};

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const { session, isAuthenticated } = useAuth();
  const accessToken = session?.access_token ?? null;
  const READ_NOTIFICATIONS_KEY = 'wherewegoing_read_notifications_v1';
  const NOTIFICATION_OPEN_TIMES_KEY = 'wherewegoing_notification_open_times_v1';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const getClockTime = (date = new Date()) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getNextNotificationRefreshDate = () => {
    const now = new Date();

    const todayAtEight = new Date(now);
    todayAtEight.setHours(8, 0, 0, 0);

    const tomorrowAtMidnight = new Date(now);
    tomorrowAtMidnight.setDate(now.getDate() + 1);
    tomorrowAtMidnight.setHours(0, 0, 0, 0);

    if (now < todayAtEight) {
      return todayAtEight;
    }

    return tomorrowAtMidnight;
  };

  const registerNotificationsScreenOpen = useCallback(async () => {
    const raw = await AsyncStorage.getItem(NOTIFICATION_OPEN_TIMES_KEY);
    let storedTimes: Record<string, string> = {};

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          storedTimes = parsed;
        }
      } catch {
        storedTimes = {};
      }
    }

    const nowTime = getClockTime();
    let changed = false;

    const nextNotifications = notifications.map((notification) => {
      if (notification.kind !== 'trip-reminder') {
        return notification;
      }

      const existingTime = storedTimes[notification.id];

      if (existingTime) {
        return {
          ...notification,
          time: existingTime,
        };
      }

      storedTimes[notification.id] = nowTime;
      changed = true;

      return {
        ...notification,
        time: nowTime,
      };
    });

    setNotifications(nextNotifications);

    if (changed) {
      await AsyncStorage.setItem(NOTIFICATION_OPEN_TIMES_KEY, JSON.stringify(storedTimes));
    }
  }, [notifications]);

  const buildNotifications = useCallback(async () => {
  if (!isAuthenticated || !accessToken) {
    setNotifications([]);
    return;
  }

  const todayKey = getLocalDateKey();
  const generated: AppNotification[] = [];

  try {
    const tripsResponse = await getMyTrips(accessToken);
    const nearest = getNearestUpcomingTrip(tripsResponse.trips);

    if (nearest) {
      generated.push({
        id: `trip-reminder:${nearest.trip.id}:${todayKey}`,
        title: 'Zbliżająca się wycieczka',
        message:
          nearest.daysUntil === 0
            ? `Twoja wycieczka do ${nearest.trip.destination} zaczyna się dzisiaj.`
            : `Do wycieczki do ${nearest.trip.destination} zostało ${nearest.daysUntil} dni.`,
        createdAt: todayKey,
        icon: 'airplane-outline',
        color: '#6366f1',
        kind: 'trip-reminder',
        target: {
          type: 'trip',
          tripId: nearest.trip.id,
        },
      });
    }

    const offersResponse = await getInspirationOffers();
    const offer = pickDailyOffer(offersResponse.offers, todayKey);

    if (offer) {
      generated.push({
        id: `daily-inspiration:${offer.id}:${todayKey}`,
        title: 'Inspiracja dnia',
        message: `${offer.destination} może być dobrym pomysłem na kolejną podróż.`,
        createdAt: `${todayKey}T08:00:00`,
        icon: 'bulb-outline',
        color: '#F59E0B',
        kind: 'daily-inspiration',
        time: '08:00',
        target: {
          type: 'inspiration',
          offerId: offer.id,
        },
      });
    }

    setNotifications(generated);
  } catch {
    setNotifications([]);
  }
}, [accessToken, isAuthenticated]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isAuthenticated || !accessToken) {
      setNotifications([]);
      return;
    }

    const now = new Date();

    if (now.getHours() >= 8) {
      void buildNotifications();
    }

    const nextRefresh = getNextNotificationRefreshDate();
    const delayMs = nextRefresh.getTime() - now.getTime();

    timerRef.current = setTimeout(() => {
      void buildNotifications();
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [accessToken, buildNotifications, isAuthenticated]);

  useEffect(() => {
    const loadReadIds = async () => {
      const raw = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);

      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setReadIds(parsed.filter((id) => typeof id === 'string'));
        }
      } catch {
        await AsyncStorage.removeItem(READ_NOTIFICATIONS_KEY);
      }
    };

    void loadReadIds();
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readIds.includes(notification.id)),
    [notifications, readIds]
  );

  const hasUnreadNotifications = unreadNotifications.length > 0;

  const notificationIds = useMemo(
    () => notifications.map((notification) => notification.id),
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    const currentReadIds = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    let storedReadIds: string[] = [];

    if (currentReadIds) {
      try {
        const parsed = JSON.parse(currentReadIds);
        if (Array.isArray(parsed)) {
          storedReadIds = parsed.filter((id) => typeof id === 'string');
        }
      } catch {
        storedReadIds = [];
      }
    }

    const nextReadIds = Array.from(new Set([...storedReadIds, ...notificationIds]));

    const hasChanged =
      nextReadIds.length !== storedReadIds.length ||
      nextReadIds.some((id) => !storedReadIds.includes(id));

    if (!hasChanged) {
      return;
    }

    setReadIds(nextReadIds);
    await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(nextReadIds));
  }, [notificationIds]);

  const addNotification = useCallback((notification: AppNotification) => {
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) {
        return current;
      }

      return [notification, ...current];
    });
  }, []);

  const markAsUnread = useCallback(() => {
    void AsyncStorage.removeItem(READ_NOTIFICATIONS_KEY);
    setReadIds([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      hasUnreadNotifications,
      markAllAsRead,
      addNotification,
      markAsUnread,
      registerNotificationsScreenOpen,
      refreshNotifications: buildNotifications,
    }),
    [
      notifications,
      hasUnreadNotifications,
      markAllAsRead,
      addNotification,
      markAsUnread,
      registerNotificationsScreenOpen,
      buildNotifications,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications musi być używany wewnątrz NotificationsProvider.');
  }

  return context;
};