"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Pressable,
    Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// Contexts
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSearch } from "../contexts/SearchContext";
// PULLBACK NOTE: Phase 6c — SearchScreen pilot consumer migration
// OLD: mode, setMode, selectedSpecialty, selectSpecialty read from useEmergency() (EmergencyContext)
// NEW: read directly from useModeStore — surgical subscription, no context re-render blast
// allHospitals, specialties remain on useEmergency() — server state, separate migration
import { useEmergency, EmergencyMode } from "../contexts/EmergencyContext";
import { useModeStore } from "../stores/modeStore";

// Hooks
import { useSearchRanking } from "../hooks/search/useSearchRanking";

// Components
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import EmergencySearchBar from "../components/emergency/EmergencySearchBar";
import SpecialtySelector from "../components/emergency/SpecialtySelector";
import SettingsIconButton from "../components/headers/SettingsIconButton";
import ActionWrapper from "../components/headers/ActionWrapper";
import SuggestiveContent from "../components/search/SuggestiveContent";

// Constants
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";

export default function SearchScreen() {
    // --- Context & State ---
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { allHospitals, specialties } = useEmergency();
    const mode = useModeStore((s) => s.mode);
    const setMode = useModeStore((s) => s.setMode);
    const selectedSpecialty = useModeStore((s) => s.selectedSpecialty);
    const selectSpecialty = useModeStore((s) => s.setSelectedSpecialty);
    const { query, setSearchQuery, recentQueries, commitQuery } = useSearch();

    // --- Custom Hooks ---
    const { rankedResults, isBedQuery } = useSearchRanking();

    // --- Animations ---
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

    // --- Handlers ---
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

    // --- Computed ---
    const specialtyCounts = useMemo(() => {
        const counts = {};
        const hospitals = Array.isArray(allHospitals) ? allHospitals : [];
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
    }, [allHospitals, specialties]);

    // --- Styles & Layout ---
    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        divider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    };

    const topPadding = STACK_TOP_PADDING;

    return (
        <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
            <Animated.ScrollView
                contentContainerStyle={{
                    paddingTop: topPadding + 16,
                    paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                keyboardShouldPersistTaps="handled"
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                {/* Search Bar Section */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 16,
                        marginBottom: 24,
                    }}
                >
                    <EmergencySearchBar
                        value={query}
                        onChangeText={setSearchQuery}
                        onBlur={() => commitQuery(query)}
                        onClear={() => setSearchQuery("")}
                        placeholder="Search hospitals, doctors, specialties..."
                        showSuggestions={false}
                    />
                </Animated.View>

                {/* Specialty Selector */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 16,
                        marginBottom: 16,
                    }}
                >
                    {(mode === "booking" || isBedQuery) && Array.isArray(specialties) && specialties.length > 0 ? (
                        <SpecialtySelector
                            specialties={specialties}
                            selectedSpecialty={selectedSpecialty}
                            onSelect={handleSpecialtySelect}
                            counts={specialtyCounts}
                        />
                    ) : null}
                </Animated.View>

                {!query ? (
                    <View style={{ paddingHorizontal: 12 }}>
                        <SuggestiveContent
                            onSelectQuery={(q) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setSearchQuery(q);
                            }}
                        />
                    </View>
                ) : (
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            paddingHorizontal: 16,
                            marginBottom: 24,
                        }}
                    >
                        {/* Results Header */}
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsTitle, { color: colors.text }]}>
                                Available Providers
                            </Text>
                            <View
                                style={[
                                    styles.resultsCount,
                                    { backgroundColor: COLORS.brandPrimary + "20" },
                                ]}
                            >
                                <Text
                                    style={[styles.countText, { color: COLORS.brandPrimary }]}
                                >
                                    {rankedResults.length} FOUND
                                </Text>
                            </View>
                        </View>

                        {rankedResults.length > 0 ? (
                            <View style={{ gap: 20 }}>
                                {rankedResults.map((item) => (
                                    <Pressable
                                        key={item.key}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            commitQuery(query);
                                            item.onPress?.();
                                        }}
                                        style={({ pressed }) => [
                                            styles.providerCard,
                                            {
                                                backgroundColor: colors.cardBg,
                                                transform: [{ scale: pressed ? 0.98 : 1 }],
                                            },
                                        ]}
                                    >
                                        {/* Provider Header */}
                                        <View style={styles.providerCardHeader}>
                                            <View style={styles.providerInfo}>
                                                <View
                                                    style={[
                                                        styles.providerAvatar,
                                                        { backgroundColor: COLORS.brandPrimary + "15" },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={item.icon}
                                                        size={24}
                                                        color={COLORS.brandPrimary}
                                                    />
                                                </View>
                                                <View style={styles.providerDetails}>
                                                    <Text
                                                        style={[
                                                            styles.providerName,
                                                            { color: colors.text },
                                                        ]}
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    {item.subtitle ? (
                                                        <Text
                                                            style={[
                                                                styles.providerRole,
                                                                { color: colors.textMuted },
                                                            ]}
                                                        >
                                                            {item.subtitle}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                            <View style={styles.providerMeta}>
                                                <View
                                                    style={[
                                                        styles.metaPill,
                                                        { backgroundColor: COLORS.brandPrimary + "15" },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name="location"
                                                        size={12}
                                                        color={COLORS.brandPrimary}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.metaText,
                                                            { color: COLORS.brandPrimary },
                                                        ]}
                                                    >
                                                        NEARBY
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Service Stats */}
                                        <View style={styles.serviceStats}>
                                            <View style={styles.statItem}>
                                                <Text
                                                    style={[styles.statValue, { color: colors.text }]}
                                                >
                                                    AVAILABLE
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.statLabel,
                                                        { color: colors.textMuted },
                                                    ]}
                                                >
                                                    STATUS
                                                </Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text
                                                    style={[styles.statValue, { color: colors.text }]}
                                                >
                                                    {item.score > 100 ? "TOP" : "GOOD"}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.statLabel,
                                                        { color: colors.textMuted },
                                                    ]}
                                                >
                                                    MATCH
                                                </Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text
                                                    style={[styles.statValue, { color: colors.text }]}
                                                >
                                                    NOW
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.statLabel,
                                                        { color: colors.textMuted },
                                                    ]}
                                                >
                                                    RESPONSE
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Footer */}
                                        <View
                                            style={[
                                                styles.providerFooter,
                                                { borderTopColor: colors.divider },
                                            ]}
                                        >
                                            <Text
                                                style={[styles.actionText, { color: colors.textMuted }]}
                                            >
                                                TAP TO VIEW DETAILS AND BOOK
                                            </Text>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={colors.textMuted}
                                            />
                                        </View>

                                        {/* Corner Seal */}
                                        <View style={styles.cornerSeal}>
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={28}
                                                color={COLORS.brandPrimary}
                                            />
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View
                                style={[styles.emptyState, { backgroundColor: colors.cardBg }]}
                            >
                                <Ionicons name="search" size={48} color={colors.textMuted} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                    No providers found
                                </Text>
                                <Text
                                    style={[styles.emptySubtitle, { color: colors.textMuted }]}
                                >
                                    Try adjusting your search terms or location
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Recent Searches */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 16,
                        marginBottom: 24,
                    }}
                >
                    <View style={styles.recentHeader}>
                        <Text style={[styles.recentTitle, { color: colors.text }]}>
                            Recent Searches
                        </Text>
                        <Text style={[styles.recentSubtitle, { color: colors.textMuted }]}>
                            Your healthcare discovery history
                        </Text>
                    </View>

                    {Array.isArray(recentQueries) && recentQueries.length > 0 ? (
                        <View style={{ gap: 12 }}>
                            {recentQueries.map((item, index) => (
                                <Pressable
                                    key={item}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSearchQuery(item);
                                    }}
                                    style={({ pressed }) => [
                                        styles.recentCard,
                                        {
                                            backgroundColor: colors.cardBg,
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        },
                                    ]}
                                >
                                    <View style={styles.recentCardHeader}>
                                        <View style={styles.recentInfo}>
                                            <View
                                                style={[
                                                    styles.recentAvatar,
                                                    { backgroundColor: COLORS.brandPrimary + "15" },
                                                ]}
                                            >
                                                <Ionicons
                                                    name="time-outline"
                                                    size={16}
                                                    color={COLORS.brandPrimary}
                                                />
                                            </View>
                                            <View style={styles.recentDetails}>
                                                <Text
                                                    style={[styles.recentName, { color: colors.text }]}
                                                >
                                                    {item}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.recentRole,
                                                        { color: colors.textMuted },
                                                    ]}
                                                >
                                                    SEARCH #{recentQueries.length - index}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.recentMeta}>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={colors.textMuted}
                                            />
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View
                            style={[styles.emptyState, { backgroundColor: colors.cardBg }]}
                        >
                            <Ionicons
                                name="time-outline"
                                size={48}
                                color={colors.textMuted}
                            />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                No recent searches
                            </Text>
                            <Text
                                style={[styles.emptySubtitle, { color: colors.textMuted }]}
                            >
                                Your search history will appear here
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </Animated.ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    resultsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    resultsCount: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    providerCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        overflow: "hidden",
    },
    providerCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    providerInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    providerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    providerDetails: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    providerRole: {
        fontSize: 12,
        fontWeight: "500",
    },
    providerMeta: {
        alignItems: "flex-end",
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    metaText: {
        fontSize: 10,
        fontWeight: "700",
    },
    serviceStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "rgba(0,0,0,0.02)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    statItem: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: "600",
    },
    providerFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
    },
    actionText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    cornerSeal: {
        position: "absolute",
        top: -4,
        right: -4,
        opacity: 0.1,
    },
    emptyState: {
        padding: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        borderStyle: "dashed",
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: "center",
    },
    recentHeader: {
        marginBottom: 16,
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },
    recentSubtitle: {
        fontSize: 14,
    },
    recentCard: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    recentCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    recentInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    recentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    recentDetails: {},
    recentName: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 2,
    },
    recentRole: {
        fontSize: 10,
        fontWeight: "500",
    },
    recentMeta: {},
});
