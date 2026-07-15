import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../../services/notificationsService";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { normalizeNotificationsList } from "../../utils/domainNormalize";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications five-layer pass - Layer 2 write lane.
// Owns: optimistic inbox writes and post-settlement cache reconciliation.
// Does NOT own: persisted cross-surface reads or lifecycle legality.

export function useNotificationsMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = notificationsQueryKeys.list(userId);
  const incrementMutationCount = useNotificationsStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useNotificationsStore(
    (state) => state.decrementMutationCount,
  );

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => notificationsService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeNotificationsList(
          (Array.isArray(current) ? current : []).map((notification) =>
            String(notification?.id) === String(notificationId)
              ? {
                  ...notification,
                  read: true,
                  updatedAt: new Date().toISOString(),
                }
              : notification,
          ),
        ),
      );
      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeNotificationsList(
          (Array.isArray(current) ? current : []).map((notification) => ({
            ...notification,
            read: true,
            updatedAt: new Date().toISOString(),
          })),
        ),
      );
      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (notificationIds) =>
      notificationsService.dismissMany(notificationIds),
    onMutate: async (notificationIds) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      const dismissedIds = new Set(
        (Array.isArray(notificationIds) ? notificationIds : [notificationIds])
          .map((id) => String(id || ""))
          .filter(Boolean),
      );
      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeNotificationsList(
          (Array.isArray(current) ? current : []).filter(
            (notification) => !dismissedIds.has(String(notification?.id || "")),
          ),
        ),
      );
      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: () => notificationsService.dismissAll(),
    onMutate: async () => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(queryKey, []);
      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addNotification = useCallback(async () => null, []);
  const markAsRead = useCallback(
    (notificationId) => markAsReadMutation.mutateAsync(notificationId),
    [markAsReadMutation],
  );
  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation],
  );
  const dismissNotification = useCallback(
    (notificationId) => dismissMutation.mutateAsync([notificationId]),
    [dismissMutation],
  );
  const dismissNotifications = useCallback(
    (notificationIds) => dismissMutation.mutateAsync(notificationIds),
    [dismissMutation],
  );
  const clearAll = useCallback(
    () => dismissAllMutation.mutateAsync(),
    [dismissAllMutation],
  );

  return useMemo(
    () => ({
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      dismissNotifications,
      clearAll,
      isMutating:
        markAsReadMutation.isPending ||
        markAllAsReadMutation.isPending ||
        dismissMutation.isPending ||
        dismissAllMutation.isPending,
      error:
        markAsReadMutation.error ||
        markAllAsReadMutation.error ||
        dismissMutation.error ||
        dismissAllMutation.error ||
        null,
    }),
    [
      addNotification,
      clearAll,
      dismissAllMutation.error,
      dismissAllMutation.isPending,
      dismissMutation.error,
      dismissMutation.isPending,
      dismissNotification,
      dismissNotifications,
      markAllAsRead,
      markAllAsReadMutation.error,
      markAllAsReadMutation.isPending,
      markAsRead,
      markAsReadMutation.error,
      markAsReadMutation.isPending,
    ],
  );
}

export default useNotificationsMutations;
