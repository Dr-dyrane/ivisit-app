import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { notificationsService } from "../../services/notificationsService";
import { normalizeNotificationsList } from "../../utils/domainNormalize";

export function useNotificationsData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const notificationsQueryKey = useMemo(
    () => ["notifications", user?.id || "anonymous"],
    [user?.id],
  );

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const result = await notificationsService.list();
      return normalizeNotificationsList(result);
    },
    enabled: Boolean(user?.id),
    staleTime: 30 * 1000,
  });

  const notifications = useMemo(
    () =>
      Array.isArray(notificationsQuery.data)
        ? normalizeNotificationsList(notificationsQuery.data)
        : [],
    [notificationsQuery.data],
  );

  const setCachedNotifications = useCallback(
    (updater) => {
      queryClient.setQueryData(notificationsQueryKey, (current) => {
        const base = Array.isArray(current) ? current : [];
        const next = typeof updater === "function" ? updater(base) : updater;
        return normalizeNotificationsList(Array.isArray(next) ? next : []);
      });
    },
    [notificationsQueryKey, queryClient],
  );

  const refreshNotifications = useCallback(async () => {
    return notificationsQuery.refetch();
  }, [notificationsQuery]);

  const addNotification = useCallback(
    async (notificationData) => {
      const created = await notificationsService.create(notificationData);
      setCachedNotifications((current) => [created, ...current]);
      return created;
    },
    [setCachedNotifications],
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      setCachedNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );

      try {
        await notificationsService.markAsRead(notificationId);
      } catch (error) {
        await queryClient.invalidateQueries({
          queryKey: notificationsQueryKey,
        });
        throw error;
      }
    },
    [notificationsQueryKey, queryClient, setCachedNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    setCachedNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );

    try {
      await notificationsService.markAllAsRead();
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      throw error;
    }
  }, [notificationsQueryKey, queryClient, setCachedNotifications]);

  const clearNotification = useCallback(
    async (notificationId) => {
      setCachedNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId),
      );

      try {
        await notificationsService.delete(notificationId);
      } catch (error) {
        await queryClient.invalidateQueries({
          queryKey: notificationsQueryKey,
        });
        throw error;
      }
    },
    [notificationsQueryKey, queryClient, setCachedNotifications],
  );

  const clearAllNotifications = useCallback(async () => {
    setCachedNotifications([]);

    try {
      await notificationsService.clearAll();
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      throw error;
    }
  }, [notificationsQueryKey, queryClient, setCachedNotifications]);

  return {
    notifications,
    isLoading: notificationsQuery.isLoading,
    isRefreshing:
      notificationsQuery.isFetching && !notificationsQuery.isLoading,
    error: notificationsQuery.error || null,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refetch: refreshNotifications,
  };
}
