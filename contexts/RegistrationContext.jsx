// contexts/RegistrationContext

/**
 * Global Registration Flow Context
 * Manages state across all registration steps for iVisit
 * Allows users to navigate back/forth while preserving data
 * Includes error handling and loading states
 */

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
} from "react";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { authService } from "../services/authService";
import { REGISTRATION_STEPS } from "../constants/registrationSteps";

const RegistrationContext = createContext();

export function RegistrationProvider({ children }) {
	const { showToast } = useToast();
	const { login: authLogin } = useAuth();

	// --- Current registration step
	const [currentStep, setCurrentStep] = useState(
		REGISTRATION_STEPS.METHOD_SELECTION
	);

	// --- Error and loading states
	const [error, setError] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	// --- Registration data
	const [registrationData, setRegistrationData] = useState({
		method: null, // "phone" | "email"
		countryCode: null,
		phone: null,
		email: null,
		otp: null,
		username: null, // Added username field
		firstName: null,
		lastName: null,
		fullName: null, // consolidated first + last
		password: null,
		dateOfBirth: null,
		imageUri: null, // profile image
		profileComplete: false,
	});

	// --- Update registration data and maintain fullName
	const updateRegistrationData = useCallback((updates) => {
		setRegistrationData((prev) => {
			const newData = { ...prev, ...updates };

			// Automatically compute fullName
			if (updates.firstName || updates.lastName) {
				newData.fullName = `${newData.firstName || ""} ${
					newData.lastName || ""
				}`.trim();
			}

			if (!newData.username && (newData.email || newData.phone)) {
				if (newData.email) {
					newData.username = newData.email.split("@")[0];
				} else if (newData.phone) {
					newData.username = `user${newData.phone.slice(-4)}`;
				}
			}

			return newData;
		});
	}, []);

	// --- Navigation helpers
	const goToStep = useCallback((step) => setCurrentStep(step), []);

	const nextStep = useCallback(() => {
		const stepOrder = [
			REGISTRATION_STEPS.METHOD_SELECTION,
			registrationData.method === "phone"
				? REGISTRATION_STEPS.PHONE_INPUT
				: REGISTRATION_STEPS.EMAIL_INPUT,
			REGISTRATION_STEPS.OTP_VERIFICATION,
			REGISTRATION_STEPS.PROFILE_FORM,
			REGISTRATION_STEPS.PASSWORD_SETUP,
		];

		const currentIndex = stepOrder.indexOf(currentStep);
		if (currentIndex < stepOrder.length - 1) {
			setCurrentStep(stepOrder[currentIndex + 1]);
		}
	}, [currentStep, registrationData.method]);

	const previousStep = useCallback(() => {
		const stepOrder = [
			REGISTRATION_STEPS.METHOD_SELECTION,
			registrationData.method === "phone"
				? REGISTRATION_STEPS.PHONE_INPUT
				: REGISTRATION_STEPS.EMAIL_INPUT,
			REGISTRATION_STEPS.OTP_VERIFICATION,
			REGISTRATION_STEPS.PROFILE_FORM,
			REGISTRATION_STEPS.PASSWORD_SETUP,
		];

		const currentIndex = stepOrder.indexOf(currentStep);
		if (currentIndex > 0) {
			setCurrentStep(stepOrder[currentIndex - 1]);
		}
	}, [currentStep, registrationData.method]);

	const resetRegistration = useCallback(() => {
		setCurrentStep(REGISTRATION_STEPS.METHOD_SELECTION);
		setRegistrationData({
			method: null,
			countryCode: null,
			phone: null,
			email: null,
			otp: null,
			username: null,
			firstName: null,
			lastName: null,
			fullName: null,
			password: null,
			dateOfBirth: null,
			imageUri: null,
			profileComplete: false,
		});
		setError(null);
		setIsLoading(false);
	}, []);

	// --- Error handling helpers
	const setRegistrationError = useCallback((errorMessage) => {
		console.log("[v0] RegistrationContext: Setting error", errorMessage);
		setError(errorMessage);
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// --- Loading state helpers
	const startLoading = useCallback(() => {
		setIsLoading(true);
		setError(null);
	}, []);

	const stopLoading = useCallback(() => {
		setIsLoading(false);
	}, []);

	// --- Navigation state
	const canGoBack = currentStep !== REGISTRATION_STEPS.METHOD_SELECTION;

	const getProgress = useCallback(() => {
		const steps = [
			REGISTRATION_STEPS.METHOD_SELECTION,
			registrationData.method === "phone"
				? REGISTRATION_STEPS.PHONE_INPUT
				: REGISTRATION_STEPS.EMAIL_INPUT,
			REGISTRATION_STEPS.OTP_VERIFICATION,
			REGISTRATION_STEPS.PROFILE_FORM,
			REGISTRATION_STEPS.PASSWORD_SETUP,
		];
		const currentIndex = steps.indexOf(currentStep);
		return ((currentIndex + 1) / steps.length) * 100;
	}, [currentStep, registrationData.method]);

	// --- Social signup wrapper using authService directly
	const socialSignUp = useCallback(
		async (provider, profile) => {
			startLoading();
			clearError();

			try {
				const username = profile.name
					? profile.name.replace(/\s+/g, "_").toLowerCase()
					: `${provider}_user_${Date.now()}`;

				const userData = {
					username,
					email: profile.email || null,
					firstName: profile.firstName || null,
					lastName: profile.lastName || null,
					imageUri: profile.imageUri || null,
					provider,
				};

				const result = await authService.register(userData);

				if (!result.success) {
					setRegistrationError(result.error);
					showToast(`Social signup failed: ${result.error}`, "error");
					return false;
				}

				// Update AuthContext with user data
				await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				// Automatically save imageUri if provided
				if (profile?.imageUri) {
					updateRegistrationData({ imageUri: profile.imageUri });
				}

				// Automatically save name
				if (profile?.firstName || profile?.lastName) {
					updateRegistrationData({
						firstName: profile.firstName,
						lastName: profile.lastName,
					});
				}

				showToast(`Signed up with ${provider}`, "success");
				resetRegistration();
				return true;
			} catch (err) {
				const errorMessage = err?.message || "Social signup failed";
				setRegistrationError(errorMessage);
				showToast(`Social signup failed: ${errorMessage}`, "error");
				return false;
			} finally {
				stopLoading();
			}
		},
		[
			authLogin,
			resetRegistration,
			updateRegistrationData,
			showToast,
			startLoading,
			stopLoading,
			setRegistrationError,
			clearError,
		]
	);

	// Check for pending registration data (from login flow with verified OTP)
	const checkAndApplyPendingRegistration = useCallback(async () => {
		const pending = await authService.getPendingRegistration();
		if (pending && pending.verified) {
			console.log("[v0] Found verified pending registration:", pending);
			// Auto-populate with verified contact info from login attempt
			updateRegistrationData({
				method: pending.contactType === "email" ? "email" : "phone",
				email: pending.email,
				phone: pending.phone,
				otp: "verified", // Mark as already verified
			});

			// Skip to profile form since OTP is already verified
			goToStep(REGISTRATION_STEPS.PROFILE_FORM);

			showToast("Let's complete your profile", "info");
			return true;
		}
		return false;
	}, [updateRegistrationData, goToStep, showToast]);

	// Check on mount
	useEffect(() => {
		checkAndApplyPendingRegistration();
	}, []);

	// --- Context value
	const value = {
		// Step management
		currentStep,
		registrationData,
		updateRegistrationData,
		goToStep,
		nextStep,
		previousStep,
		resetRegistration,
		canGoBack,
		getProgress,
		STEPS: REGISTRATION_STEPS,
		socialSignUp,
		checkAndApplyPendingRegistration,

		// Error handling
		error,
		setRegistrationError,
		clearError,

		// Loading state
		isLoading,
		startLoading,
		stopLoading,
	};

	return (
		<RegistrationContext.Provider value={value}>
			{children}
		</RegistrationContext.Provider>
	);
}

// --- Hook to use registration context
export function useRegistration() {
	const context = useContext(RegistrationContext);
	if (!context)
		throw new Error("useRegistration must be used within RegistrationProvider");
	return context;
}

export { REGISTRATION_STEPS };
