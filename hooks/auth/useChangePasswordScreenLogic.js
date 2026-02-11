import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../contexts/AuthContext";
import { useChangePassword } from "./useChangePassword";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import { Ionicons } from "@expo/vector-icons";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import React from "react";

export const useChangePasswordScreenLogic = () => {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { syncUserData, user } = useAuth();
    const { changePassword, isLoading: isSaving } = useChangePassword();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const backButton = useCallback(() => <HeaderBackButton />, []);

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

    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const shake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const isValid =
        currentPassword.length > 0 &&
        newPassword.length >= 6 &&
        newPassword === confirmPassword;

    const handleSubmit = useCallback(async () => {
        if (isSaving) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!isValid) {
            setError("Check your inputs. New password must match and be 6+ chars.");
            shake();
            return;
        }

        setError(null);
        try {
            await changePassword({ currentPassword, newPassword });
            await syncUserData();
            router.back();
        } catch (e) {
            const msg = e?.message?.split("|")?.[1] || e?.message || "Unable to change password";
            setError(msg);
            shake();
        }
    }, [isSaving, isValid, changePassword, currentPassword, newPassword, syncUserData, router, shake]);

    const backgroundColors = useMemo(
        () =>
            isDarkMode
                ? ["#121826", "#0B0F1A", "#121826"]
                : ["#FFFFFF", "#F3E7E7", "#FFFFFF"],
        [isDarkMode]
    );

    const colors = useMemo(
        () => ({
            text: isDarkMode ? "#FFFFFF" : "#0F172A",
            textMuted: isDarkMode ? "#94A3B8" : "#64748B",
            card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
            inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
        }),
        [isDarkMode]
    );

    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING;

    const state = useMemo(() => ({
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
    }), [
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
    ]);

    const actions = useMemo(() => ({
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
    }), [
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
    ]);

    return {
        state,
        actions,
    };
};
