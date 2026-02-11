/**
 * hooks/settings/useSettingsLogic.js
 * 
 * Logic hook for SettingsScreen.
 * Handles theme, preferences, authentication state, and animations.
 */

import { useCallback, useMemo, useRef, useEffect } from "react";
import { Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

export function useSettingsLogic() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Contexts
    const { isDarkMode, themeMode, setTheme } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { user } = useAuth();
    const { preferences, updatePreferences } = usePreferences();

    // Animations
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

    // Header Setup
    const backButton = useCallback(() => <HeaderBackButton />, []);

    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Settings",
                subtitle: "PREFERENCES",
                icon: <Ionicons name="settings" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: backButton(),
                rightComponent: null,
            });
        }, [backButton, resetHeader, resetTabBar, setHeaderState])
    );

    // Scroll Handling
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    // Preference Toggling
    const togglePreference = useCallback(
        async (key) => {
            if (!preferences) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await updatePreferences({ [key]: !preferences[key] });
        },
        [preferences, updatePreferences]
    );

    // Derived State
    const passwordRoute = useMemo(() => {
        return user?.hasPassword ? "/(user)/(stacks)/change-password" : "/(user)/(stacks)/create-password";
    }, [user?.hasPassword]);

    const backgroundColors = useMemo(() => isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
        [isDarkMode]
    );

    const colors = useMemo(() => ({
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    }), [isDarkMode]);

    const layout = useMemo(() => {
        const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
        return {
            bottomPadding: tabBarHeight + 20,
            topPadding: STACK_TOP_PADDING,
        };
    }, [insets.bottom]);

    return {
        state: {
            isDarkMode,
            preferences,
            user,
            fadeAnim,
            slideAnim,
            backgroundColors,
            colors,
            layout,
            passwordRoute,
        },
        actions: {
            handleScroll,
            togglePreference,
            router,
        },
    };
}
