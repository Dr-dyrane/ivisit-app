import { useMemo } from "react";
import useNotificationsStore from "./notificationsStore";

// PULLBACK NOTE: Notifications Layer 3 selectors.
// Owns: canonical read helpers so screens/headers/search do not duplicate inbox rules.

export const selectNotifications = (state) =>
  Array.isArray(state?.notifications) ? state.notifications : [];

export const selectUnreadNotifications = (state) =>
  selectNotifications(state).filter((notification) => notification?.read !== true);

export const selectUnreadNotificationsCount = (state) =>
  selectUnreadNotifications(state).length;

export const selectNotificationById = (state, notificationId) =>
  selectNotifications(state).find(
    (notification) => String(notification?.id) === String(notificationId),
  ) || null;

export const selectNotificationsReady = (state) =>
  state?.hydrated === true && (state?.isReady === true || !state?.ownerUserId);

export const useNotificationsList = () =>
  useNotificationsStore(selectNotifications);

export const useUnreadNotificationsCount = () =>
  useNotificationsStore(selectUnreadNotificationsCount);

export const useNotificationById = (notificationId) => {
  const store = useNotificationsStore();
  return useMemo(
    () => selectNotificationById(store, notificationId),
    [notificationId, store],
  );
};
