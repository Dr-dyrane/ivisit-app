import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { STACK_TOP_PADDING } from "../../constants/layout";
import { useChangePassword } from "./useChangePassword";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

export const useChangePasswordScreenLogic = () => {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { user, login } = useAuth();
    const { changePassword, isLoading: isSaving } = useChangePassword();

    // Form State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

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
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const shake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    // Layout Constants
    const backgroundColors = useMemo(
        () => (isDarkMode ? ["#121826", "#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7", "#FFFFFF"]),
        [isDarkMode]
    );

    const colors = useMemo(
        () => ({
            text: isDarkMode ? "#FFFFFF" : "#0F172A",
            textMuted: isDarkMode ? "#94A3B8" : "#64748B",
            card: isDarkMode ? "#121826" : "#FFFFFF",
            inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
        }),
        [isDarkMode]
    );

    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING;

    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const isValid = currentPassword.length >= 6 && newPassword.length >= 6 && newPassword === confirmPassword;

    const handleSubmit = useCallback(async () => {
        if (!isValid || isSaving) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);

        setError(null);
        try {
            const result = await changePassword({ currentPassword, newPassword });
            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
            } else {
                throw new Error(result.error || "Failed to update password");
            }
        } catch (e) {
            const msg = e?.message?.split("|")?.[1] || e?.message || "Verify your current password";
            setError(msg);
            shake();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [isValid, isSaving, currentPassword, newPassword, changePassword, router, shake]);

    const backButton = useCallback(() => <HeaderBackButton />, []);

    return {
        state: {
            user,
            currentPassword,
            newPassword,
            confirmPassword,
            showCurrent,
            showNew,
            showConfirm,
            error,
            isValid,
            isSaving,
            shakeAnim,
            buttonScale,
            fadeAnim,
            slideAnim,
            backgroundColors,
            colors,
            topPadding,
            bottomPadding,
        },
        actions: {
            setCurrentPassword,
            setNewPassword,
            setConfirmPassword,
            setShowCurrent,
            setShowNew,
            setShowConfirm,
            setError,
            handleSubmit,
            handleScroll,
            backButton,
            resetHeader,
            resetTabBar,
            setHeaderState,
            router,
        },
    };
};
