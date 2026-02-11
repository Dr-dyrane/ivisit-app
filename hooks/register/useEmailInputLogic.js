/**
 * hooks/register/useEmailInputLogic.js
 * 
 * Logic hook for EmailInputField component.
 * Handles email validation, animations, and UI state.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import useEmailValidation from "../../hooks/validators/useEmailValidation";

export function useEmailInputLogic({ onValidChange, onSubmit, initialValue }) {
    const { isDarkMode } = useTheme();
    const inputRef = useRef(null);
    const { email, setEmail, isValid, clear } = useEmailValidation();

    // Animation refs
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    // Prefill email if provided
    useEffect(() => {
        if (initialValue) {
            setEmail(initialValue);
            if (onValidChange) onValidChange(initialValue);
        }
    }, [initialValue, setEmail, onValidChange]);

    const handleEmailChange = useCallback((text) => {
        setEmail(text);
        if (onValidChange) {
            onValidChange(isValid ? text.trim() : null);
        }
    }, [setEmail, onValidChange, isValid]);

    const handleClearInput = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        clear();
        if (onValidChange) {
            onValidChange(null);
        }
        inputRef.current?.focus();
    }, [clear, onValidChange]);

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
        onSubmit?.(email.trim());
    }, [isValid, email, onSubmit, triggerShake]);

    const colors = {
        inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
        text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
    };

    return {
        state: {
            email,
            isValid,
            colors,
        },
        actions: {
            handleEmailChange,
            handleClearInput,
            handleContinue,
        },
        refs: {
            inputRef,
            shakeAnim,
            buttonScale,
        },
    };
}
