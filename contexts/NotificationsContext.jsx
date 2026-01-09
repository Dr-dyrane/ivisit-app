// contexts/NotificationsContext.jsx - Notifications state management

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { 
  NOTIFICATIONS, 
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from "../data/notifications";
import { database, StorageKeys } from "../database";

// Create the notifications context
const NotificationsContext = createContext();

/**
 * NotificationsProvider - Manages notification state
 * 
 * Features:
 * - Read/unread tracking
 * - Filtering by type
 * - Mark as read (single/all)
 * - Delete/clear notifications
 * - Unread count for badges
 * - Ready for backend integration
 */
export function NotificationsProvider({ children }) {
  // Core state
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  
  // Loading state for API integration
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      setIsLoading(true);
      try {
        const stored = await database.read(StorageKeys.NOTIFICATIONS, null);
        if (!isActive) return;
        if (Array.isArray(stored) && stored.length > 0) {
          setNotifications(stored);
          return;
        }
        setNotifications(NOTIFICATIONS);
        await database.write(StorageKeys.NOTIFICATIONS, NOTIFICATIONS);
      } catch (e) {
        if (!isActive) return;
        setNotifications(NOTIFICATIONS);
        setError(e?.message ?? "Failed to load notifications");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(notifications)) return;
    database.write(StorageKeys.NOTIFICATIONS, notifications).catch(() => {});
  }, [notifications]);

  // Derived: Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Derived: Filtered notifications
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "emergency":
        return notifications.filter(n => n.type === NOTIFICATION_TYPES.EMERGENCY);
      case "appointments":
        return notifications.filter(n => 
          n.type === NOTIFICATION_TYPES.APPOINTMENT || 
          n.type === NOTIFICATION_TYPES.VISIT
        );
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // Derived: Counts per filter
  const filterCounts = useMemo(() => ({
    all: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    emergency: notifications.filter(n => n.type === NOTIFICATION_TYPES.EMERGENCY).length,
    appointments: notifications.filter(n => 
      n.type === NOTIFICATION_TYPES.APPOINTMENT || 
      n.type === NOTIFICATION_TYPES.VISIT
    ).length,
  }), [notifications]);

  // Actions
  const setFilterType = useCallback((filterType) => {
    setFilter(filterType);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Add a new notification (for push/realtime)
  const addNotification = useCallback((notification) => {
    const now = new Date().toISOString();
    const base = notification && typeof notification === "object" ? notification : {};
    setNotifications(prev => [
      { 
        id: String(Date.now()),
        type: base.type ?? NOTIFICATION_TYPES.SYSTEM,
        title: base.title ?? "Update",
        message: base.message ?? "",
        timestamp: base.timestamp ?? now,
        read: base.read === true ? true : false,
        priority: base.priority ?? NOTIFICATION_PRIORITY.NORMAL,
        actionType: base.actionType ?? null,
        actionData: base.actionData ?? null,
      },
      ...(Array.isArray(prev) ? prev : []),
    ]);
  }, []);

  // Refresh notifications (mock - for pull-to-refresh)
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stored = await database.read(StorageKeys.NOTIFICATIONS, []);
      setNotifications(Array.isArray(stored) ? stored : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update notifications from API
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
