/**
 * hooks/auth/useOTPInputLogic.js
 * 
 * Logic hook for OTPInputCard component.
 * Handles timer, input management, and verification.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Keyboard } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export function useOTPInputLogic({ method, contact, onVerified, onResend, loading }) {
    const { isDarkMode } = useTheme();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const isComplete = otp.every((digit) => digit !== "");

    // Timer countdown
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    const handleOTPChange = useCallback((value, index) => {
        const digit = value.slice(-1);
        if (!/^\d*$/.test(digit)) return;

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when complete
        if (newOtp.every((d) => d !== "")) {
            const otpString = newOtp.join("");
            handleVerify(otpString);
        }
    }, [otp]);

    const handleKeyPress = useCallback((e, index) => {
        if (e.nativeEvent.key === "Backspace") {
            if (otp[index] === "" && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    }, [otp]);

    const triggerShake = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleVerify = useCallback((otpString) => {
        // If otpString is not passed (e.g. from button click), construct it
        const finalOtp = typeof otpString === 'string' ? otpString : otp.join("");

        if (loading) return; 

        if (finalOtp.length !== 6) {
            triggerShake();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onVerified?.(finalOtp);
    }, [loading, otp, onVerified, triggerShake]);

    const handleResend = useCallback(() => {
        if (!canResend || loading) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimer(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        
        if (onResend) {
            onResend();
        }
    }, [canResend, loading, onResend]);

    const colors = {
        inputBg: isDarkMode ? "rgba(22, 27, 34, 0.8)" : "rgba(243, 244, 246, 0.8)",
        text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
        border: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    };

    return {
        state: {
            otp,
            timer,
            canResend,
            isComplete,
            colors,
        },
        actions: {
            handleOTPChange,
            handleKeyPress,
            handleVerify,
            handleResend,
        },
        refs: {
            inputRefs,
            shakeAnim,
            buttonScale,
        },
    };
}
