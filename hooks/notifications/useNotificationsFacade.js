import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  selectNotificationById,
  selectNotifications,
  selectUnreadNotificationsCount,
} from "../../stores/notificationsSelectors";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { useNotificationsMutations } from "./useNotificationsMutations";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications compatibility facade hook.
// OLD: provider owned query observer, selection/filter UI state, and consumer-facing CRUD.
// NEW: bootstrap runs once at runtime; this hook now exposes canonical inbox data, status, and mutations to consumers.

export function useNotificationsFacade() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;
  const queryClient = useQueryClient();

  const notifications = useNotificationsStore(selectNotifications);
  const unreadCount = useNotificationsStore(selectUnreadNotificationsCount);
  const hydrated = useNotificationsStore((state) => state.hydrated);
  const ownerUserId = useNotificationsStore((state) => state.ownerUserId);
  const isSyncing = useNotificationsStore((state) => state.isSyncing);
  const isReady = useNotificationsStore((state) => state.isReady);
  const lifecycleError = useNotificationsStore(
    (state) => state.lifecycleError,
  );
  const requestNotificationsRetry = useNotificationsStore(
    (state) => state.requestNotificationsRetry,
  );

  const mutations = useNotificationsMutations({ userId });

  const refreshNotifications = useCallback(async () => {
    if (!userId) return [];
    await queryClient.invalidateQueries({
      queryKey: notificationsQueryKeys.list(userId),
      exact: true,
    });
    await queryClient.refetchQueries({
      queryKey: notificationsQueryKeys.list(userId),
      exact: true,
    });
    return queryClient.getQueryData(notificationsQueryKeys.list(userId)) || [];
  }, [queryClient, userId]);

  const safeNotifications = useMemo(() => {
    if (!userId) return [];
    if (ownerUserId && ownerUserId !== userId) return [];
    return notifications;
  }, [notifications, ownerUserId, userId]);

  const isLoading =
    !hydrated || (Boolean(userId) && isSyncing && safeNotifications.length === 0);
  const isRefreshing =
    hydrated && Boolean(userId) && isSyncing && safeNotifications.length > 0;
  const error = mutations.error?.message || lifecycleError || null;

  const getNotificationById = useCallback(
    (notificationId) =>
      selectNotificationById({ notifications: safeNotifications }, notificationId),
    [safeNotifications],
  );

  return {
    notifications: safeNotifications,
    unreadCount:
      userId && (!ownerUserId || ownerUserId === userId) ? unreadCount : 0,
    isLoading,
    isRefreshing,
    error,
    addNotification: mutations.addNotification,
    markAsRead: mutations.markAsRead,
    markAllAsRead: mutations.markAllAsRead,
    deleteNotification: mutations.deleteNotification,
    clearAll: mutations.clearAll,
    refreshNotifications,
    refetch: refreshNotifications,
    getNotificationById,
    isReady,
    retry: requestNotificationsRetry,
  };
}

export default useNotificationsFacade;
