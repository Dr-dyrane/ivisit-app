import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Animated, Linking, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { useHeaderState } from "../../contexts/HeaderStateContext";
import { useScrollAwareHeader } from "../../contexts/ScrollAwareHeaderContext";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";
import HeaderBackButton from "../../components/navigation/HeaderBackButton";
import SwitchAuthButton from "../../components/navigation/SwitchAuthButton";

export const useSignupScreenLogic = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { isDarkMode } = useTheme();
    const { setHeaderState } = useHeaderState();
    const { resetHeader } = useScrollAwareHeader();
    const { checkAndApplyPendingRegistration, resetRegistration, updateRegistrationData } = useRegistration();
    const insets = useSafeAreaInsets();

    const [modalVisible, setModalVisible] = useState(false);
    const [authType, setAuthType] = useState(null);

    // Animations
    const methodAnim = useRef(new Animated.Value(30)).current;
    const socialAnim = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const topPadding = STACK_TOP_PADDING + (insets?.top || 0) + 20;

    const colors = useMemo(() => ({
        background: isDarkMode ? ["#0B0F1A", "#121826"] : ["#FFFFFF", "#F3E7E7"],
        text: isDarkMode ? "#FFFFFF" : "#1F2937",
        subtitle: isDarkMode ? "#9CA3AF" : "#6B7280",
        divider: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    }), [isDarkMode]);

    const runAnimations = useCallback(() => {
        Animated.stagger(150, [
            Animated.parallel([
                Animated.spring(methodAnim, {
                    toValue: 0,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.spring(socialAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [methodAnim, opacity, socialAnim]);

    useEffect(() => {
        runAnimations();
    }, [runAnimations]);

    const init = useCallback(async () => {
        const hasPending = await checkAndApplyPendingRegistration();
        if (!hasPending) {
            resetRegistration();

            // Handle initial method hint from login screen
            const methodHint = params.initialMethod || params.preferredMethod;
            if (methodHint) {
                updateRegistrationData({ method: methodHint });
                setModalVisible(true);
            }
        } else {
            // Pending found, auto-open
            setModalVisible(true);
        }
    }, [checkAndApplyPendingRegistration, resetRegistration, params, updateRegistrationData]);

    const openAuthModal = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAuthType(null);
        setModalVisible(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setModalVisible(false);
    }, []);

    const handleLinkPress = useCallback((url) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(url);
    }, []);

    const handleLoginPress = useCallback(() => {
        router.push("login");
    }, [router]);

    const state = useMemo(() => ({
        modalVisible,
        authType,
        topPadding,
        colors,
        isDarkMode,
    }), [modalVisible, authType, topPadding, colors, isDarkMode]);

    const animations = useMemo(() => ({
        methodAnim,
        socialAnim,
        opacity,
    }), [methodAnim, socialAnim, opacity]);

    const actions = useMemo(() => ({
        init,
        resetHeader,
        setHeaderState,
        openAuthModal,
        closeAuthModal,
        handleLinkPress,
        handleLoginPress,
    }), [init, resetHeader, setHeaderState, openAuthModal, closeAuthModal, handleLinkPress, handleLoginPress]);

    return {
        state,
        animations,
        actions,
    };
};
