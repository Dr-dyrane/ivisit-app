import React from "react";
import { View, Text, Animated } from "react-native";
import { useSuggestiveContentLogic } from "../../hooks/search/useSuggestiveContentLogic";
import { styles } from "./SuggestiveContent.styles";
import SuggestiveTabs from "./SuggestiveTabs";
import QuickActionsTab from "./tabs/QuickActionsTab";
import TrendingTab from "./tabs/TrendingTab";
import HealthNewsTab from "./tabs/HealthNewsTab";
import SpecialtySelector from "../emergency/SpecialtySelector";

const SuggestiveContent = ({ onSelectQuery }) => {
    const { state, actions } = useSuggestiveContentLogic(onSelectQuery);
    const {
        activeTab,
        fadeAnim,
        colors,
        quickActionItems,
        trendingSearches,
        trendingLoading,
        healthNews,
        healthNewsLoading,
        tabs,
        isDarkMode,
    } = state;

    const { handleTabChange, handleItemSelect } = actions;

    const renderTabContent = () => {
        switch (activeTab) {
            case "quick-actions":
                return (
                    <QuickActionsTab
                        items={quickActionItems}
                        colors={colors}
                        isDarkMode={isDarkMode}
                        onItemSelect={handleItemSelect}
                    />
                );
            case "trending":
                return (
                    <TrendingTab
                        items={trendingSearches}
                        loading={trendingLoading}
                        colors={colors}
                        isDarkMode={isDarkMode}
                        onItemSelect={handleItemSelect}
                    />
                );
            case "specialties":
                return (
                    <SpecialtySelector 
                        specialties={["General Care", "Emergency", "Cardiology", "Neurology", "Oncology", "Pediatrics", "Orthopedics", "ICU", "Trauma", "Urgent Care"]}
                        selectedSpecialty={null}
                        onSelect={onSelectQuery}
                    />
                );
            case "health-news":
                return (
                    <HealthNewsTab
                        items={healthNews}
                        loading={healthNewsLoading}
                        colors={colors}
                        isDarkMode={isDarkMode}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>HEALTHCARE DISCOVERY</Text>
            </View>

            <SuggestiveTabs
                tabs={tabs}
                activeTab={activeTab}
                colors={colors}
                onTabChange={handleTabChange}
            />

            <Animated.View style={{ opacity: fadeAnim }}>
                {renderTabContent()}
            </Animated.View>
        </View>
    );
};

export default SuggestiveContent;
