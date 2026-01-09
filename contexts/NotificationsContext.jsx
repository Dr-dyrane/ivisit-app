// contexts/NotificationsContext.jsx - Notifications state management

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { 
  NOTIFICATIONS, 
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from "../data/notifications";
import { database, StorageKeys } from "../database";
import { normalizeNotification, normalizeNotificationsList } from "../utils/domainNormalize";
import { usePreferences } from "./PreferencesContext";
import { notificationsService } from "../services";

// Create the notifications context
const NotificationsContext = createContext();

/**
 * NotificationsProvider - Manages notification state
 */
export function NotificationsProvider({ children }) {
  // Core state
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { preferences } = usePreferences();
  const demoModeEnabled = preferences?.demoModeEnabled !== false;

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (demoModeEnabled) {
        // DEMO MODE
        const key = StorageKeys.DEMO_NOTIFICATIONS;
        const stored = await database.read(key, null);
        
        if (Array.isArray(stored) && stored.length > 0) {
            setNotifications(normalizeNotificationsList(stored));
        } else {
            const seeded = normalizeNotificationsList(NOTIFICATIONS);
            setNotifications(seeded);
            await database.write(key, seeded);
        }
      } else {
        // REAL MODE (Supabase)
        const cached = await database.read(StorageKeys.NOTIFICATIONS, []);
        if (Array.isArray(cached) && cached.length > 0) {
             setNotifications(normalizeNotificationsList(cached));
        }

        const remote = await notificationsService.list();
        const normalized = normalizeNotificationsList(remote);
        setNotifications(normalized);
        await database.write(StorageKeys.NOTIFICATIONS, normalized);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
      setError(e?.message ?? "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [demoModeEnabled]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Sync state to local storage (Only for Demo or Cache)
  useEffect(() => {
    if (!Array.isArray(notifications)) return;
    const normalized = normalizeNotificationsList(notifications);
    
    if (demoModeEnabled) {
        database.write(StorageKeys.DEMO_NOTIFICATIONS, normalized).catch(() => {});
    } else {
        database.write(StorageKeys.NOTIFICATIONS, normalized).catch(() => {});
    }
  }, [demoModeEnabled, notifications]);

  // Derived: Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => n && typeof n === "object" && n.read !== true).length;
  }, [notifications]);

  // Derived: Filtered notifications
  const filteredNotifications = useMemo(() => {
    const list = notifications.filter(n => n && typeof n === "object");
    switch (filter) {
      case "unread":
        return list.filter(n => n.read !== true);
      case "emergency":
        return list.filter(n => n.type === NOTIFICATION_TYPES.EMERGENCY);
      case "appointments":
        return list.filter(n => 
          n.type === NOTIFICATION_TYPES.APPOINTMENT || 
          n.type === NOTIFICATION_TYPES.VISIT
        );
      default:
        return list;
    }
  }, [notifications, filter]);

  // Derived: Counts per filter
  const filterCounts = useMemo(() => ({
    all: notifications.filter(n => n && typeof n === "object").length,
    unread: notifications.filter(n => n && typeof n === "object" && n.read !== true).length,
    emergency: notifications.filter(n => n && typeof n === "object" && n.type === NOTIFICATION_TYPES.EMERGENCY).length,
    appointments: notifications.filter(n => 
      n &&
      typeof n === "object" &&
      (n.type === NOTIFICATION_TYPES.APPOINTMENT || n.type === NOTIFICATION_TYPES.VISIT)
    ).length,
  }), [notifications]);

  // Actions
  const setFilterType = useCallback((filterType) => {
    setFilter(filterType);
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    // Optimistic
    setNotifications(prev =>
      prev
        .filter(n => n && typeof n === "object")
        .map(n => n.id === notificationId ? { ...n, read: true } : n)
    );

    if (!demoModeEnabled) {
        try {
            await notificationsService.markAsRead(notificationId);
        } catch (error) {
            console.error("Failed to mark read:", error);
        }
    }
  }, [demoModeEnabled]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic
    setNotifications(prev =>
      prev.filter(n => n && typeof n === "object").map(n => ({ ...n, read: true }))
    );

    if (!demoModeEnabled) {
        try {
            await notificationsService.markAllAsRead();
        } catch (error) {
            console.error("Failed to mark all read:", error);
        }
    }
  }, [demoModeEnabled]);

  const deleteNotification = useCallback(async (notificationId) => {
    // Optimistic
    setNotifications(prev => prev.filter(n => n && typeof n === "object" && n.id !== notificationId));

    if (!demoModeEnabled) {
        try {
            await notificationsService.delete(notificationId);
        } catch (error) {
             console.error("Failed to delete notification:", error);
        }
    }
  }, [demoModeEnabled]);

  const clearAll = useCallback(async () => {
    // Optimistic
    setNotifications([]);

    if (!demoModeEnabled) {
        try {
            await notificationsService.clearAll();
        } catch (error) {
             console.error("Failed to clear notifications:", error);
        }
    }
  }, [demoModeEnabled]);

  // Add a new notification
  const addNotification = useCallback(async (notification) => {
    const next = normalizeNotification(notification);
    if (!next) return;

    // Optimistic
    setNotifications(prev => [next, ...prev]);

    if (!demoModeEnabled) {
        try {
            const created = await notificationsService.create(next);
            setNotifications(prev => prev.map(n => n.id === next.id ? created : n));
        } catch (error) {
            console.error("Failed to create notification:", error);
        }
    }
  }, [demoModeEnabled]);

  const refreshNotifications = useCallback(async () => {
      await loadNotifications();
  }, [loadNotifications]);

  const updateNotifications = useCallback((newNotifications) => {
    setNotifications(newNotifications);
  }, []);

  const value = {
    // State
    notifications,
    filteredNotifications,
    filter,
    filters: NOTIFICATION_FILTERS,
    filterCounts,
    unreadCount,
    isLoading,
    error,
    
    // Actions
    setFilterType,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
    refreshNotifications,
    updateNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook for consuming notifications context
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}

export default NotificationsContext;
