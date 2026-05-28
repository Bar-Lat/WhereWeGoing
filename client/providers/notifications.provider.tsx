import React, { createContext, useContext, useMemo, useState } from 'react';

type NotificationsContextValue = {
  hasUnreadNotifications: boolean;
  markAllAsRead: () => void;
  markAsUnread: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const value = useMemo(
    () => ({
      hasUnreadNotifications,
      markAllAsRead: () => setHasUnreadNotifications(false),
      markAsUnread: () => setHasUnreadNotifications(true),
    }),
    [hasUnreadNotifications]
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