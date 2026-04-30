import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "../../services/notificationsService";
import { useNotificationsStore } from "../../stores/notificationsStore";
import {
  normalizeNotification,
  normalizeNotificationsList,
} from "../../utils/domainNormalize";
import { notificationsQueryKeys } from "./notifications.queryKeys";

// PULLBACK NOTE: Notifications five-layer pass - Layer 2 write lane.
// Owns: optimistic inbox writes and post-settlement cache reconciliation.
// Does NOT own: persisted cross-surface reads or lifecycle legality.

const buildOptimisticNotification = (input = {}) =>
  normalizeNotification({
    ...input,
    id: `optimistic_${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: input?.read === true,
  });

export function useNotificationsMutations({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = notificationsQueryKeys.list(userId);
  const incrementMutationCount = useNotificationsStore(
    (state) => state.incrementMutationCount,
  );
  const decrementMutationCount = useNotificationsStore(
    (state) => state.decrementMutationCount,
  );

  const createMutation = useMutation({
    mutationFn: (notification) => notificationsService.create(notification),
    onMutate: async (notification) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      const optimisticNotification = buildOptimisticNotification(notification);
      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeNotificationsList([optimisticNotification, ...current]),
      );
      return { previousNotifications };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSuccess: (createdNotification) => {
      queryClient.setQueryData(queryKey, (current = []) => {
        const next = (Array.isArray(current) ? current : []).filter(
          (notification) =>
            !String(notification?.id || "").startsWith("optimistic_"),
        );
        return normalizeNotificationsList([createdNotification, ...next]);
      });
    },
    onSettled: () => {
      decrementMutationCount();
      queryClient.invalidateQueries({ queryKey });
    },
  });

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

  const deleteMutation = useMutation({
    mutationFn: (notificationId) => notificationsService.delete(notificationId),
    onMutate: async (notificationId) => {
      incrementMutationCount();
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications = queryClient.getQueryData(queryKey) || [];
      queryClient.setQueryData(queryKey, (current = []) =>
        normalizeNotificationsList(
          (Array.isArray(current) ? current : []).filter(
            (notification) => String(notification?.id) !== String(notificationId),
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

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsService.clearAll(),
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

  const addNotification = useCallback(
    (notification) => createMutation.mutateAsync(notification),
    [createMutation],
  );
  const markAsRead = useCallback(
    (notificationId) => markAsReadMutation.mutateAsync(notificationId),
    [markAsReadMutation],
  );
  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation],
  );
  const deleteNotification = useCallback(
    (notificationId) => deleteMutation.mutateAsync(notificationId),
    [deleteMutation],
  );
  const clearAll = useCallback(
    () => clearAllMutation.mutateAsync(),
    [clearAllMutation],
  );

  return useMemo(
    () => ({
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      isMutating:
        createMutation.isPending ||
        markAsReadMutation.isPending ||
        markAllAsReadMutation.isPending ||
        deleteMutation.isPending ||
        clearAllMutation.isPending,
      error:
        createMutation.error ||
        markAsReadMutation.error ||
        markAllAsReadMutation.error ||
        deleteMutation.error ||
        clearAllMutation.error ||
        null,
    }),
    [
      addNotification,
      clearAll,
      clearAllMutation.error,
      clearAllMutation.isPending,
      createMutation.error,
      createMutation.isPending,
      deleteMutation.error,
      deleteMutation.isPending,
      deleteNotification,
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
