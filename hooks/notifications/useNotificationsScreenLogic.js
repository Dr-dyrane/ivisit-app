/**
 * hooks/notifications/useNotificationsScreenLogic.js
 * 
 * Logic hook for NotificationsScreen.
 * Handles notification filtering, selection, navigation, and header/tabbar coordination.
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import { Animated, Platform, Alert, View, Pressable, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useEmergency, EmergencyMode } from "../../contexts/EmergencyContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import ActionWrapper from "../../components/headers/ActionWrapper";
import { Ionicons } from "@expo/vector-icons";
import {
    navigateToMore,
    navigateToNotifications,
    navigateToSOS,
    navigateToVisitDetails,
    navigateToVisits,
    navigateToNotificationDetails,
    navigateToHelpSupport,
} from "../../utils/navigationHelpers";

export const useNotificationsScreenLogic = () => {
    const router = useRouter();
    const { filter: filterParam } = useLocalSearchParams();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const { setMode } = useEmergency();

    const {
        filteredNotifications,
        filter,
        filters,
        filterCounts,
        unreadCount,
        isLoading,
        setFilterType,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        isSelectMode,
        selectedNotifications,
        toggleSelectMode,
        toggleNotificationSelection,
        selectAllNotifications,
        clearSelection,
        markSelectedAsRead,
        deleteSelectedNotifications,
    } = useNotifications();

    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

    const fadeAnimNew = useRef(new Animated.Value(0)).current;
    const slideAnimNew = useRef(new Animated.Value(30)).current;

    // Animation Effect
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnimNew, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnimNew, {
                toValue: 0,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleTabBarScroll, handleHeaderScroll]
    );

    const handleNotificationPress = useCallback(
        (notification) => {
            const actionType = notification?.actionType ?? null;
            const actionData = notification?.actionData ?? {};
            const visitId =
                typeof actionData?.visitId === "string"
                    ? actionData.visitId
                    : typeof actionData?.appointmentId === "string"
                        ? actionData.appointmentId
                        : null;

            if (actionType === "track") {
                navigateToSOS({
                    router,
                    setEmergencyMode: setMode,
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

            if (actionType === "view_visit") {
                if (visitId) {
                    navigateToVisitDetails({ router, visitId });
                    return;
                }
                navigateToVisits({ router });
                return;
            }

            if (actionType === "view_summary") {
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
                navigateToHelpSupport({ router, ticketId: notification.actionData?.ticketId });
                return;
            }

            // For notifications without specific navigation, show details screen
            navigateToNotificationDetails({ router, notificationId: notification.id });
        },
        [router, setMode]
    );

    const handleMarkAllRead = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        markAllAsRead();
    }, [markAllAsRead]);

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    };

    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

    const hasNotifications = filteredNotifications.length > 0;
    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING;

    const state = useMemo(() => ({
        filteredNotifications,
        filter,
        filters,
        filterCounts,
        unreadCount,
        isLoading,
        isSelectMode,
        selectedNotifications,
        colors,
        backgroundColors,
        hasNotifications,
        fadeAnim,
        fadeAnimNew,
        slideAnimNew,
        topPadding,
        bottomPadding,
        filterParam,
        isDarkMode,
    }), [
        filteredNotifications,
        filter,
        filters,
        filterCounts,
        unreadCount,
        isLoading,
        isSelectMode,
        selectedNotifications,
        colors,
        backgroundColors,
        hasNotifications,
        fadeAnim,
        fadeAnimNew,
        slideAnimNew,
        topPadding,
        bottomPadding,
        filterParam,
        isDarkMode,
    ]);

    const actions = useMemo(() => ({
        setFilterType,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        toggleSelectMode,
        toggleNotificationSelection,
        selectAllNotifications,
        clearSelection,
        markSelectedAsRead,
        deleteSelectedNotifications,
        handleScroll,
        handleNotificationPress,
        handleMarkAllRead,
        resetTabBar,
        resetHeader,
        setHeaderState,
    }), [
        setFilterType,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
        toggleSelectMode,
        toggleNotificationSelection,
        selectAllNotifications,
        clearSelection,
        markSelectedAsRead,
        deleteSelectedNotifications,
        handleScroll,
        handleNotificationPress,
        handleMarkAllRead,
        resetTabBar,
        resetHeader,
        setHeaderState,
    ]);

    return {
        state,
        actions,
    };
};
