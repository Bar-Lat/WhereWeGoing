import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  icon: string;
  color: string;
  time: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  hasUnreadNotifications: boolean;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  markAsUnread: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const READ_NOTIFICATIONS_KEY = 'wherewegoing_read_notifications_v1';

const today = new Date().toISOString().slice(0, 10);

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: `daily-inspiration:${today}`,
    title: 'Inspiracja dnia',
    message: 'Barcelona może być świetnym kierunkiem na kolejny city break.',
    createdAt: today,
    icon: 'bulb-outline',
    color: '#F59E0B',
    time: 'Dzisiaj',
  },
  {
    id: `trip-reminder:paris:${today}`,
    title: 'Zbliżająca się wycieczka',
    message: 'Za 10 dni wycieczka do Paryża.',
    createdAt: today,
    icon: 'airplane-outline',
    color: '#6366f1',
    time: 'Dzisiaj',
  },
];

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [readIds, setReadIds] = useState<string[]>([]);

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
    }),
    [
      notifications,
      hasUnreadNotifications,
      markAllAsRead,
      addNotification,
      markAsUnread,
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