/**
 * hooks/auth/useLoginScreenLogic.js
 * 
 * Logic hook for LoginScreen.
 * Handles animations, navigation, and interactions with LoginContext.
 * 
 * @module useLoginScreenLogic
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Animated, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../contexts/ThemeContext";
import { useLogin } from "../../contexts/LoginContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { STACK_TOP_PADDING } from "../../constants/layout";

export function useLoginScreenLogic() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { resetHeader } = useScrollAwareHeader();
    const { resetLoginFlow } = useLogin();
    const insets = useSafeAreaInsets();
    
    const [modalVisible, setModalVisible] = useState(false);
    
    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Trigger animations on mount
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

    const openLoginModal = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setModalVisible(true);
    }, []);

    const handleSwitchToSignUp = useCallback((contactType) => {
        // Navigate to signup screen with the contact type preference
        router.push({
            pathname: "signup",
            params: contactType ? { initialMethod: contactType } : {},
        });
    }, [router]);

    const handleLinkPress = useCallback((url) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(url);
    }, []);

    // Initialization action for focus effect
    const init = useCallback(() => {
        resetLoginFlow();
    }, [resetLoginFlow]);

    const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

    const colors = useMemo(() => ({
        background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
        text: isDarkMode ? "#FFFFFF" : "#1F2937",
        subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
        divider: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    }), [isDarkMode]);

    const actions = useMemo(() => ({
        setModalVisible,
        openLoginModal,
        handleSwitchToSignUp,
        handleLinkPress,
        setHeaderState,
        resetHeader,
        init,
    }), [setModalVisible, openLoginModal, handleSwitchToSignUp, handleLinkPress, setHeaderState, resetHeader, init]);

    const state = useMemo(() => ({
        modalVisible,
        topPadding,
        colors,
        isDarkMode,
    }), [modalVisible, topPadding, colors, isDarkMode]);

    const animations = useMemo(() => ({
        fadeAnim,
        slideAnim,
    }), [fadeAnim, slideAnim]);

    return {
        state,
        animations,
        actions,
    };
}
