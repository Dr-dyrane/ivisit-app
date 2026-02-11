// components/register/EmailInputUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export const EmailInputContainer = ({
    email,
    isValid,
    colors,
    shakeAnim,
    inputRef,
    onChangeText,
    onClear,
    onSubmitEditing
}) => (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg }]}>
            <Ionicons
                name="mail-outline"
                size={24}
                color={COLORS.textMuted}
                style={{ marginRight: 12 }}
            />

            <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                value={email}
                onChangeText={onChangeText}
                selectionColor={COLORS.brandPrimary}
                returnKeyType="done"
                onSubmitEditing={onSubmitEditing}
            />

            {email.length > 0 && (
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

export const ContinueButton = ({ isValid, onPress, buttonScale, isDarkMode }) => (
    <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            disabled={!isValid}
            style={[
                styles.button,
                {
                    backgroundColor: isValid
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
                    { color: isValid ? COLORS.bgLight : COLORS.textMuted }
                ]}
            >
                CONTINUE
            </Text>
        </Pressable>
    </Animated.View>
);

export const EmailErrorText = ({ isValid, email }) => {
    if (email.length > 0 && !isValid) {
        return (
            <Text style={styles.errorText}>
                Please enter a valid email address
            </Text>
        );
    }
    return null;
};

export const EmailHelperText = () => (
    <Text style={styles.helperText}>
        We'll use your email for appointment confirmations and important health
        notifications.
    </Text>
);

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 20,
        height: 72,
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
