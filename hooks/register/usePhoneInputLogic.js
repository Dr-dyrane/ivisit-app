/**
 * hooks/register/usePhoneInputLogic.js
 * 
 * Logic hook for PhoneInputField component.
 * Handles country detection, phone validation, and UI state.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import usePhoneValidation from "../../hooks/validators/usePhoneValidation";
import useCountryDetection from "../../hooks/validators/useCountryDetection";

export function usePhoneInputLogic({ onValidChange, onSubmit, initialValue }) {
    const { isDarkMode } = useTheme();
    const [pickerVisible, setPickerVisible] = useState(false);
    const inputRef = useRef(null);

    const {
        country,
        setCountry,
        loading: countryLoading,
    } = useCountryDetection();

    const {
        rawInput,
        setRawInput,
        formattedNumber,
        isValid,
        e164Format,
        setFromE164,
        clear,
    } = usePhoneValidation(country);

    // Animation refs
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const handleInputChange = useCallback((text) => {
        const digitsOnly = text.replace(/\D/g, "");
        setRawInput(digitsOnly);
    }, [setRawInput]);

    // Notify parent of validity changes
    useEffect(() => {
        if (!onValidChange) return;
        onValidChange(isValid ? e164Format : null);
    }, [isValid, e164Format, onValidChange]);

    // Prefill if initialValue (E.164) is provided
    useEffect(() => {
        if (initialValue) {
            setFromE164(initialValue);
        }
    }, [initialValue, setFromE164]);

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
        if (!isValid || !e164Format) {
            triggerShake();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (onSubmit) {
            onSubmit(e164Format);
        }
    }, [isValid, e164Format, onSubmit, triggerShake]);

    const colors = {
        inputBg: isDarkMode ? "#161B22" : "#F3F4F6",
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        border: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    };

    return {
        state: {
            country,
            countryLoading,
            formattedNumber,
            rawInput,
            isValid,
            pickerVisible,
            colors,
        },
        actions: {
            setPickerVisible,
            setCountry,
            clear,
            handleInputChange,
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
