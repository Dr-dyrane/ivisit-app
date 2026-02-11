// components/register/PhoneInputUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export const PhoneLoadingState = ({ colors }) => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.brandPrimary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
            Detecting your region...
        </Text>
    </View>
);

export const PhoneInputContainer = ({
    country,
    formattedNumber,
    rawInput,
    isValid,
    colors,
    shakeAnim,
    inputRef,
    onPickerOpen,
    onChangeText,
    onClear
}) => (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
            {/* Country Selector */}
            <Pressable
                onPress={() => {
                    Haptics.selectionAsync();
                    onPickerOpen();
                }}
                style={[styles.countrySelector, { borderRightColor: colors.border }]}
            >
                <Text style={styles.flagText}>{country.flag}</Text>
                <Text style={[styles.dialCode, { color: colors.text }]}>
                    {country.dial_code}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={16}
                    color={colors.text}
                    style={{ marginLeft: 4 }}
                />
            </Pressable>

            {/* Phone Input */}
            <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="000 000 0000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                autoFocus
                value={formattedNumber}
                onChangeText={onChangeText}
                maxLength={25}
                selectionColor={COLORS.brandPrimary}
            />

            {rawInput.length > 0 && (
                <Pressable
                    onPress={onClear}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={isValid ? "checkmark-circle" : "close-circle"}
                        size={24}
                        color={isValid ? COLORS.success : COLORS.error}
                    />
                </Pressable>
            )}
        </View>
    </Animated.View>
);

export const ContinueButton = ({ isValid, loading, onPress, buttonScale, isDarkMode }) => (
    <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            disabled={!isValid || loading}
            style={[
                styles.button,
                {
                    backgroundColor: isValid && !loading
                        ? COLORS.brandPrimary
                        : isDarkMode
                            ? COLORS.bgDarkAlt
                            : "#E5E7EB",
                    opacity: loading ? 0.7 : 1,
                }
            ]}
        >
            <Text
                style={[
                    styles.buttonText,
                    { color: isValid && !loading ? "#FFFFFF" : COLORS.textMuted }
                ]}
            >
                {loading ? "PROCESSING..." : "CONTINUE"}
            </Text>
        </Pressable>
    </Animated.View>
);

export const PhoneErrorText = ({ isValid, rawInput, countryName }) => {
    if (rawInput.length > 0 && !isValid) {
        return (
            <Text style={styles.errorText}>
                Please enter a valid {countryName} phone number
            </Text>
        );
    }
    return null;
};

export const PhoneHelperText = () => (
    <Text style={styles.helperText}>
        Your phone number helps us provide fast emergency response and connect
        you with medical professionals 24/7.
    </Text>
);

const styles = StyleSheet.create({
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 20,
        height: 72,
    },
    countrySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 16,
        marginRight: 16,
        borderRightWidth: 1,
    },
    flagText: {
        fontSize: 24,
        marginRight: 8,
    },
    dialCode: {
        fontSize: 18,
        fontWeight: '900',
    },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
    },
    buttonContainer: {
        marginTop: 24,
    },
    button: {
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    errorText: {
        marginTop: 12,
        fontSize: 12,
        textAlign: 'center',
        color: COLORS.error,
    },
    helperText: {
        marginTop: 16,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 20,
        color: COLORS.textMuted,
    },
});
