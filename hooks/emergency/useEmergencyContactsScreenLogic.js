/**
 * hooks/emergency/useEmergencyContactsScreenLogic.js
 * 
 * Logic hook for EmergencyContactsScreen.
 * Handles view-specific state like headers, tab bars, and entrance animations.
 */

import { useCallback, useEffect, useRef } from "react";
import { Animated, Platform, UIManager } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFAB } from "../../contexts/FABContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import { useEmergencyContactsForm } from "./useEmergencyContactsForm";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export function useEmergencyContactsScreenLogic() {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFAB();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();

    // Import the form logic
    const formLogic = useEmergencyContactsForm();

    const backButton = useCallback(() => <HeaderBackButton />, []);

    // Focus Effect for Header and FAB
    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Emergency Contacts",
                subtitle: "SAFETY",
                icon: <Ionicons name="people" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: backButton(),
                rightComponent: null,
            });

            registerFAB('emergency-contacts-add', {
                icon: 'person-add',
                label: 'Add Contact',
                subText: 'Add new emergency contact',
                visible: true,
                onPress: formLogic.openCreate,
                style: 'primary',
                haptic: 'medium',
                priority: 7,
                animation: 'prominent',
                allowInStack: true,
            });

            return () => {
                unregisterFAB('emergency-contacts-add');
            };
        }, [backButton, resetHeader, resetTabBar, setHeaderState, registerFAB, unregisterFAB, formLogic.openCreate])
    );

    // Entrance Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Initial Refresh
    useEffect(() => {
        formLogic.refreshContacts();
    }, [formLogic.refreshContacts]);

    // Scroll Handler
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    // Layout Constants
    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    };

    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING;

    return {
        state: {
            ...formLogic, // Spread the form state/actions
            isDarkMode,
            colors,
            backgroundColors,
            fadeAnim,
            slideAnim,
            topPadding,
            bottomPadding,
        },
        actions: {
            handleScroll,
        },
    };
}
