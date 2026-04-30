import { useCallback, useMemo } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useModeStore } from "../../stores/modeStore";
import { getPriorityColor, getRelativeTime } from "../../constants/notifications";
import { selectHistoryItemByAnyKey } from "../visits/useVisitHistorySelectors";
import { navigateToNotifications, navigateToVisitDetails } from "../../utils/navigationHelpers";
import {
  getNotificationPrimaryActionLabel,
  getNotificationVisitKey,
  routeNotificationDestination,
} from "./notificationDestination";
import { NOTIFICATION_DETAILS_COPY } from "../../components/notifications/details/notificationDetails.content";

// PULLBACK NOTE: Notification details screen model.
// Owns: param lookup, mark-read-on-open, linked-visit derivation, and primary destination routing.
// Does NOT own: shell layout, typography, or wide/compact composition.

const toParamString = (value) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;

const toTitleCase = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Notification";
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function useNotificationDetailsScreenModel() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = toParamString(params?.id);
  const setEmergencyMode = useModeStore((state) => state.setMode);
  const {
    notifications,
    isLoading,
    markAsRead,
    refreshNotifications,
    getNotificationById,
  } = useNotifications();
  const { visits = [] } = useVisits();

  const notification =
    getNotificationById?.(notificationId) ||
    notifications.find((entry) => String(entry?.id) === String(notificationId)) ||
    null;

  const linkedVisitKey = getNotificationVisitKey(notification);
  const linkedVisit = useMemo(
    () =>
      linkedVisitKey ? selectHistoryItemByAnyKey(visits, linkedVisitKey) : null,
    [linkedVisitKey, visits],
  );

  const primaryActionLabel =
    getNotificationPrimaryActionLabel(notification) ||
    (linkedVisitKey ? NOTIFICATION_DETAILS_COPY.rows.openVisit : null);

  const detailLoading = isLoading && !notification;
  const missing = !detailLoading && !notification;
  const headerSubtitle = detailLoading
    ? NOTIFICATION_DETAILS_COPY.messages.loading
    : missing
      ? "Alert unavailable"
      : notification?.read !== true
        ? NOTIFICATION_DETAILS_COPY.messages.unread
        : NOTIFICATION_DETAILS_COPY.messages.read;

  const priorityColor = notification
    ? getPriorityColor(notification.priority)
    : "#86100E";
  const recordedAtLabel = notification?.timestamp
    ? new Date(notification.timestamp).toLocaleString()
    : null;
  const relativeTime = notification?.timestamp
    ? getRelativeTime(notification.timestamp)
    : null;
  const statusLabel = notification?.read !== true ? "Unread" : "Read";
  const typeLabel = toTitleCase(notification?.type);
  const priorityLabel = toTitleCase(notification?.priority);

  useFocusEffect(
    useCallback(() => {
      if (notification?.id && notification.read !== true) {
        void markAsRead(notification.id);
      }
      if (!notificationId || notification) return undefined;
      void refreshNotifications();
      return undefined;
    }, [
      markAsRead,
      notification,
      notificationId,
      refreshNotifications,
    ]),
  );

  const openInbox = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToNotifications({ router, method: "replace" });
  }, [router]);

  const openLinkedVisit = useCallback(() => {
    if (!linkedVisitKey) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateToVisitDetails({
      router,
      visitId: linkedVisitKey,
      method: "replace",
    });
  }, [linkedVisitKey, router]);

  const handlePrimaryAction = useCallback(() => {
    if (!notification) {
      openInbox();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const didRoute = routeNotificationDestination({
      notification,
      router,
      setEmergencyMode,
      method: "replace",
      fallbackToDetails: false,
    });
    if (!didRoute && linkedVisitKey) {
      navigateToVisitDetails({
        router,
        visitId: linkedVisitKey,
        method: "replace",
      });
      return;
    }
    if (!didRoute) {
      openInbox();
    }
  }, [linkedVisitKey, notification, openInbox, router, setEmergencyMode]);

  return {
    notificationId,
    notification,
    linkedVisit,
    linkedVisitKey,
    isLoading: detailLoading,
    isMissing: missing,
    headerSubtitle,
    primaryActionLabel,
    priorityColor,
    recordedAtLabel,
    relativeTime,
    statusLabel,
    typeLabel,
    priorityLabel,
    openInbox,
    openLinkedVisit,
    onPrimaryAction: handlePrimaryAction,
  };
}

export default useNotificationDetailsScreenModel;
