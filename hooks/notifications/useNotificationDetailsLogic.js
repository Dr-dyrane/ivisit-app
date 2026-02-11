/**
 * hooks/notifications/useNotificationDetailsLogic.js
 * 
 * Logic hook for NotificationDetailsScreen.
 * Handles action routing, header state, and animations.
 */

import { useRef, useCallback, useEffect } from "react";
import { Animated } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useEmergency, EmergencyMode } from "../../contexts/EmergencyContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import {
    getNotificationIcon,
    getPriorityColor,
    getRelativeTime,
} from "../../constants/notifications";
import {
    navigateToMore,
    navigateToSOS,
    navigateToVisitDetails,
    navigateToVisits,
    navigateToHelpSupport,
} from "../../utils/navigationHelpers";

export function useNotificationDetailsLogic() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setMode } = useEmergency();
    const { notifications, markAsRead } = useNotifications();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

    const notification = notifications.find(n => n.id === id);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Animation Effect
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 40, useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Back Button Component
    const backButton = useCallback(() => <HeaderBackButton />, []);

    // Header & Read Status Effect
    useFocusEffect(
        useCallback(() => {
            if (notification && !notification.read) {
                markAsRead(notification.id);
            }
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Mission Briefing",
                subtitle: notification?.type?.toUpperCase() || "ALERT",
                icon: <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: backButton(),
                rightComponent: null,
            });
        }, [notification, markAsRead, setHeaderState, backButton, resetHeader, resetTabBar])
    );

    // Action Handler
    const handleActionPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

        if (actionType === "view_appointment" || actionType === "view_visit" || actionType === "view_summary") {
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
            navigateToMore({ router, screen: 'insurance' });
            return;
        }
    }, [notification, router, setMode]);

    const handleScroll = useCallback((e) => {
        handleTabBarScroll(e);
        handleHeaderScroll(e);
    }, [handleTabBarScroll, handleHeaderScroll]);

    // Styles & Colors
    const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
    const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
    const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
    const priorityColor = notification ? getPriorityColor(notification.priority) : COLORS.brandPrimary;
    const notificationIcon = notification ? getNotificationIcon(notification.type) : "notifications";

    return {
        state: {
            notification,
            isDarkMode,
            fadeAnim,
            slideAnim,
            textColor,
            mutedColor,
            widgetBg,
            priorityColor,
            notificationIcon,
            topPadding: STACK_TOP_PADDING,
            bottomPadding: 120,
        },
        actions: {
            handleActionPress,
            handleScroll,
            getRelativeTime, // Helper function
        }
    };
}
