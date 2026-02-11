import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSearch } from "../../contexts/SearchContext";
import { useEmergency, EmergencyMode } from "../../contexts/EmergencyContext";
import { useHospitals } from "../../hooks/emergency/useHospitals";
import { useSearchRanking } from "../../hooks/search/useSearchRanking";
import { COLORS } from "../../constants/colors";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import SettingsIconButton from "../../components/headers/SettingsIconButton";
import ActionWrapper from "../../components/headers/ActionWrapper";

/**
 * Logic hook for SearchScreen
 * Handles:
 * - Header configuration
 * - Animations
 * - Specialty counts calculation
 * - Search state management
 */
export const useSearchLogic = () => {
    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { hospitals: dbHospitals } = useHospitals();
    const { mode, setMode, specialties, selectedSpecialty, selectSpecialty } = useEmergency();
    const { query, setSearchQuery, recentQueries, commitQuery } = useSearch();
    const { rankedResults, isBedQuery } = useSearchRanking();

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
    }, []);

    // Handlers
    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const handleSpecialtySelect = useCallback(
        (s) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            selectSpecialty(s);
            if (s) {
                setMode(EmergencyMode.BOOKING);
            }
        },
        [selectSpecialty, setMode]
    );

    // Header Configuration
    useFocusEffect(
        useCallback(() => {
            resetTabBar();
            resetHeader();
            setHeaderState({
                title: "Healthcare Search",
                subtitle: "DISCOVERY",
                icon: <Ionicons name="search" size={26} color="#FFFFFF" />,
                backgroundColor: COLORS.brandPrimary,
                leftComponent: <HeaderBackButton />,
                rightComponent: (
                    <ActionWrapper>
                        <SettingsIconButton />
                    </ActionWrapper>
                ),
            });
        }, [resetHeader, resetTabBar, setHeaderState])
    );

    // Computed Data
    const specialtyCounts = useMemo(() => {
        const counts = {};
        const hospitals = Array.isArray(dbHospitals) ? dbHospitals : [];
        const list = Array.isArray(specialties) ? specialties : [];
        for (const s of list) {
            if (!s) continue;
            const c =
                hospitals.filter(
                    (h) =>
                        Array.isArray(h?.specialties) &&
                        h.specialties.some(
                            (x) =>
                                x &&
                                typeof x === "string" &&
                                x.toLowerCase() === s.toLowerCase()
                        ) &&
                        ((h?.availableBeds ?? 0) > 0)
                ).length || 0;
            counts[s] = c;
        }
        return counts;
    }, [dbHospitals, specialties]);

    return {
        state: {
            query,
            mode,
            specialties,
            selectedSpecialty,
            rankedResults,
            isBedQuery,
            recentQueries,
            specialtyCounts,
            isDarkMode,
        },
        animations: {
            fadeAnim,
            slideAnim,
        },
        actions: {
            handleScroll,
            handleSpecialtySelect,
            setSearchQuery,
            commitQuery,
        },
    };
};
