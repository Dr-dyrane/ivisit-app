/**
 * hooks/auth/useSmartContactInput.js
 * 
 * Logic hook for SmartContactInput component.
 * Handles input detection (email vs phone), animations, and validation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Animated, Keyboard } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import usePhoneValidation from "../../hooks/validators/usePhoneValidation";
import useCountryDetection from "../../hooks/validators/useCountryDetection";

export function useSmartContactInput({ initialValue, onSubmit }) {
    const { isDarkMode } = useTheme();
    const inputRef = useRef(null);
    const [rawText, setRawText] = useState(initialValue || "");
    const [contactType, setContactType] = useState(null); // 'email' | 'phone'
    const [pickerVisible, setPickerVisible] = useState(false);
    const [countryError, setCountryError] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // --- Hooks ---
    const {
        country,
        setCountry,
        loading: countryLoading,
    } = useCountryDetection();

    const {
        setRawInput,
        formattedNumber,
        isValid: isPhoneValid,
        e164Format,
        setFromE164,
        clear: clearPhone,
    } = usePhoneValidation(country);

    // --- Animations ---
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const iconOpacity = useRef(new Animated.Value(1)).current;

    // --- Helpers ---
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // --- Logic ---
    const handleContactTypeDetection = useCallback(() => {
        const trimmed = rawText.trim();
        if (!trimmed) {
            setContactType(null);
            clearPhone();
            return;
        }

        const firstChar = trimmed[0];

        // Priority 1: If it has an @, it's definitely an email
        if (trimmed.includes("@")) {
            setContactType("email");
            clearPhone();
        }
        // Priority 2: If first char is a letter, assume email (don't wait for @)
        else if (/[a-zA-Z]/.test(firstChar)) {
            setContactType("email");
            clearPhone();
        }
        // Priority 3: If first char is +, digit, or paren, it's a phone number
        else if (/[\+\d\(]/.test(firstChar)) {
            setContactType("phone");
            setRawInput(trimmed);
        } else {
            setContactType(null);
        }
    }, [rawText, clearPhone, setRawInput]);

    useEffect(() => {
        handleContactTypeDetection();
    }, [handleContactTypeDetection]);

    // Icon transition animation
    useEffect(() => {
        const animation = Animated.sequence([
            Animated.timing(iconOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.timing(iconOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]);
        
        animation.start();
        return () => animation.stop();
    }, [contactType, iconOpacity]);

    const handleTextChange = useCallback((text) => {
        setRawText(text);
    }, []);

    const isValid = contactType === "email" ? isValidEmail(rawText) : isPhoneValid;

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
        const finalValue = contactType === "email" ? rawText.trim() : e164Format;

        onSubmit?.(finalValue, contactType);
    }, [isValid, contactType, rawText, e164Format, onSubmit, triggerShake]);

    const handleClear = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRawText("");
        clearPhone();
        inputRef.current?.focus();
    }, [clearPhone]);

    // --- Derived Styles ---
    const colors = {
        inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        border: isFocused ? COLORS.brandPrimary : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        label: isDarkMode ? "#94A3B8" : "#64748B",
    };

    const state = useMemo(() => ({
        rawText,
        contactType,
        pickerVisible,
        countryError,
        isFocused,
        country,
        formattedNumber,
        isValid,
        colors,
        countryLoading,
    }), [
        rawText,
        contactType,
        pickerVisible,
        countryError,
        isFocused,
        country,
        formattedNumber,
        isValid,
        colors,
        countryLoading,
    ]);

    const actions = useMemo(() => ({
        setRawText,
        setPickerVisible,
        setCountryError,
        setIsFocused,
        setCountry,
        handleTextChange,
        handleContinue,
        handleClear,
    }), [
        setRawText,
        setPickerVisible,
        setCountryError,
        setIsFocused,
        setCountry,
        handleTextChange,
        handleContinue,
        handleClear,
    ]);

    const refs = useMemo(() => ({
        inputRef,
        shakeAnim,
        buttonScale,
        iconOpacity,
    }), [
        inputRef,
        shakeAnim,
        buttonScale,
        iconOpacity,
    ]);

    return {
        state,
        actions,
        refs,
    };
}
