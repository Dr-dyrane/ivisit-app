/**
 * hooks/visits/useVisitsScreenLogic.js
 * 
 * Logic hook for VisitsScreen.
 * Handles view-specific state like headers, tab bars, animations, and delete confirmations.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useFAB } from "../../contexts/FABContext";
import { useVisits } from "../../contexts/VisitsContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import ProfileAvatarButton from "../../components/headers/ProfileAvatarButton";

export function useVisitsScreenLogic() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFAB();
    const { filter: filterParam } = useLocalSearchParams();

    // Visits context
    const {
        filteredVisits = [],
        selectedVisitId = null,
        filter = "all",
        filters = [],
        visitCounts = { all: 0, upcoming: 0, completed: 0 },
        isLoading = false,
        selectVisit,
        setFilterType,
        refreshVisits,
        deleteVisit,
    } = useVisits();

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
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Header Left Component
    const leftComponent = useMemo(() => <ProfileAvatarButton />, []);

    // Focus Effect: Header & Filter Sync
    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            const nextFilter =
                typeof filterParam === "string"
                    ? filterParam
                    : Array.isArray(filterParam)
                        ? filterParam[0]
                        : null;
            if (nextFilter && ["all", "upcoming", "completed", "cancelled"].includes(nextFilter)) {
                setFilterType(nextFilter);
            }
            setHeaderState({
                title: "Your Visits",
                subtitle: "APPOINTMENTS",
                icon: <Ionicons name="calendar" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent,
                rightComponent: null,
            });
        }, [
            resetTabBar,
            resetHeader,
            setHeaderState,
            leftComponent,
            filterParam,
            setFilterType,
        ])
    );

    // Focus Effect: FAB
    useFocusEffect(
        useCallback(() => {
            registerFAB('visits-add', {
                icon: "add-outline",
                visible: true,
                onPress: () => {
                    router.push("/(user)/(stacks)/book-visit");
                },
                style: 'primary',
                haptic: 'medium',
                priority: 11,
                animation: 'subtle',
            });

            return () => {
                unregisterFAB('visits-add');
            };
        }, [registerFAB, unregisterFAB, router])
    );

    // Handlers
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleTabBarScroll, handleHeaderScroll]
    );

    const handleVisitSelect = useCallback(
        (visitId) => {
            if (!visitId) return;
            selectVisit(selectedVisitId === visitId ? null : visitId);
        },
        [selectVisit, selectedVisitId]
    );

    const handleViewDetails = useCallback((visitId) => {
        if (!visitId) return;
        router.push(`/(user)/(stacks)/visit/${visitId}`);
    }, [router]);

    const handleDeleteVisit = useCallback(async (visitId) => {
        if (!visitId) return;

        const visitToDelete = filteredVisits.find(v => v.id === visitId);
        const visitInfo = visitToDelete ? `${visitToDelete.hospital || 'Hospital'} - ${visitToDelete.type || 'Visit'}` : 'this visit';

        Alert.alert(
            "Delete Visit",
            `Are you sure you want to delete your appointment at ${visitInfo}? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteVisit(visitId);
                            if (selectedVisitId === visitId) {
                                selectVisit(null);
                            }
                        } catch (error) {
                            console.error('Failed to delete visit:', error);
                            Alert.alert("Error", "Failed to delete visit. Please try again.");
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }, [deleteVisit, selectedVisitId, selectVisit, filteredVisits]);

    // Layout
    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
    };

    const tabBarHeight = Platform.OS === "ios" ? 85 + (insets?.bottom || 0) : 70;
    const bottomPadding = tabBarHeight + 20;
    const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

    return {
        state: {
            isDarkMode,
            colors,
            backgroundColors,
            fadeAnim,
            slideAnim,
            topPadding,
            bottomPadding,
            
            // Data
            filteredVisits,
            selectedVisitId,
            filter,
            filters,
            visitCounts,
            isLoading,
        },
        actions: {
            handleScroll,
            handleVisitSelect,
            handleViewDetails,
            handleDeleteVisit,
            setFilterType,
            refreshVisits,
        }
    };
}
