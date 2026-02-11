import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useResetPassword } from "./useResetPassword";
import { useToast } from "../../contexts/ToastContext";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

export function useResetPasswordCardLogic({ email, onPasswordReset }) {
    const { isDarkMode } = useTheme();
    const { showToast } = useToast();
    const { resetPassword, loading } = useResetPassword();

    const tokenInputRef = useRef(null);
    const passwordInputRef = useRef(null);

    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const isValid = resetToken.length === 6 && newPassword.length >= 6;

    const triggerShake = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: -10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 10,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, [shakeAnim]);

    const handleSubmit = useCallback(async () => {
        if (!isValid) {
            triggerShake();
            setError("Please enter a valid 6-digit code and password");
            return;
        }

        setError(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const result = await resetPassword(resetToken, newPassword, email);

        if (result.success) {
            showToast("Password reset successfully", "success");
            onPasswordReset?.();
        } else {
            setError(result.error);
            showToast(result.error, "error");
            triggerShake();
        }
    }, [isValid, resetToken, newPassword, email, resetPassword, onPasswordReset, showToast, triggerShake]);

    const handleTokenChange = useCallback((text) => {
        setResetToken(text.slice(0, 6));
        if (error) setError(null);
    }, [error]);

    const handlePasswordChange = useCallback((text) => {
        setNewPassword(text);
        if (error) setError(null);
    }, [error]);

    const toggleShowPassword = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPassword((prev) => !prev);
    }, []);

    const handlePressIn = useCallback(() => {
        Animated.spring(buttonScale, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    }, [buttonScale]);

    const handlePressOut = useCallback(() => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    }, [buttonScale]);

    const colors = {
        inputBg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
        text: isDarkMode ? COLORS.bgLight : COLORS.textPrimary,
        mockBg: isDarkMode ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)",
        mockBorder: isDarkMode ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.2)",
        mockLabel: isDarkMode ? "#86efac" : "#166534",
        mockValue: isDarkMode ? "#4ade80" : "#15803d",
        buttonBg: isValid && !loading ? COLORS.brandPrimary : (isDarkMode ? COLORS.bgDarkAlt : "#E5E7EB"),
        buttonText: isValid && !loading ? COLORS.bgLight : COLORS.textMuted,
    };

    return {
        state: {
            resetToken,
            newPassword,
            showPassword,
            error,
            isValid,
            loading,
            colors,
        },
        refs: {
            tokenInputRef,
            passwordInputRef,
            shakeAnim,
            buttonScale,
        },
        actions: {
            handleTokenChange,
            handlePasswordChange,
            handleSubmit,
            toggleShowPassword,
            handlePressIn,
            handlePressOut,
        },
    };
}
