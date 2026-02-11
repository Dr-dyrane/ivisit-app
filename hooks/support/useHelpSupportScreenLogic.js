/**
 * hooks/support/useHelpSupportScreenLogic.js
 * 
 * Logic hook for HelpSupportScreen.
 * Handles ticket management, FAQ expansion, and screen interactions.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Animated, Platform, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHelpSupport } from "../../contexts/HelpSupportContext";
import { useFABActions } from "../../contexts/FABContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import * as Haptics from "expo-haptics";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import { Ionicons } from "@expo/vector-icons";

export const useHelpSupportScreenLogic = () => {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { ticketId } = useLocalSearchParams();
    const { setHeaderState } = useHeaderState();
    const { registerFAB, unregisterFAB } = useFABActions();
    const { handleScroll: handleTabBarScroll, resetTabBar } = useTabBarVisibility();
    const { handleScroll: handleHeaderScroll, resetHeader } = useScrollAwareHeader();
    const { faqs, tickets, loading, submitTicket, refresh } = useHelpSupport();

    const [expandedFaq, setExpandedFaq] = useState({});
    const [expandedTicket, setExpandedTicket] = useState({});
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const backButton = useCallback(() => <HeaderBackButton />, []);

    const openCreateTicket = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsModalVisible(true);
    }, []);

    const handleScroll = useCallback(
        (event) => {
            handleTabBarScroll(event);
            handleHeaderScroll(event);
        },
        [handleHeaderScroll, handleTabBarScroll]
    );

    const handleSubmitTicket = async () => {
        if (!subject.trim() || !message.trim()) return;

        setIsSubmitting(true);
        try {
            await submitTicket({ subject: subject.trim(), message: message.trim() });
            setSubject("");
            setMessage("");
            setIsModalVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFaq = useCallback((id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedFaq((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    const toggleTicket = useCallback((id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedTicket(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    // Auto-expand ticket from notification
    useEffect(() => {
        if (ticketId && tickets.length > 0) {
            const timer = setTimeout(() => {
                setExpandedTicket(prev => ({ ...prev, [ticketId]: true }));
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [ticketId, tickets]);

    // Animations
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

    const backgroundColors = isDarkMode
        ? ["#121826", "#0B0F1A", "#121826"]
        : ["#FFFFFF", "#F8FAFC", "#FFFFFF"];

    const colors = {
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        textMuted: isDarkMode ? "#94A3B8" : "#64748B",
        card: isDarkMode ? "#1E293B" : "#FFFFFF",
        inputBg: isDarkMode ? "#0F172A" : "#F1F5F9",
        accent: COLORS.brandPrimary,
        highlight: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
    };

    const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
    const bottomPadding = tabBarHeight + 80;
    const topPadding = STACK_TOP_PADDING;

    const state = useMemo(() => ({
        faqs,
        tickets,
        loading,
        expandedFaq,
        expandedTicket,
        isModalVisible,
        subject,
        message,
        isSubmitting,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        topPadding,
        bottomPadding,
        isDarkMode,
    }), [
        faqs,
        tickets,
        loading,
        expandedFaq,
        expandedTicket,
        isModalVisible,
        subject,
        message,
        isSubmitting,
        fadeAnim,
        slideAnim,
        backgroundColors,
        colors,
        topPadding,
        bottomPadding,
        isDarkMode,
    ]);

    const actions = useMemo(() => ({
        setSubject,
        setMessage,
        setIsModalVisible,
        handleSubmitTicket,
        openCreateTicket,
        toggleFaq,
        toggleTicket,
        handleScroll,
        resetTabBar,
        resetHeader,
        setHeaderState,
        refresh,
        registerFAB,
        unregisterFAB,
        backButton,
    }), [
        setSubject,
        setMessage,
        setIsModalVisible,
        handleSubmitTicket,
        openCreateTicket,
        toggleFaq,
        toggleTicket,
        handleScroll,
        resetTabBar,
        resetHeader,
        setHeaderState,
        refresh,
        registerFAB,
        unregisterFAB,
        backButton,
    ]);

    return {
        state,
        actions,
    };
};
