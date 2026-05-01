import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtom } from "jotai";
import * as Haptics from "expo-haptics";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useModeStore } from "../../stores/modeStore";
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
import {
  getNotificationPrimaryActionLabel,
  routeNotificationDestination,
} from "./notificationDestination";

function isValidFilter(value) {
  return NOTIFICATION_FILTERS.some((filter) => filter.id === value);
}

function normalizeRouteFilter(value) {
  const nextFilter =
    typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  return nextFilter && isValidFilter(nextFilter) ? nextFilter : null;
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
  const routeFilter = normalizeRouteFilter(filterParam);
  const activeFilter = routeFilter || filter;
  const notificationIdSet = useMemo(
    () =>
      new Set(
        Array.isArray(notifications)
          ? notifications
              .map((notification) => notification?.id)
              .filter(Boolean)
          : [],
      ),
    [notifications],
  );
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => notificationIdSet.has(id)),
    [notificationIdSet, selectedIds],
  );

  const filterCounts = useMemo(
    () => getFilterCountMap(notifications),
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, activeFilter),
    [activeFilter, notifications],
  );
  const sections = useMemo(
    () => buildSections(filteredNotifications),
    [filteredNotifications],
  );
  const selectedIdSet = useMemo(
    () => new Set(validSelectedIds),
    [validSelectedIds],
  );
  const selectedCount = validSelectedIds.length;
  const allFilteredSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((notification) =>
      selectedIdSet.has(notification?.id),
    );
  const filterLabel =
    NOTIFICATION_FILTERS.find((option) => option.id === activeFilter)?.label ||
    "All";
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
      if (nextFilter === activeFilter) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (routeFilter) {
        if (nextFilter === "all") {
          router.replace("/(user)/(stacks)/notifications");
        } else {
          router.replace({
            pathname: "/(user)/(stacks)/notifications",
            params: { filter: nextFilter },
          });
        }
      } else {
        setFilter(nextFilter);
      }
      setSelectedIds([]);
      setIsSelectMode(false);
    },
    [
      activeFilter,
      routeFilter,
      router,
      setFilter,
      setIsSelectMode,
      setSelectedIds,
    ],
  );

  const toggleNotificationSelection = useCallback(
    (notificationId) => {
      setSelectedIds((current) => {
        const nextCurrent = current.filter((id) => notificationIdSet.has(id));
        return nextCurrent.includes(notificationId)
          ? nextCurrent.filter((id) => id !== notificationId)
          : [...nextCurrent, notificationId];
      });
    },
    [notificationIdSet, setSelectedIds],
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
    await Promise.all(validSelectedIds.map((id) => markAsRead(id)));
    setSelectedIds([]);
  }, [markAsRead, selectedCount, setSelectedIds, validSelectedIds]);

  const deleteNotificationIds = useCallback(
    async (notificationIds) => {
      const ids = [...new Set((notificationIds || []).filter(Boolean))];
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => deleteNotification(id)));
      closeSelectionMode();
    },
    [closeSelectionMode, deleteNotification],
  );

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
            await deleteNotificationIds(validSelectedIds);
          },
        },
      ],
    );
  }, [deleteNotificationIds, selectedCount, validSelectedIds]);

  const prepareSectionSelection = useCallback(
    (section) => {
      const ids =
        section?.items
          ?.map((notification) => notification?.id)
          .filter(Boolean) ?? [];

      if (ids.length === 0) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsSelectMode(true);
      setSelectedIds(ids);
    },
    [setIsSelectMode, setSelectedIds],
  );

  const deleteSection = useCallback(
    async (section) => {
      const ids =
        section?.items
          ?.map((notification) => notification?.id)
          .filter(Boolean) ?? [];

      if (ids.length === 0) return;

      await deleteNotificationIds(ids);
    },
    [deleteNotificationIds],
  );

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

      routeNotificationDestination({
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
    filter: activeFilter,
    filterLabel,
    filterCounts,
    unreadCount,
    totalCount,
    isDataLoading,
    isRefreshing,
    hasNotifications,
    isSelectMode,
    selectedIds: validSelectedIds,
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
    getPrimaryActionLabel: getNotificationPrimaryActionLabel,
    refresh: refreshNotifications,
    onPrimaryAction: handlePrimaryAction,
    onSelectFilter: selectFilter,
    onOpenSelectionMode: openSelectionMode,
    onToggleSelectionMode: toggleSelectionMode,
    onCloseSelectionMode: closeSelectionMode,
    onToggleSelectAll: toggleSelectAll,
    onMarkSelectedRead: markSelectedRead,
    onDeleteSelected: deleteSelected,
    onPrepareSectionSelection: prepareSectionSelection,
    onDeleteSection: deleteSection,
    onNotificationPress: handleNotificationPress,
    onNotificationLongPress: handleNotificationLongPress,
  };
}
