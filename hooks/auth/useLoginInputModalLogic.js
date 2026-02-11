/**
 * hooks/auth/useLoginInputModalLogic.js
 * 
 * Logic hook for LoginInputModal.
 * Handles animations, form state, step navigation, and interactions with LoginContext/AuthContext.
 * 
 * @module useLoginInputModalLogic
 */

import { useEffect, useRef, useMemo, useCallback } from "react";
import { Animated, Dimensions, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import {
	LOGIN_STEPS,
	useLogin,
} from "../../contexts/LoginContext";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { useAndroidKeyboardAwareModal } from "../../hooks/ui/useAndroidKeyboardAwareModal";
import { useLoginFlow } from "./useLoginFlow";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useLoginInputModalLogic({ visible, onClose, onSwitchToSignUp }) {
	// --- UI Hooks & Refs ---
	const insets = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const bgOpacity = useRef(new Animated.Value(0)).current;

	const { modalHeight, keyboardHeight, getKeyboardAvoidingViewProps, getScrollViewProps } =
		useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });

	// --- Contexts ---
	const { isDarkMode } = useTheme();
	
	const {
		currentStep,
		loginData,
		resetLoginFlow,
		isTransitioning,
		error,
		isLoading: loading,
		clearError,
	} = useLogin();

	// --- Actions (UI Animations) ---

	const handleDismiss = useCallback(() => {
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
			resetLoginFlow();
			// We don't reset local flow state here as it's handled in useLoginFlow or re-initialized
			if (onClose) onClose();
		});
	}, [slideAnim, bgOpacity, resetLoginFlow, onClose]);

	const handleSwitchToSignUpUI = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		const savedContactType = loginData.contactType;

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
			resetLoginFlow();
			if (onClose) onClose();
			if (onSwitchToSignUp) onSwitchToSignUp(savedContactType);
		});
	}, [loginData.contactType, slideAnim, bgOpacity, resetLoginFlow, onClose, onSwitchToSignUp]);

    // --- Business Logic Hook ---
    // We pass handleDismiss as the onDismiss callback so the flow can close the modal on success
    const loginFlow = useLoginFlow({ 
        onDismiss: handleDismiss,
        onSwitchToSignUp: handleSwitchToSignUpUI 
    });

	const handleGoBack = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		clearError();
        // Reset specific flow states if needed via loginFlow actions, or just let context handle step back
        loginFlow.setShowSignUpOption(false); 
        // We access previousStep from context directly or via useLoginFlow if we wrapped it?
        // Let's use the one from context since it's simple navigation
        // But wait, useLogin provides previousStep.
        // We need to import previousStep from useLogin()
	}, [clearError, loginFlow]);

    // Re-import previousStep for handleGoBack
    const { previousStep, updateLoginData, nextStep } = useLogin();
    
    // Overwrite handleGoBack with correct dependencies
    const handleGoBackAction = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		clearError();
        loginFlow.setShowSignUpOption(false);
		previousStep();
	}, [clearError, previousStep, loginFlow]);

    // Wrapper for UI-specific method selection
    const handleAuthMethodSelect = useCallback((method) => {
		updateLoginData({ authMethod: method });
		nextStep();
	}, [updateLoginData, nextStep]);

    const handleContactTypeSelect = useCallback((type) => {
		updateLoginData({ contactType: type });
		nextStep();
	}, [updateLoginData, nextStep]);

    // Legacy helper
    const handleContactSubmit = useCallback((value) => {
         loginFlow.handleSmartContactSubmit(value, loginData.contactType);
    }, [loginData.contactType, loginFlow]);


	// --- Effects ---

	// Handle visibility animations
	useEffect(() => {
		if (visible) {
			clearError();
            loginFlow.setShowSignUpOption(false);
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
		}
	}, [visible]);


	// --- Derived State for UI ---

	const getStepNumber = useCallback(() => {
		if (currentStep === LOGIN_STEPS.SMART_CONTACT) return 1;
		return 2;
	}, [currentStep]);

	const getHeaderTitle = useCallback(() => {
		if (currentStep === LOGIN_STEPS.SMART_CONTACT) return "Identity";
		if (currentStep === LOGIN_STEPS.AUTH_METHOD) return "Identity";
		if (currentStep === LOGIN_STEPS.CONTACT_TYPE) return "Identity";
		if (currentStep === LOGIN_STEPS.CONTACT_INPUT) return "Identity";
		if (currentStep === LOGIN_STEPS.OTP_VERIFICATION) return "Verification";
		if (currentStep === LOGIN_STEPS.PASSWORD_INPUT) return "Authorization";
		if (currentStep === LOGIN_STEPS.SET_PASSWORD) return "Secure Account";
		if (currentStep === LOGIN_STEPS.FORGOT_PASSWORD) return "Recovery";
		if (currentStep === LOGIN_STEPS.RESET_PASSWORD) return "Reset Password";
		return "Sign In";
	}, [currentStep]);

	const colors = useMemo(() => ({
		bg: isDarkMode ? "#0D1117" : "#FFFFFF",
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		error: COLORS.error,
	}), [isDarkMode]);

	return {
		state: {
			currentStep,
			loginData,
			error,
			loading,
			showSignUpOption: loginFlow.showSignUpOption,
			mockOtp: loginFlow.mockOtp,
			resetEmail: loginFlow.resetEmail,
			resetToken: loginFlow.resetToken,
			modalHeight,
			keyboardHeight,
			colors,
			isTransitioning,
		},
		animations: {
			slideAnim,
			bgOpacity,
		},
		actions: {
			handleDismiss,
			handleGoBack: handleGoBackAction,
			handleSwitchToSignUp: handleSwitchToSignUpUI, // Use the UI animation wrapper
			handleAuthMethodSelect,
			handleContactTypeSelect,
            handleContactSubmit,
			getKeyboardAvoidingViewProps,
			getScrollViewProps,
			getStepNumber,
			getHeaderTitle,
            ...loginFlow, // Expose all flow actions (handleSmartContactSubmit, etc.)
		},
	};
}
