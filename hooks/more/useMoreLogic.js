import { useState, useRef, useEffect, useCallback } from "react";
import { Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFAB } from "../../contexts/FABContext";
import { COLORS } from "../../constants/colors";
import { seederService } from "../../services/seederService";
import { navigateToProfile } from "../../utils/navigationHelpers";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";

import { useMoreAnimations } from "./useMoreAnimations";
import { useMoreMenu } from "./useMoreMenu";

export const useMoreLogic = () => {
    const router = useRouter();
    const { showToast } = useToast();
    const { logout, user } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const insets = useSafeAreaInsets();
    
    // Context hooks
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFAB();

    // State
    const [devModeVisible, setDevModeVisible] = useState(false);
    const [tapCount, setTapCount] = useState(0);
    const [loveNoteVisible, setLoveNoteVisible] = useState(false);
    const [heartTapCount, setHeartTapCount] = useState(0);

    // Refs
    const lastTapRef = useRef(0);
    const lastHeartTapRef = useRef(0);

    // Use Sub-Hooks
    const animations = useMoreAnimations(loveNoteVisible);
    const { healthItems, settingsItems, layout } = useMoreMenu(router, isDarkMode, insets);

    // Header & FAB Logic
    const backButton = useCallback(() => <HeaderBackButton />, []);

    useFocusEffect(
        useCallback(() => {
            registerFAB('more-screen-hide', { visible: false });
            return () => unregisterFAB('more-screen-hide');
        }, [registerFAB, unregisterFAB])
    );

    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Settings & Support",
                subtitle: "MORE",
                icon: <Ionicons name="ellipsis-horizontal" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: backButton(),
                rightComponent: null,
            });
        }, [backButton, resetTabBar, resetHeader, setHeaderState])
    );

    // Handlers
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleTabBarScroll, handleHeaderScroll]
    );

    const handleVersionTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < 1000) {
            setTapCount(prev => prev + 1);
        } else {
            setTapCount(1);
        }
        lastTapRef.current = now;

        if (tapCount + 1 === 3) {
            setDevModeVisible(prev => {
                const newState = !prev;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast(newState ? "Developer mode enabled" : "Developer mode disabled", "success");
                return newState;
            });
            setTapCount(0);
        }
    }, [tapCount, showToast]);

    const handleHeartTap = useCallback(() => {
        const now = Date.now();
        if (now - lastHeartTapRef.current < 1000) {
            setHeartTapCount(prev => prev + 1);
        } else {
            setHeartTapCount(1);
        }
        lastHeartTapRef.current = now;

        if (heartTapCount + 1 === 3) {
            setLoveNoteVisible(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setHeartTapCount(0);
        }
    }, [heartTapCount]);

    const handleLogout = useCallback(async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const result = await logout();
        if (result.success) {
            showToast(result.message, "success");
            router.replace("/(auth)");
        } else {
            showToast(result.message, "error");
        }
    }, [logout, showToast, router]);

    const handleSeedData = useCallback(async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "Seed Database",
            "This will add mock data (Visits, Notifications, FAQs) to your account. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Seed",
                    onPress: async () => {
                        try {
                            showToast("Seeding data...", "info");
                            await seederService.seedAll();
                            showToast("Data seeded successfully!", "success");
                        } catch (error) {
                            console.error(error);
                            showToast("Failed to seed data", "error");
                        }
                    },
                },
            ]
        );
    }, [showToast]);

    const openLink = useCallback(async (url) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                showToast("Cannot open this URL", "error");
            }
        } catch (error) {
            console.error("Failed to open URL:", error);
            showToast("Failed to open link", "error");
        }
    }, [showToast]);

    return {
        state: {
            user,
            isDarkMode,
            devModeVisible,
            loveNoteVisible,
        },
        animations,
        actions: {
            handleScroll,
            handleLogout,
            handleSeedData,
            handleVersionTap,
            handleHeartTap,
            setLoveNoteVisible,
            toggleTheme,
            openLink,
            navigateToProfile: () => navigateToProfile({ router }),
        },
        data: {
            healthItems,
            settingsItems,
            layout,
        },
    };
};
