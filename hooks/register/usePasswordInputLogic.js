/**
 * hooks/register/usePasswordInputLogic.js
 * 
 * Logic hook for PasswordInputField component.
 * Handles password validation, visibility toggling, animations, and UI state.
 */

import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

// Helper function for password validation
const isValidPassword = (password) => {
    return password && password.length >= 6;
};

export function usePasswordInputLogic({ onSubmit, onSkip, loading }) {
    const { isDarkMode } = useTheme();
    const inputRef = useRef(null);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const isValid = isValidPassword(password);

    const handlePasswordChange = useCallback((text) => {
        setPassword(text);
    }, []);

    const togglePasswordVisibility = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPassword((prev) => !prev);
    }, []);

    const triggerShake = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleContinue = useCallback(() => {
        if (!isValid) {
            triggerShake();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onSubmit) {
            onSubmit(password);
        }
    }, [isValid, password, onSubmit, triggerShake]);

    const handleSkipPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSkip) {
            onSkip();
        }
    }, [onSkip]);

    const colors = {
        inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
        text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
        border: isFocused ? COLORS.brandPrimary : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    };

    return {
        state: {
            password,
            showPassword,
            isFocused,
            isValid,
            colors,
        },
        actions: {
            setPassword: handlePasswordChange,
            setShowPassword: togglePasswordVisibility,
            setIsFocused,
            handleContinue,
            handleSkipPress,
        },
        refs: {
            inputRef,
            shakeAnim,
            buttonScale,
        },
    };
}
