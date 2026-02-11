import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Keyboard } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRegistration } from "../../contexts/RegistrationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useSignupFlow } from "./useSignupFlow";
import { useAndroidKeyboardAwareModal } from "../ui/useAndroidKeyboardAwareModal";
import { REGISTRATION_STEPS } from "../../constants/registrationSteps";
import { COLORS } from "../../constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const useAuthInputModalLogic = ({ visible, onClose, type }) => {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    
    // Animations
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const bgOpacity = useRef(new Animated.Value(0)).current;

    const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
        useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });

    const {
        currentStep,
        registrationData,
        updateRegistrationData,
        previousStep,
        checkAndApplyPendingRegistration,
        resetRegistration,
        error,
        clearError,
        isLoading: loading,
    } = useRegistration();

    // Handlers
    const handleDismiss = () => {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(bgOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            resetRegistration();
            clearError();
            onClose();
        });
    };

    const handleGoBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        clearError();
        previousStep();
    };

    // Business Logic Hook
    const signupFlow = useSignupFlow({ onDismiss: handleDismiss });

    // Effects
    useEffect(() => {
        if (visible) {
            clearError();
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 9,
                    useNativeDriver: true,
                }),
                Animated.timing(bgOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const initModal = async () => {
                const hasPending = await checkAndApplyPendingRegistration();
                if (!hasPending && currentStep === REGISTRATION_STEPS.SMART_CONTACT && type) {
                    updateRegistrationData({ method: type });
                }
            };
            initModal();
        }
    }, [visible]);

    // Computed
    const isInputStep = currentStep === REGISTRATION_STEPS.SMART_CONTACT;
    const isOTPStep = currentStep === REGISTRATION_STEPS.OTP_VERIFICATION;
    const isProfileStep = currentStep === REGISTRATION_STEPS.PROFILE_FORM;
    const isPasswordStep = currentStep === REGISTRATION_STEPS.PASSWORD_SETUP;

    const getStepNumber = () =>
        isInputStep ? 1 : isOTPStep ? 2 : isProfileStep ? 3 : 4;

    const getHeaderTitle = () => {
        if (isInputStep) return "Identity";
        if (isOTPStep) return "Verification";
        if (isProfileStep) return "Profile Setup";
        if (isPasswordStep) return "Create Password";
        return "Sign Up";
    };

    const colors = {
        bg: isDarkMode ? "#0D1117" : "#FFFFFF",
        text: isDarkMode ? "#FFFFFF" : "#0F172A",
        error: COLORS.error,
    };

    return {
        state: {
            currentStep,
            registrationData,
            error,
            loading,
            isInputStep,
            isOTPStep,
            isProfileStep,
            isPasswordStep,
            colors,
            modalHeight,
            keyboardHeight,
        },
        animations: {
            slideAnim,
            bgOpacity,
        },
        actions: {
            handleDismiss,
            handleGoBack,
            getStepNumber,
            getHeaderTitle,
            getKeyboardAvoidingViewProps,
            getScrollViewProps,
            ...signupFlow,
        },
    };
};
