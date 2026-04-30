import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtom } from "jotai";
import * as Haptics from "expo-haptics";
import { useNotifications } from "../../contexts/NotificationsContext";
import { EmergencyMode } from "../../contexts/EmergencyContext";
import { useModeStore } from "../../stores/modeStore";
import {
  navigateToHelpSupport,
  navigateToMore,
  navigateToNotificationDetails,
  navigateToSOS,
  navigateToVisitDetails,
  navigateToVisits,
} from "../../utils/navigationHelpers";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
} from "../../constants/notifications";
import {
  notificationsFilterAtom,
  notificationsSelectModeAtom,
  notificationsSelectedIdsAtom,
} from "../../atoms/notificationsScreenAtoms";
import { NOTIFICATIONS_SCREEN_COPY } from "../../components/notifications/notificationsScreen.content";

function isValidFilter(value) {
  return NOTIFICATION_FILTERS.some((filter) => filter.id === value);
}

function formatSectionLabel(timestamp) {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "Recent";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );

  if (itemDay.getTime() === today.getTime()) return "Today";
  if (itemDay.getTime() === yesterday.getTime()) return "Yesterday";

  return value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function buildSections(items) {
  const sections = [];
  let lastLabel = null;

  for (const item of items) {
    const label = formatSectionLabel(item?.timestamp);
    if (label !== lastLabel) {
      sections.push({ key: `section-${label}`, label, items: [item] });
      lastLabel = label;
      continue;
    }

    sections[sections.length - 1].items.push(item);
  }

  return sections;
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

function getNotificationDestination({
  actionType,
  actionData,
  notification,
  router,
  setEmergencyMode,
}) {
  const visitId =
    typeof actionData?.visitId === "string"
      ? actionData.visitId
      : typeof actionData?.appointmentId === "string"
        ? actionData.appointmentId
        : null;

  if (actionType === "track") {
    navigateToSOS({
      router,
      setEmergencyMode,
      mode: EmergencyMode.EMERGENCY,
    });
    return;
  }

  if (actionType === "view_appointment") {
    if (visitId) {
      navigateToVisitDetails({ router, visitId });
      return;
    }
    navigateToVisits({ router, filter: "upcoming" });
    return;
  }

  if (actionType === "view_visit" || actionType === "view_summary") {
    if (visitId) {
      navigateToVisitDetails({ router, visitId });
      return;
    }
    navigateToVisits({ router });
    return;
  }

  if (actionType === "upgrade") {
    navigateToMore({ router });
    return;
  }

  if (actionType === "view_ticket") {
    navigateToHelpSupport({ router, ticketId: actionData?.ticketId });
    return;
  }

  if (actionType === "view_insurance") {
    navigateToMore({ router, screen: "insurance" });
    return;
  }

  navigateToNotificationDetails({
    router,
    notificationId: notification?.id,
  });
}

export function useNotificationsScreenModel() {
  const router = useRouter();
  const { filter: filterParam } = useLocalSearchParams();
  const setEmergencyMode = useModeStore((state) => state.setMode);
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();
  const [filter, setFilter] = useAtom(notificationsFilterAtom);
  const [isSelectMode, setIsSelectMode] = useAtom(notificationsSelectModeAtom);
  const [selectedIds, setSelectedIds] = useAtom(notificationsSelectedIdsAtom);

  useEffect(() => {
    const nextFilter =
      typeof filterParam === "string"
        ? filterParam
        : Array.isArray(filterParam)
          ? filterParam[0]
          : null;

    if (nextFilter && isValidFilter(nextFilter) && nextFilter !== filter) {
      setFilter(nextFilter);
    }
  }, [filter, filterParam, setFilter]);

  useEffect(() => {
    const ids = new Set(
      Array.isArray(notifications)
        ? notifications.map((notification) => notification?.id).filter(Boolean)
        : [],
    );

    setSelectedIds((current) => current.filter((id) => ids.has(id)));
  }, [notifications, setSelectedIds]);

  const filterCounts = useMemo(
    () => getFilterCountMap(notifications),
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [filter, notifications],
  );
  const sections = useMemo(
    () => buildSections(filteredNotifications),
    [filteredNotifications],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allFilteredSelected =
    filteredNotifications.length > 0 &&
    selectedCount === filteredNotifications.length;
  const filterLabel =
    NOTIFICATION_FILTERS.find((option) => option.id === filter)?.label || "All";
  const totalCount = Array.isArray(notifications) ? notifications.length : 0;
  const hasNotifications = filteredNotifications.length > 0;
  const isDataLoading = isLoading && totalCount === 0;
  const headerSubtitle = isSelectMode
    ? `${selectedCount} selected`
    : unreadCount > 0
      ? `${unreadCount} unread`
      : "All caught up";
  const primaryActionLabel = isSelectMode
    ? NOTIFICATIONS_SCREEN_COPY.context.primarySelecting
    : unreadCount > 0
      ? NOTIFICATIONS_SCREEN_COPY.context.primaryUnread
      : NOTIFICATIONS_SCREEN_COPY.context.primaryIdle;

  const closeSelectionMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, [setIsSelectMode, setSelectedIds]);

  const openSelectionMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSelectMode(true);
  }, [setIsSelectMode]);

  const toggleSelectionMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSelectMode) {
      closeSelectionMode();
      return;
    }
    setIsSelectMode(true);
  }, [closeSelectionMode, isSelectMode, setIsSelectMode]);

  const selectFilter = useCallback(
    (nextFilter) => {
      if (nextFilter === filter) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFilter(nextFilter);
      setSelectedIds([]);
      setIsSelectMode(false);
    },
    [filter, setFilter, setIsSelectMode, setSelectedIds],
  );

  const toggleNotificationSelection = useCallback(
    (notificationId) => {
      setSelectedIds((current) =>
        current.includes(notificationId)
          ? current.filter((id) => id !== notificationId)
          : [...current, notificationId],
      );
    },
    [setSelectedIds],
  );

  const toggleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(
      allFilteredSelected
        ? []
        : filteredNotifications
            .map((notification) => notification?.id)
            .filter(Boolean),
    );
  }, [allFilteredSelected, filteredNotifications, setSelectedIds]);

  const handlePrimaryAction = useCallback(async () => {
    if (isSelectMode) {
      closeSelectionMode();
      return;
    }

    if (unreadCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await markAllAsRead();
      return;
    }

    await refreshNotifications();
  }, [
    closeSelectionMode,
    isSelectMode,
    markAllAsRead,
    refreshNotifications,
    unreadCount,
  ]);

  const markSelectedRead = useCallback(async () => {
    if (selectedCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all(selectedIds.map((id) => markAsRead(id)));
    setSelectedIds([]);
  }, [markAsRead, selectedCount, selectedIds, setSelectedIds]);

  const deleteSelected = useCallback(() => {
    if (selectedCount === 0) return;

    Alert.alert(
      "Delete notifications",
      `Delete ${selectedCount} notification${selectedCount === 1 ? "" : "s"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Promise.all(selectedIds.map((id) => deleteNotification(id)));
            closeSelectionMode();
          },
        },
      ],
    );
  }, [closeSelectionMode, deleteNotification, selectedCount, selectedIds]);

  const handleNotificationPress = useCallback(
    async (notification) => {
      if (!notification?.id) return;

      if (isSelectMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleNotificationSelection(notification.id);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (notification.read !== true) {
        await markAsRead(notification.id);
      }

      getNotificationDestination({
        actionType: notification?.actionType ?? null,
        actionData: notification?.actionData ?? {},
        notification,
        router,
        setEmergencyMode,
      });
    },
    [
      isSelectMode,
      markAsRead,
      router,
      setEmergencyMode,
      toggleNotificationSelection,
    ],
  );

  const handleNotificationLongPress = useCallback(
    (notification) => {
      if (!notification?.id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsSelectMode(true);
      setSelectedIds((current) =>
        current.includes(notification.id)
          ? current
          : [...current, notification.id],
      );
    },
    [setIsSelectMode, setSelectedIds],
  );

  return {
    router,
    notifications,
    filteredNotifications,
    sections,
    filters: NOTIFICATION_FILTERS,
    filter,
    filterLabel,
    filterCounts,
    unreadCount,
    totalCount,
    isDataLoading,
    isRefreshing,
    hasNotifications,
    isSelectMode,
    selectedIds,
    selectedIdSet,
    selectedCount,
    allFilteredSelected,
    headerSubtitle,
    primaryActionLabel,
    contextUnreadLabel:
      unreadCount === 1 ? "1 unread alert" : `${unreadCount} unread alerts`,
    contextTotalLabel:
      totalCount === 1 ? "1 notification" : `${totalCount} notifications`,
    focusLabel: filterLabel,
    refresh: refreshNotifications,
    onPrimaryAction: handlePrimaryAction,
    onSelectFilter: selectFilter,
    onOpenSelectionMode: openSelectionMode,
    onToggleSelectionMode: toggleSelectionMode,
    onCloseSelectionMode: closeSelectionMode,
    onToggleSelectAll: toggleSelectAll,
    onMarkSelectedRead: markSelectedRead,
    onDeleteSelected: deleteSelected,
    onNotificationPress: handleNotificationPress,
    onNotificationLongPress: handleNotificationLongPress,
  };
}
