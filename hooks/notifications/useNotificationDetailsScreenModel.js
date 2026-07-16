import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useToast } from "../../contexts/ToastContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useModeStore } from "../../stores/modeStore";
import { getPriorityColor, getRelativeTime } from "../../constants/notifications";
import { paymentService } from "../../services/paymentService";
import { selectHistoryItemByAnyKey } from "../visits/useVisitHistorySelectors";
import { navigateToNotifications, navigateToVisitDetails } from "../../utils/navigationHelpers";
import {
  getNotificationCashApproval,
  getNotificationPrimaryActionLabel,
  getNotificationVisitKey,
  routeNotificationDestination,
} from "./notificationDestination";
import { NOTIFICATION_DETAILS_COPY } from "../../components/notifications/details/notificationDetails.content";

// The approve/decline RPCs are granted to `authenticated` and carry no role
// check of their own, so this gate is an affordance, not an authority boundary.
// It mirrors the audience notificationDispatcher notifies for cash approval.
const CASH_APPROVAL_ROLES = ["org_admin", "admin"];

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
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    notifications,
    isLoading,
    markAsRead,
    refreshNotifications,
    getNotificationById,
  } = useNotifications();
  const { visits = [] } = useVisits();
  const [cashApprovalPending, setCashApprovalPending] = useState(null);
  const [cashApprovalOutcome, setCashApprovalOutcome] = useState(null);

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

  const cashApproval = useMemo(
    () => getNotificationCashApproval(notification),
    [notification],
  );
  const canActOnCashApproval =
    Boolean(cashApproval) && CASH_APPROVAL_ROLES.includes(user?.role);

  // The details surface owns the approve/decline affordance, so its destination
  // resolves to this same screen. Keyed off the action type rather than a usable
  // cashApproval so a payload missing its ids cannot render a self-routing CTA.
  const isCashApprovalNotification =
    notification?.actionType === "approve_cash_payment";
  const primaryActionLabel = isCashApprovalNotification
    ? null
    : getNotificationPrimaryActionLabel(notification) ||
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

  const runCashApproval = useCallback(
    async (intent) => {
      if (!cashApproval || !canActOnCashApproval) return;
      if (cashApprovalPending || cashApprovalOutcome) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCashApprovalPending(intent);
      try {
        // paymentService throws unless the RPC returned success: true.
        if (intent === "approve") {
          await paymentService.approveCashPayment(
            cashApproval.paymentId,
            cashApproval.requestId,
          );
        } else {
          await paymentService.declineCashPayment(
            cashApproval.paymentId,
            cashApproval.requestId,
          );
        }
        setCashApprovalOutcome(intent === "approve" ? "approved" : "declined");
        showToast(
          intent === "approve"
            ? NOTIFICATION_DETAILS_COPY.messages.cashApproved
            : NOTIFICATION_DETAILS_COPY.messages.cashDeclined,
          "success",
        );
        await refreshNotifications();
      } catch (error) {
        // No outcome is recorded: the server never confirmed one.
        showToast(
          error?.message ||
            (intent === "approve"
              ? NOTIFICATION_DETAILS_COPY.messages.cashApproveFailed
              : NOTIFICATION_DETAILS_COPY.messages.cashDeclineFailed),
          "error",
        );
      } finally {
        setCashApprovalPending(null);
      }
    },
    [
      canActOnCashApproval,
      cashApproval,
      cashApprovalOutcome,
      cashApprovalPending,
      refreshNotifications,
      showToast,
    ],
  );

  const approveCashPayment = useCallback(
    () => runCashApproval("approve"),
    [runCashApproval],
  );

  const declineCashPayment = useCallback(
    () => runCashApproval("decline"),
    [runCashApproval],
  );

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
    cashApproval,
    canActOnCashApproval,
    cashApprovalPending,
    cashApprovalOutcome,
    approveCashPayment,
    declineCashPayment,
  };
}

export default useNotificationDetailsScreenModel;
