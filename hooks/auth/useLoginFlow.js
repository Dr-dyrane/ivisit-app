import { useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useToast } from "../../contexts/ToastContext";
import { useLogin } from "../../contexts/LoginContext";
import { useLogin as useLoginService } from "./useLogin";
import { useAuth } from "../../contexts/AuthContext";
import { database, StorageKeys } from "../../database";
import { LOGIN_STEPS, LOGIN_AUTH_METHODS } from "../../contexts/LoginContext";

/**
 * useLoginFlow - Logic hook for Login Flow
 * Handles business logic, API interactions, and flow state.
 * Separates logic from UI orchestration.
 */
export function useLoginFlow({ onDismiss, onSwitchToSignUp }) {
    // --- Contexts ---
    const { showToast } = useToast();
    const { syncUserData, login: authLogin } = useAuth();
    
    const {
        loginData,
        updateLoginData,
        nextStep,
        goToStep,
        setLoginError,
        clearError,
        startLoading,
        stopLoading,
    } = useLogin();

    // --- Local State ---
    const [resetEmail, setResetEmail] = useState(null);
    const [resetToken, setResetToken] = useState(null);
    const [mockOtp, setMockOtp] = useState(null);
    const [showSignUpOption, setShowSignUpOption] = useState(false);

    // --- Service Hook ---
    const { loginWithPassword, requestOtp, verifyOtpLogin, setPassword } = useLoginService({
        startLoading,
        stopLoading,
        setError: setLoginError,
        clearError,
    });

    // --- Actions ---

    const handleSmartContactSubmit = useCallback(async (value, type) => {
        if (!value) return;

        startLoading();
        clearError();
        setShowSignUpOption(false);

        try {
            const authMethod = type === "phone" ? LOGIN_AUTH_METHODS.OTP : LOGIN_AUTH_METHODS.PASSWORD;

            updateLoginData({
                contact: value,
                contactType: type,
                [type === "email" ? "email" : "phone"]: value,
                authMethod,
            });

            if (type === "phone") {
                const otpResult = await requestOtp({ phone: value });
                if (!otpResult.success) {
                    setLoginError(otpResult.error || "Unable to send verification code");
                    showToast(otpResult.error || "Failed to send code", "error");
                    return;
                }

                if (otpResult.data?.otp) {
                    setMockOtp(otpResult.data.otp);
                }

                showToast("Verification code sent to your phone", "success");
                goToStep(LOGIN_STEPS.OTP_VERIFICATION);
            } else {
                nextStep({
                    authMethod: LOGIN_AUTH_METHODS.PASSWORD,
                    contactType: type
                });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error("useLoginFlow handleSmartContactSubmit error:", err);
            setLoginError("Unable to proceed. Please try again.");
        } finally {
            stopLoading();
        }
    }, [startLoading, clearError, updateLoginData, requestOtp, setLoginError, showToast, goToStep, nextStep, stopLoading]);

    const handleResendOtpLogin = useCallback(async (contactValue) => {
        const contact = contactValue || loginData.contact;
        if (!contact) return;

        startLoading();
        try {
            const otpResult = await requestOtp(
                loginData.contactType === "email" ? { email: contact } : { phone: contact }
            );

            if (!otpResult.success) {
                setLoginError(otpResult.error || "Unable to send verification code");
                showToast(otpResult.error || "Failed to send code", "error");
                return;
            }

            if (otpResult.data?.otp) {
                setMockOtp(otpResult.data.otp);
            } else {
                setMockOtp(null);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Verification code sent to your ${loginData.contactType}`, "success");
        } catch (err) {
            console.error("useLoginFlow handleResendOtpLogin error:", err);
            const errorMessage = err.message || "Failed to send verification code";
            setLoginError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            stopLoading();
        }
    }, [loginData.contact, loginData.contactType, startLoading, requestOtp, setLoginError, showToast, stopLoading]);

    const handleOTPSubmit = useCallback(async (otp) => {
        if (!otp || otp.length < 6) return;

        updateLoginData({ otp });

        const result = await verifyOtpLogin({
            email: loginData.email,
            phone: loginData.phone,
            otp,
        });

        if (result.success) {
            await syncUserData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Welcome back to iVisit!", "success");
            if (onDismiss) onDismiss();
        } else {
            const errorLower = result.error?.toLowerCase() || "";
            if (
                errorLower.includes("not found") ||
                errorLower.includes("user_not_found") ||
                errorLower.includes("not_found")
            ) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setLoginError(
                    "No account found with this " +
                    loginData.contactType +
                    ". Would you like to create one?"
                );
                setShowSignUpOption(true);

                await database.write(StorageKeys.PENDING_REGISTRATION, {
                    email: loginData.email,
                    phone: loginData.phone,
                    contactType: loginData.contactType,
                    verified: true,
                });
            } else {
                setLoginError(result.error || "Unable to verify code");
                showToast(result.error || "Unable to verify code", "error");
            }
        }
    }, [updateLoginData, verifyOtpLogin, loginData.email, loginData.phone, loginData.contactType, syncUserData, showToast, onDismiss, setLoginError]);

    const handlePasswordSubmit = useCallback(async (password) => {
        if (!password) return;

        updateLoginData({ password });

        try {
            const result = await loginWithPassword({
                email: loginData.email,
                phone: loginData.phone,
                password,
            });

            if (result.success) {
                await syncUserData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast("Welcome back to iVisit!", "success");
                if (onDismiss) onDismiss();
            } else {
                showToast(result.error || "Unable to sign in", "error");
            }
        } catch (err) {
            console.error("useLoginFlow handlePasswordSubmit error:", err);
            const errorMessage = err.message || "Unable to sign in. Please try again.";
            setLoginError(errorMessage);
            showToast(errorMessage, "error");
        }
    }, [setLoginError, showToast, updateLoginData, loginWithPassword, loginData.email, loginData.phone, syncUserData, onDismiss]);

    const handleSetPassword = useCallback(async (password) => {
        if (!password) return;

        startLoading();
        clearError();

        try {
            const result = await setPassword({
                email: loginData.email,
                phone: loginData.phone,
                password,
            });

            if (result.success) {
                const loginSuccess = await authLogin({
                    ...result.data.user,
                    token: result.data.token,
                });

                if (!loginSuccess) {
                    setLoginError("Password set but failed to save session");
                    showToast("Password set but login failed. Please try again.", "error");
                    stopLoading();
                    return;
                }

                await syncUserData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast("Password set successfully! Welcome to iVisit!", "success");
                if (onDismiss) onDismiss();
            } else {
                setLoginError(result.error || "Unable to set password");
                showToast(result.error || "Unable to set password", "error");
            }
        } catch (err) {
            console.error("useLoginFlow handleSetPassword error:", err);
            const errorMessage = err.message || "Unable to set password. Please try again.";
            setLoginError(errorMessage);
            showToast(errorMessage, "error");
        } finally {
            stopLoading();
        }
    }, [setLoginError, showToast, startLoading, clearError, setPassword, loginData.email, loginData.phone, authLogin, syncUserData, onDismiss, stopLoading]);

    const handleSwitchToOtpLogin = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        clearError();
        updateLoginData({ authMethod: LOGIN_AUTH_METHODS.OTP });

        const contact = loginData.contact;
        if (!contact) {
            goToStep(LOGIN_STEPS.SMART_CONTACT);
            return;
        }

        await handleResendOtpLogin(contact);
        goToStep(LOGIN_STEPS.OTP_VERIFICATION);
    }, [clearError, updateLoginData, loginData.contact, goToStep, handleResendOtpLogin]);

    const handleForgotPasswordInitiated = useCallback((email, token) => {
        setResetEmail(email);
        setResetToken(token);
        goToStep(LOGIN_STEPS.RESET_PASSWORD);
    }, [goToStep]);

    const handlePasswordReset = useCallback(() => {
        showToast("Password reset successfully", "success");
        setResetEmail(null);
        setResetToken(null);
        goToStep(LOGIN_STEPS.PASSWORD_INPUT);
    }, [showToast, goToStep]);

    return {
        // State
        mockOtp,
        resetEmail,
        resetToken,
        showSignUpOption,
        setShowSignUpOption, // Exported if parent needs to reset it
        
        // Actions
        handleSmartContactSubmit,
        handleResendOtpLogin,
        handleOTPSubmit,
        handlePasswordSubmit,
        handleSetPassword,
        handleSwitchToOtpLogin,
        handleForgotPasswordInitiated,
        handlePasswordReset,
    };
}
