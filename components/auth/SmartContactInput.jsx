// components/auth/SmartContactInput.jsx

import { useRef, useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Animated,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import usePhoneValidation from "../../hooks/validators/usePhoneValidation";
import useCountryDetection from "../../hooks/validators/useCountryDetection";
import CountryPickerModal from "../register/CountryPickerModal";

export default function SmartContactInput({
    onSubmit,
    initialValue = "",
    loading: isSubmitting = false,
}) {
    const { isDarkMode } = useTheme();
    const inputRef = useRef(null);
    const [rawText, setRawText] = useState(initialValue);
    const [contactType, setContactType] = useState(null); // 'email' | 'phone'
    const [pickerVisible, setPickerVisible] = useState(false);

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

    // Animations
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const iconOpacity = useRef(new Animated.Value(1)).current;

    // Simple Email Detection
    const isEmailFormat = (text) => {
        return text.includes("@");
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // [AUTH_REFACTOR] Intent-based detection: Reacts immediately to first character
    // Priority: Email (@) > Letter (Email intent) > Digit/+ (Phone intent)
    useEffect(() => {
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
    }, [rawText]);

    // [AUTH_POLISH] Smooth icon transition
    useEffect(() => {
        Animated.sequence([
            Animated.timing(iconOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.timing(iconOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
    }, [contactType]);

    const handleTextChange = (text) => {
        setRawText(text);
    };

    const isValid = contactType === "email" ? isValidEmail(rawText) : isPhoneValid;

    const triggerShake = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleContinue = () => {
        if (!isValid) {
            triggerShake();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const finalValue = contactType === "email" ? rawText.trim() : e164Format;

        // Ensure we pass the detected type clearly to the parent
        onSubmit?.(finalValue, contactType);
    };

    const handleClear = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRawText("");
        clearPhone();
        inputRef.current?.focus();
    };

    const colors = {
        // [AUTH_POLISH] Glassmorphism-inspired backgrounds
        inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        label: isDarkMode ? "#94A3B8" : "#64748B",
    };

    if (countryLoading || !country) {
        return (
            <View className="items-center justify-center h-[80px]">
                <ActivityIndicator color={COLORS.brandPrimary} />
            </View>
        );
    }

    return (
        <View>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <View
                    className="flex-row items-center rounded-3xl px-6 h-[80px]"
                    style={{
                        backgroundColor: colors.inputBg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        // Subtle depth
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDarkMode ? 0.2 : 0.05,
                        shadowRadius: 12,
                    }}
                >
                    {/* Dynamic Icon/Flag - Smoothly animated intent detection */}
                    <Animated.View className="flex-row items-center" style={{ opacity: iconOpacity }}>
                        {contactType === "email" ? (
                            <View className="w-12 items-center justify-center mr-2">
                                <Ionicons
                                    name="mail"
                                    size={24}
                                    color={COLORS.brandPrimary}
                                />
                            </View>
                        ) : contactType === "phone" ? (
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setPickerVisible(true);
                                }}
                                className="flex-row items-center pr-4 mr-2"
                                style={{ borderRightWidth: 1, borderRightColor: colors.border }}
                            >
                                <Text className="text-2xl mr-1">{country.flag}</Text>
                                <Ionicons name="chevron-down" size={14} color={colors.label} />
                            </Pressable>
                        ) : (
                            <View className="w-12 items-center justify-center mr-2">
                                <Ionicons
                                    name="person"
                                    size={24}
                                    color={colors.label}
                                />
                            </View>
                        )}
                    </Animated.View>

                    <TextInput
                        ref={inputRef}
                        className="flex-1 text-xl font-bold"
                        style={{ color: colors.text }}
                        placeholder="Email or Phone"
                        placeholderTextColor={colors.label}
                        // Always use default to avoid flicker when switching intent mid-way
                        keyboardType="default"
                        autoFocus
                        value={contactType === "phone" ? formattedNumber : rawText}
                        onChangeText={handleTextChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor={COLORS.brandPrimary}
                        onSubmitEditing={handleContinue}
                    />

                    {rawText.length > 0 && (
                        <Pressable onPress={handleClear} hitSlop={10}>
                            <Ionicons
                                name={isValid ? "checkmark-circle" : "close-circle"}
                                size={24}
                                color={isValid ? COLORS.success : colors.label}
                            />
                        </Pressable>
                    )}
                </View>
            </Animated.View>

            <CountryPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(c) => {
                    setCountry(c);
                    setPickerVisible(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
            />

            {/* Continue Button */}
            <Animated.View
                style={{ transform: [{ scale: buttonScale }] }}
                className="mt-8"
            >
                <Pressable
                    onPress={handleContinue}
                    onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
                    disabled={!isValid || isSubmitting}
                    className="h-16 rounded-3xl items-center justify-center shadow-lg"
                    style={{
                        backgroundColor: isValid && !isSubmitting
                            ? COLORS.brandPrimary
                            : isDarkMode ? "rgba(255,255,255,0.05)" : "#E5E7EB",
                        shadowColor: COLORS.brandPrimary,
                        shadowOpacity: isValid ? 0.3 : 0,
                        shadowRadius: 15,
                        shadowOffset: { width: 0, height: 8 }
                    }}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text
                            className="text-base font-black tracking-[2px]"
                            style={{ color: isValid ? "#FFFFFF" : colors.label }}
                        >
                            CONTINUE
                        </Text>
                    )}
                </Pressable>
            </Animated.View>

            <Text
                className="mt-6 text-center text-xs leading-5"
                style={{ color: colors.label }}
            >
                {contactType === "phone" || !contactType
                    ? `Using ${country.name} phone for secure access.`
                    : "Verification codes will be sent to your email."}
            </Text>
        </View>
    );
}
