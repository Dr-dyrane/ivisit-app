// contexts/NotificationsContext.jsx - Notifications data boundary

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNotificationsData } from "../hooks/notifications/useNotificationsData";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
} from "../constants/notifications";

const NotificationsContext = createContext();

function filterNotifications(notifications, filter) {
  const list = Array.isArray(notifications) ? notifications : [];

  switch (filter) {
    case "unread":
      return list.filter((notification) => notification?.read !== true);
    case "emergency":
      return list.filter(
        (notification) => notification?.type === NOTIFICATION_TYPES.EMERGENCY,
      );
    case "appointments":
      return list.filter(
        (notification) =>
          notification?.type === NOTIFICATION_TYPES.APPOINTMENT ||
          notification?.type === NOTIFICATION_TYPES.VISIT,
      );
    case "support":
      return list.filter(
        (notification) => notification?.type === NOTIFICATION_TYPES.SUPPORT,
      );
    case "all":
    default:
      return list;
  }
}

function getFilterCountMap(notifications) {
  const list = Array.isArray(notifications) ? notifications : [];

  return {
    all: list.length,
    unread: list.filter((notification) => notification?.read !== true).length,
    emergency: list.filter(
      (notification) => notification?.type === NOTIFICATION_TYPES.EMERGENCY,
    ).length,
    appointments: list.filter(
      (notification) =>
        notification?.type === NOTIFICATION_TYPES.APPOINTMENT ||
        notification?.type === NOTIFICATION_TYPES.VISIT,
    ).length,
    support: list.filter(
      (notification) => notification?.type === NOTIFICATION_TYPES.SUPPORT,
    ).length,
  };
}

export function NotificationsProvider({ children }) {
  const {
    notifications,
    isLoading,
    isRefreshing,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refetch: refreshNotifications,
  } = useNotificationsData();
  const [filter, setFilter] = useState("all");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);

  const unreadCount = useMemo(
    () =>
      Array.isArray(notifications)
        ? notifications.filter((notification) => notification?.read !== true)
            .length
        : 0,
    [notifications],
  );

  const filters = useMemo(() => NOTIFICATION_FILTERS, []);

  const filterCounts = useMemo(
    () => getFilterCountMap(notifications),
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [filter, notifications],
  );

  const selectedNotifications = useMemo(
    () => new Set(selectedNotificationIds),
    [selectedNotificationIds],
  );

  const setFilterType = useCallback((nextFilter) => {
    const normalized =
      typeof nextFilter === "string" &&
      NOTIFICATION_FILTERS.some((entry) => entry.id === nextFilter)
        ? nextFilter
        : "all";

    setFilter(normalized);
    setSelectedNotificationIds([]);
    setIsSelectMode(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNotificationIds([]);
  }, []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((current) => {
      const next = !current;
      if (!next) {
        setSelectedNotificationIds([]);
      }
      return next;
    });
  }, []);

  const toggleNotificationSelection = useCallback((notificationId) => {
    if (!notificationId) return;

    setSelectedNotificationIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId],
    );
  }, []);

  const selectAllNotifications = useCallback(() => {
    setSelectedNotificationIds(
      filteredNotifications
        .map((notification) => notification?.id)
        .filter(Boolean),
    );
  }, [filteredNotifications]);

  const markSelectedAsRead = useCallback(async () => {
    if (selectedNotificationIds.length === 0) return;

    await Promise.all(selectedNotificationIds.map((id) => markAsRead(id)));
    setSelectedNotificationIds([]);
  }, [markAsRead, selectedNotificationIds]);

  const deleteSelectedNotifications = useCallback(async () => {
    if (selectedNotificationIds.length === 0) return;

    await Promise.all(
      selectedNotificationIds.map((id) => clearNotification(id)),
    );
    setSelectedNotificationIds([]);
    setIsSelectMode(false);
  }, [clearNotification, selectedNotificationIds]);

  const value = useMemo(
    () => ({
      notifications,
      filteredNotifications,
      filter,
      filters,
      filterCounts,
      unreadCount,
      isLoading,
      isRefreshing,
      isSelectMode,
      selectedNotifications,
      error,
      addNotification,
      setFilterType,
      markAsRead,
      markAllAsRead,
      deleteNotification: clearNotification,
      clearAll: clearAllNotifications,
      toggleSelectMode,
      toggleNotificationSelection,
      selectAllNotifications,
      clearSelection,
      markSelectedAsRead,
      deleteSelectedNotifications,
      refreshNotifications,
    }),
    [
      addNotification,
      clearAllNotifications,
      clearSelection,
      clearNotification,
      deleteSelectedNotifications,
      error,
      filter,
      filteredNotifications,
      filterCounts,
      filters,
      isLoading,
      isRefreshing,
      isSelectMode,
      markAllAsRead,
      markAsRead,
      markSelectedAsRead,
      notifications,
      refreshNotifications,
      selectAllNotifications,
      selectedNotifications,
      setFilterType,
      toggleNotificationSelection,
      toggleSelectMode,
      unreadCount,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}

export default NotificationsContext;
