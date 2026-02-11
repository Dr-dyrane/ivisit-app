/**
 * hooks/emergency/useServiceRatingLogic.js
 * 
 * Logic hook for ServiceRatingModal.
 * Handles rating state, animations, and submission.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Animated, Dimensions, Keyboard, Platform } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useServiceRatingLogic({ visible, onClose, onSubmit, serviceType }) {
    const { isDarkMode } = useTheme();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
        useAndroidKeyboardAwareModal({
            defaultHeight: SCREEN_HEIGHT,
            maxHeightPercentage: 0.9
        });

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Reset and Animate In
    useEffect(() => {
        if (!visible) return;
        setRating(0);
        setComment("");
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 70,
                friction: 12,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim, visible]);

    // Animate Out and Close
    const close = useCallback(() => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => onClose?.());
    }, [fadeAnim, onClose, slideAnim]);

    const handleSubmit = useCallback(() => {
        if (rating < 1) return;
        onSubmit?.({ rating, comment: comment?.trim() || null, serviceType });
        close();
    }, [close, comment, onSubmit, rating, serviceType]);

    // Theme Colors
    const colors = useMemo(() => ({
        bg: isDarkMode ? COLORS.bgDark : COLORS.bgLight,
        text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
        subtext: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
        card: isDarkMode ? COLORS.bgDarkAlt : COLORS.bgLightAlt,
        accent: COLORS.brandPrimary,
    }), [isDarkMode]);

    // Helpers
    const getServiceIcon = () => {
        switch (serviceType) {
            case "ambulance": return "medical";
            case "bed": return "bed";
            default: return "calendar";
        }
    };

    const getServiceTypeLabel = () => {
        switch (serviceType) {
            case "ambulance": return "emergency response";
            case "bed": return "hospital stay";
            default: return "visit";
        }
    };

    const getRatingText = () => {
        switch (rating) {
            case 5: return "Excellent!";
            case 4: return "Good";
            case 3: return "Okay";
            case 2: return "Poor";
            case 1: return "Very Poor";
            default: return "";
        }
    };

    return {
        state: {
            rating,
            comment,
            modalHeight,
            keyboardHeight,
            slideAnim,
            fadeAnim,
            colors,
            isDarkMode,
            stars: [1, 2, 3, 4, 5],
        },
        actions: {
            setRating,
            setComment,
            close,
            handleSubmit,
            getKeyboardAvoidingViewProps,
            getScrollViewProps,
            getServiceIcon,
            getServiceTypeLabel,
            getRatingText,
        }
    };
}
