import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useVisits } from "../../contexts/VisitsContext";
import { useCallback, useMemo } from "react";
import { COLORS } from "../../constants/colors";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Alert } from "react-native";

export const useVisitDetailsLogic = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const visitId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;

    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { visits, cancelVisit } = useVisits();

    const visit = useMemo(() => {
        if (!visitId || !Array.isArray(visits)) return null;
        return visits.find((v) => v?.id === visitId) ?? null;
    }, [visitId, visits]);

    const backButton = useCallback(() => <HeaderBackButton />, []);

    const handleScroll = useCallback((e) => {
        handleTabBarScroll(e);
        handleHeaderScroll(e);
    }, [handleTabBarScroll, handleHeaderScroll]);

    const textColor = isDarkMode ? COLORS.textLight : COLORS.textPrimary;
    const mutedColor = isDarkMode ? COLORS.textMutedDark : COLORS.textMuted;
    const widgetBg = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

    const statusColor = useMemo(() => {
        const s = visit?.status ?? "";
        if (s === "upcoming" || s === "in_progress") return COLORS.brandPrimary;
        if (s === "completed") return "#10B981";
        return mutedColor;
    }, [mutedColor, visit?.status]);

    const handleCallClinic = useCallback(() => {
        if (visit?.phone) Linking.openURL(`tel:${visit.phone}`);
    }, [visit?.phone]);

    const handleJoinVideo = useCallback(() => {
        if (visit?.meetingLink) Linking.openURL(visit.meetingLink);
    }, [visit?.meetingLink]);

    const handleCancelVisit = useCallback(() => {
        Alert.alert("Cancel Visit", "Are you sure?", [
            { text: "No", style: "cancel" },
            { 
                text: "Yes", 
                style: "destructive", 
                onPress: () => {
                    cancelVisit(visitId);
                    router.back();
                } 
            }
        ]);
    }, [cancelVisit, visitId, router]);

    return {
        state: {
            visit,
            visitId,
            isDarkMode,
            textColor,
            mutedColor,
            widgetBg,
            statusColor,
            COLORS,
        },
        actions: {
            handleScroll,
            resetTabBar,
            resetHeader,
            setHeaderState,
            backButton,
            handleCallClinic,
            handleJoinVideo,
            handleCancelVisit,
        }
    };
};
