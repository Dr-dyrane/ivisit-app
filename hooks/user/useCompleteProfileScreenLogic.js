import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile } from "../../hooks/user/useUpdateProfile";
import { useProfileCompletion } from "../../hooks/auth";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";

export function useCompleteProfileScreenLogic() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { user, syncUserData, logout } = useAuth();
    const { updateProfile, isLoading: isSaving } = useUpdateProfile();
    const { getDraft, saveDraft, clearDraft } = useProfileCompletion();

    // --- State
    const initialFullName = useMemo(() => {
        if (typeof user?.fullName === "string" && user.fullName.trim().length > 0) {
            return user.fullName;
        }
        return [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    }, [user]);

    const [fullName, setFullName] = useState(initialFullName ?? "");
    const [username, setUsername] = useState(user?.username ?? "");

    // --- Animations
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

    // --- Effects
    useEffect(() => {
        syncUserData();
    }, [syncUserData]);

    // Load draft
    useEffect(() => {
        let isActive = true;
        (async () => {
            const draft = await getDraft();
            if (!isActive || !draft) return;
            if (typeof draft.fullName === "string" && fullName.trim().length === 0) {
                setFullName(draft.fullName);
            }
            if (typeof draft.username === "string" && username.trim().length === 0) {
                setUsername(draft.username);
            }
        })();
        return () => {
            isActive = false;
        };
    }, []); // Run once on mount

    // Auto-save draft
    useEffect(() => {
        const timer = setTimeout(() => {
            saveDraft({ fullName, username });
        }, 300);
        return () => clearTimeout(timer);
    }, [fullName, username, saveDraft]);

    // --- Helpers
    const normalizedUsername = useMemo(() => {
        const v = typeof username === "string" ? username : "";
        return v.trim().replace(/\s+/g, "_").toLowerCase();
    }, [username]);

    const canSave =
        typeof fullName === "string" &&
        fullName.trim().length >= 2 &&
        typeof normalizedUsername === "string" &&
        normalizedUsername.length >= 3;

    const splitName = useCallback((name) => {
        const parts = String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (parts.length === 0) return { firstName: null, lastName: null };
        if (parts.length === 1) return { firstName: parts[0], lastName: null };
        return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
    }, []);

    // --- Handlers
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const handleSave = useCallback(async () => {
        if (!canSave || isSaving) return;
        try {
            const { firstName, lastName } = splitName(fullName);
            await updateProfile({
                fullName: fullName.trim(),
                username: normalizedUsername,
                firstName,
                lastName,
            });
            await syncUserData();
            await clearDraft();
            router.replace("/(user)/(tabs)");
        } catch (error) {
            console.error("Update profile failed", error);
        }
    }, [canSave, fullName, isSaving, normalizedUsername, router, splitName, syncUserData, updateProfile, clearDraft]);

    const handleSignOut = useCallback(async () => {
        await logout();
        router.replace("/(auth)");
    }, [logout, router]);

    // --- Derived UI Props
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
        }),
        [isDarkMode]
    );

    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING;

    const state = useMemo(() => ({
        fullName,
        username,
        normalizedUsername,
        user,
        isSaving,
        canSave,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        topPadding,
        bottomPadding,
    }), [
        fullName,
        username,
        normalizedUsername,
        user,
        isSaving,
        canSave,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        topPadding,
        bottomPadding,
    ]);

    const actions = useMemo(() => ({
        setFullName,
        setUsername,
        handleSave,
        handleSignOut,
        handleScroll,
        resetTabBar,
        resetHeader,
        setHeaderState,
    }), [
        setFullName,
        setUsername,
        handleSave,
        handleSignOut,
        handleScroll,
        resetTabBar,
        resetHeader,
        setHeaderState,
    ]);

    return { state, actions };
}
