// components/register/OTPInputUI.jsx
import React from "react";
import { View, Text, TextInput, Pressable, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export const OTPHeader = ({ contact, method, colors }) => (
    <>
        <Text style={[styles.instructionText, { color: COLORS.textMuted }]}>
            We sent a verification code to{" "}
            <Text style={[styles.contactText, { color: colors.text }]}>
                {contact}
            </Text>
        </Text>
        <Text style={[styles.subInstruction, { color: COLORS.textMuted }]}>
            Enter the 6-digit code we sent to verify your{" "}
            {method === "phone" ? "phone number" : "email address"}.
        </Text>
    </>
);

export const OTPFields = ({ otp, inputRefs, shakeAnim, onChange, onKeyPress, colors }) => (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
                <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                        styles.otpInput,
                        {
                            backgroundColor: colors.inputBg,
                            color: colors.text,
                            borderColor: digit ? COLORS.brandPrimary : colors.border,
                        }
                    ]}
                    value={digit}
                    onChangeText={(value) => onChange(value, index)}
                    onKeyPress={(e) => onKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                    selectionColor={COLORS.brandPrimary}
                />
            ))}
        </View>
    </Animated.View>
);

export const ResendTimer = ({ canResend, timer, onResend }) => (
    <View style={styles.resendContainer}>
        {!canResend ? (
            <Text style={[styles.timerText, { color: COLORS.textMuted }]}>
                Resend code in{" "}
                <Text style={{ color: COLORS.brandPrimary, fontWeight: '900' }}>
                    {timer}s
                </Text>
            </Text>
        ) : (
            <Pressable onPress={onResend} style={styles.resendButton}>
                <Ionicons
                    name="refresh"
                    size={16}
                    color={COLORS.brandPrimary}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.resendText, { color: COLORS.brandPrimary }]}>
                    Resend Code
                </Text>
            </Pressable>
        )}
    </View>
);

export const VerifyButton = ({ isComplete, loading, onPress, buttonScale, isDarkMode }) => (
    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            disabled={!isComplete || loading}
            style={[
                styles.verifyButton,
                {
                    backgroundColor: isComplete && !loading
                        ? COLORS.brandPrimary
                        : isDarkMode
                            ? COLORS.bgDarkAlt
                            : "#E5E7EB",
                }
            ]}
        >
            <Text
                style={[
                    styles.verifyButtonText,
                    { color: isComplete && !loading ? COLORS.bgLight : COLORS.textMuted }
                ]}
            >
                {loading ? "VERIFYING..." : "VERIFY"}
            </Text>
        </Pressable>
    </Animated.View>
);

const styles = StyleSheet.create({
    instructionText: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
    },
    contactText: {
        fontWeight: '900',
    },
    subInstruction: {
        marginTop: 4,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    otpInput: {
        width: 48,
        height: 64,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '900',
        borderRadius: 16,
        borderWidth: 2,
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '500',
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        fontWeight: '900',
    },
    verifyButton: {
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
