// components/visits/VisitsList.jsx
import React from "react";
import { View, Text, ScrollView, RefreshControl, Animated, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import VisitFilters from "./VisitFilters";
import VisitCard from "./VisitCard";

export default function VisitsList({
    filteredVisits,
    selectedVisitId,
    filter,
    filters,
    visitCounts,
    isLoading,
    colors,
    isDarkMode,
    topPadding,
    bottomPadding,
    fadeAnim,
    onScroll,
    onRefresh,
    onSelectFilter,
    onSelectVisit,
    onViewDetails,
    onDeleteVisit,
}) {
    const hasVisits = Array.isArray(filteredVisits) && filteredVisits.length > 0;
    const showInitialLoadingState = isLoading && !hasVisits;

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
                styles.content,
                { paddingTop: topPadding, paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            refreshControl={
                <RefreshControl
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    tintColor={COLORS.brandPrimary}
                    colors={[COLORS.brandPrimary]}
                />
            }
        >
            {showInitialLoadingState ? (
                <View
                    style={[styles.emptyContainer, { backgroundColor: colors.card, shadowOpacity: isDarkMode ? 0 : 0.03 }]}
                >
                    <ActivityIndicator color={COLORS.brandPrimary} />
                    <Text style={[styles.loadingTitle, { color: colors.text }]}>
                        Loading visits
                    </Text>
                    <Text style={[styles.loadingSubtitle, { color: colors.textMuted }]}>
                        Syncing your upcoming appointments and history
                    </Text>
                </View>
            ) : null}

            {/* Filters */}
            <VisitFilters
                filters={filters}
                selectedFilter={filter}
                onSelect={onSelectFilter}
                counts={visitCounts}
            />

            {/* Visit Cards or Empty State */}
            {showInitialLoadingState ? null : hasVisits ? (
                <Animated.View style={{ opacity: fadeAnim }}>
                    {filteredVisits.map((visit) => (
                        visit ? (
                            <VisitCard
                                key={visit?.id ?? `${visit?.hospital ?? "visit"}_${visit?.date ?? ""}_${visit?.time ?? ""}`}
                                visit={visit}
                                isSelected={selectedVisitId === visit?.id}
                                onSelect={onSelectVisit}
                                onViewDetails={onViewDetails}
                                onDelete={onDeleteVisit}
                            />
                        ) : null
                    ))}
                </Animated.View>
            ) : (
                <View
                    style={[styles.emptyContainer, { backgroundColor: colors.card, padding: 40, shadowOpacity: isDarkMode ? 0 : 0.03 }]}
                >
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="calendar-outline" size={36} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        No Visits Yet
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        {filter === "upcoming"
                            ? "No upcoming appointments scheduled"
                            : filter === "completed"
                                ? "No completed visits yet"
                                : filter === "cancelled"
                                    ? "No cancelled visits"
                                    : "Your medical visits will appear here"}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingTop: 0,
        padding: 20,
    },
    emptyContainer: {
        borderRadius: 30,
        marginTop: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
    },
    loadingTitle: {
        marginTop: 14,
        fontSize: 16,
        fontWeight: "900",
        letterSpacing: -0.4,
    },
    loadingSubtitle: {
        marginTop: 6,
        fontSize: 13,
        fontWeight: '400',
        textAlign: "center",
        lineHeight: 18,
    },
    emptyIconContainer: {
        backgroundColor: COLORS.brandPrimary,
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 19,
        fontWeight: "900",
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    }
});
