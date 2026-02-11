// components/register/PasswordInputUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export const PasswordInputContainer = ({
    password,
    showPassword,
    colors,
    shakeAnim,
    inputRef,
    onChangeText,
    onToggleVisibility,
    onSubmitEditing,
    onFocus,
    onBlur,
    isDarkMode
}) => (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View
            style={[
                styles.inputContainer,
                {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    shadowOpacity: isDarkMode ? 0.2 : 0.05,
                }
            ]}
        >
            <Ionicons
                name="lock-closed-outline"
                size={24}
                color={COLORS.textMuted}
                style={{ marginRight: 12 }}
            />

            <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                value={password}
                onChangeText={onChangeText}
                selectionColor={COLORS.brandPrimary}
                returnKeyType="done"
                onSubmitEditing={onSubmitEditing}
                onFocus={onFocus}
                onBlur={onBlur}
            />

            <Pressable
                onPress={onToggleVisibility}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={24}
                    color={COLORS.textMuted}
                />
            </Pressable>
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
                    backgroundColor:
                        isValid && !loading
                            ? COLORS.brandPrimary
                            : isDarkMode
                                ? COLORS.bgDarkAlt
                                : "#E5E7EB",
                }
            ]}
        >
            <Text
                style={[
                    styles.buttonText,
                    {
                        color: isValid && !loading ? COLORS.bgLight : COLORS.textMuted,
                    }
                ]}
            >
                {loading ? "SIGNING IN..." : "CONTINUE"}
            </Text>
        </Pressable>
    </Animated.View>
);

export const ActionLinks = ({
    showForgotPassword,
    onForgotPassword,
    showOtpOption,
    onOtpPress,
    showSkipOption,
    onSkip,
    onSkipPress
}) => (
    <>
        {showForgotPassword && onForgotPassword && (
            <Pressable onPress={onForgotPassword} style={styles.linkButton}>
                <Text style={styles.linkTextPrimary}>
                    Forgot Password?
                </Text>
            </Pressable>
        )}

        {showOtpOption && onOtpPress && (
            <Pressable onPress={onOtpPress} style={styles.linkButtonSmall}>
                <Text style={styles.linkTextPrimary}>
                    Sign in with a login code instead
                </Text>
            </Pressable>
        )}

        {showSkipOption && onSkip && (
            <Pressable onPress={onSkipPress} style={styles.linkButton}>
                <Text style={styles.linkTextMuted}>
                    Skip for now
                </Text>
            </Pressable>
        )}
    </>
);

export const PasswordErrorText = ({ isValid, password }) => {
    if (password.length > 0 && !isValid) {
        return (
            <Text style={styles.errorText}>
                Password must be at least 6 characters
            </Text>
        );
    }
    return null;
};

export const PasswordHelperText = ({ showForgotPassword }) => {
    if (!showForgotPassword) {
        return (
            <Text style={styles.helperText}>
                Create a strong password to protect your account and medical
                information.
            </Text>
        );
    }
    return null;
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 24,
        height: 80,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
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
    linkButton: {
        marginTop: 16,
        paddingVertical: 12,
    },
    linkButtonSmall: {
        marginTop: 8,
        paddingVertical: 12,
    },
    linkTextPrimary: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.brandPrimary,
    },
    linkTextMuted: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textMuted,
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
