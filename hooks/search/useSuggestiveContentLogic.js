import { useState, useRef, useMemo } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useSearch } from "../../contexts/SearchContext";
import { discoveryService } from "../../services/discoveryService";
import { COLORS } from "../../constants/colors";

export const useSuggestiveContentLogic = (onSelectQuery) => {
    const { isDarkMode } = useTheme();
    const { visits } = useVisits();
    const { trendingSearches, trendingLoading, healthNews, healthNewsLoading } = useSearch();
    const [activeTab, setActiveTab] = useState("quick-actions");
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const colors = useMemo(() => ({
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        tabActive: COLORS.brandPrimary,
        tabInactive: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        activeGlow: COLORS.brandPrimary + (isDarkMode ? "25" : "15"),
    }), [isDarkMode]);

    const handleTabChange = (tabId) => {
        if (activeTab === tabId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(tabId);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleItemSelect = (query, meta) => {
        Haptics.selectionAsync();
        
        // Updated tracking to match guide
        discoveryService.trackSearchSelection({
            query,
            source: activeTab === 'trending' ? 'trending_tab' : 'suggestive',
            resultType: activeTab === 'trending' ? 'trending_search' : (meta?.isEmergency ? 'emergency' : 'quick_action'),
            resultId: meta?.id || query,
        });

        onSelectQuery(query);
    };

    const tabs = [
        { id: "quick-actions", label: "Quick Actions", icon: "flash" },
        { id: "specialties", label: "Specialties", icon: "medical" },
        { id: "trending", label: "Trending", icon: "trending-up" },
        { id: "health-news", label: "Health News", icon: "newspaper" },
    ];

    // Quick Actions for life-saving scenarios
    const quickActionItems = useMemo(() => {
        const items = [];
        
        // Emergency - Always first
        items.push({
            id: "emergency",
            title: "Emergency SOS",
            subtitle: "Get immediate help",
            icon: "alert-circle",
            color: "#EF4444",
            query: "emergency",
            isEmergency: true
        });

        // Last hospital visit if exists
        if (visits && visits.length > 0) {
            const lastVisit = visits[0];
            items.push({
                id: `v-${lastVisit.id}`,
                title: lastVisit.hospital || "Last Visit",
                subtitle: "Book again",
                icon: "location",
                color: COLORS.brandPrimary,
                query: lastVisit.hospital
            });
        }

        // Common urgent needs
        items.push({
            id: "pharmacy",
            title: "24/7 Pharmacy",
            subtitle: "Find nearby pharmacies",
            icon: "medical",
            color: "#10B981",
            query: "pharmacy"
        });

        items.push({
            id: "hospital",
            title: "Hospitals Near Me",
            subtitle: "Find nearest hospitals",
            icon: "business",
            color: "#3B82F6",
            query: "hospital"
        });

        return items;
    }, [visits]);

    return {
        state: {
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
        },
        actions: {
            handleTabChange,
            handleItemSelect,
        }
    };
};
