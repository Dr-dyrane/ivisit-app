// components/auth/SmartContactInputUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

export const LoadingState = () => (
    <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.brandPrimary} />
    </View>
);

export const ErrorState = ({ onRetry }) => (
    <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Country detection failed. Please check your connection.</Text>
        <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
        </Pressable>
    </View>
);

export const InputIcon = ({ contactType, country, iconOpacity, onFlagPress, colors }) => (
    <Animated.View style={[styles.iconContainer, { opacity: iconOpacity }]}>
        {contactType === "email" ? (
            <View style={styles.iconWrapper}>
                <Ionicons name="mail" size={24} color={COLORS.brandPrimary} />
            </View>
        ) : contactType === "phone" ? (
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onFlagPress();
                }}
                style={[styles.flagButton, { borderRightColor: colors.border }]}
            >
                <Text style={styles.flagText}>{country.flag}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.label} />
            </Pressable>
        ) : (
            <View style={styles.iconWrapper}>
                <Ionicons name="person" size={24} color={colors.label} />
            </View>
        )}
    </Animated.View>
);

export const ContactInputField = ({
    inputRef,
    value,
    onChangeText,
    onSubmitEditing,
    onFocus,
    onBlur,
    placeholder,
    colors
}) => (
    <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.label}
        keyboardType="default"
        autoFocus
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={COLORS.brandPrimary}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        blurOnSubmit={false}
        onFocus={onFocus}
        onBlur={onBlur}
    />
);

export const ValidationIcon = ({ isValid, onClear, colors }) => (
    <Pressable onPress={onClear} hitSlop={10}>
        <Ionicons
            name={isValid ? "checkmark-circle" : "close-circle"}
            size={24}
            color={isValid ? COLORS.success : colors.label}
        />
    </Pressable>
);

export const ContinueButton = ({
    onPress,
    isValid,
    isSubmitting,
    buttonScale,
    colors
}) => (
    <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            disabled={!isValid || isSubmitting}
            style={[
                styles.button,
                {
                    backgroundColor: isValid && !isSubmitting ? COLORS.brandPrimary : "#E5E7EB",
                    shadowOpacity: isValid ? 0.3 : 0,
                    shadowColor: COLORS.brandPrimary,
                }
            ]}
        >
            {isSubmitting ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={[styles.buttonText, { color: isValid ? "#FFFFFF" : colors.label }]}>
                    CONTINUE
                </Text>
            )}
        </Pressable>
    </Animated.View>
);

export const FooterNote = ({ contactType, countryName, colors }) => (
    <Text style={[styles.footerText, { color: colors.label }]}>
        {contactType === "phone" || !contactType
            ? `Using ${countryName} phone for secure access.`
            : "Verification codes will be sent to your email."}
    </Text>
);

const styles = StyleSheet.create({
    centerContainer: {
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: { color: '#EF4444', textAlign: 'center' },
    retryButton: { marginTop: 8 },
    retryText: { color: '#3B82F6' },
    iconContainer: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: 48, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    flagButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 16,
        marginRight: 8,
        borderRightWidth: 1,
    },
    flagText: { fontSize: 24, marginRight: 4 },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
    },
    buttonContainer: { marginTop: 32 },
    button: {
        height: 64,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 15,
        elevation: 5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    footerText: {
        marginTop: 24,
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 20,
    }
});
