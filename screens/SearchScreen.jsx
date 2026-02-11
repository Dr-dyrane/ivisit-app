"use client";

import { Animated, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Logic Hook
import { useSearchLogic } from "../hooks/search/useSearchLogic";

// Components
import EmergencySearchBar from "../components/emergency/EmergencySearchBar";
import SpecialtySelector from "../components/emergency/SpecialtySelector";
import SuggestiveContent from "../components/search/SuggestiveContent";
import SearchResultsList from "../components/search/SearchResultsList";
import RecentSearchesList from "../components/search/RecentSearchesList";

// Constants
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";

export default function SearchScreen() {
    const { state, animations, actions } = useSearchLogic();
    const { 
        query, 
        mode, 
        specialties, 
        selectedSpecialty, 
        rankedResults, 
        isBedQuery, 
        recentQueries, 
        specialtyCounts,
        isDarkMode 
    } = state;

    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

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
                onScroll={actions.handleScroll}
                keyboardShouldPersistTaps="handled"
                style={{
                    opacity: animations.fadeAnim,
                    transform: [{ translateY: animations.slideAnim }],
                }}
            >
                {/* Search Bar Section */}
                <Animated.View style={styles.section}>
                    <EmergencySearchBar
                        value={query}
                        onChangeText={actions.setSearchQuery}
                        onBlur={() => actions.commitQuery(query)}
                        onClear={() => actions.setSearchQuery("")}
                        placeholder="Search hospitals, doctors, specialties..."
                        showSuggestions={false}
                    />
                </Animated.View>

                {/* Specialty Selector */}
                <Animated.View style={styles.section}>
                    {(mode === "booking" || isBedQuery) && Array.isArray(specialties) && specialties.length > 0 ? (
                        <SpecialtySelector
                            specialties={specialties}
                            selectedSpecialty={selectedSpecialty}
                            onSelect={actions.handleSpecialtySelect}
                            counts={specialtyCounts}
                        />
                    ) : null}
                </Animated.View>

                {!query ? (
                    <View style={{ paddingHorizontal: 12 }}>
                        <SuggestiveContent
                            onSelectQuery={(q) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                actions.setSearchQuery(q);
                            }}
                        />
                    </View>
                ) : (
                    <Animated.View style={styles.section}>
                        <SearchResultsList 
                            results={rankedResults} 
                            query={query}
                            onResultPress={actions.commitQuery}
                        />
                    </Animated.View>
                )}

                {/* Recent Searches */}
                <Animated.View style={styles.section}>
                    <RecentSearchesList 
                        queries={recentQueries} 
                        onSelectQuery={actions.setSearchQuery} 
                    />
                </Animated.View>
            </Animated.ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
});
