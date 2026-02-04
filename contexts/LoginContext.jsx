// contexts/LoginContext

/**
 * contexts/LoginContext.jsx
 * Login Context with proper flow control, error handling, and loading states
 * [MEMORY-LEAK-FIX] Added timer cleanup for step transitions
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
	LOGIN_STEPS,
	LOGIN_AUTH_METHODS,
	LOGIN_CONTACT_TYPES,
	getNextLoginStep,
	getPreviousLoginStep,
} from "../constants/loginSteps";

const LoginContext = createContext();

const initialLoginData = {
	authMethod: LOGIN_AUTH_METHODS.PASSWORD, // Default to password
	contactType: null, // "email" | "phone"
	contact: null, // email or phone value
	email: null,
	phone: null,
	password: null,
	otp: null,
};

export function LoginProvider({ children }) {
	const [currentStep, setCurrentStep] = useState(LOGIN_STEPS.SMART_CONTACT);
	const [loginData, setLoginData] = useState(initialLoginData);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const transitionTimerRef = useRef(null);

	// Error and loading states
	const [error, setError] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	// [MEMORY-LEAK-FIX] Cleanup transition timer on unmount
	useEffect(() => {
		return () => {
			if (transitionTimerRef.current) {
				clearTimeout(transitionTimerRef.current);
			}
		};
	}, []);

	const updateLoginData = useCallback((updates) => {
		console.log("[v0] LoginContext: Updating login data", updates);
		setLoginData((prev) => ({ ...prev, ...updates }));
	}, []);

	const goToStep = useCallback((step) => {
		console.log("[v0] LoginContext: Going to step", step);
		setCurrentStep(step);
		setIsTransitioning(false);
	}, []);

	const nextStep = useCallback((overrides = {}) => {
		if (isTransitioning) {
			console.log("[v0] LoginContext: Already transitioning, ignoring");
			return;
		}

		setIsTransitioning(true);
		const next = getNextLoginStep(
			currentStep,
			overrides.authMethod || loginData.authMethod,
			overrides.contactType || loginData.contactType
		);
		console.log("[v0] LoginContext: Moving from", currentStep, "to", next);

		// [MEMORY-LEAK-FIX] Store timer ref for cleanup
		transitionTimerRef.current = setTimeout(() => {
			setCurrentStep(next);
			setIsTransitioning(false);
			transitionTimerRef.current = null;
		}, 100);
	}, [
		currentStep,
		loginData.authMethod,
		loginData.contactType,
		isTransitioning,
	]);

	const previousStep = useCallback(() => {
		if (isTransitioning) return;

		const prev = getPreviousLoginStep(currentStep);
		console.log("[v0] LoginContext: Going back from", currentStep, "to", prev);
		setCurrentStep(prev);
	}, [currentStep, isTransitioning]);

	const resetLoginFlow = useCallback(() => {
		console.log("[v0] LoginContext: Resetting login flow");
		setCurrentStep(LOGIN_STEPS.SMART_CONTACT);
		setLoginData(initialLoginData);
		setIsTransitioning(false);
		setError(null);
		setIsLoading(false);
	}, []);

	// [AUTH_REFACTOR] Centralized error parsing: Strips 'status|' codes for clean UI presentation
	const setLoginError = useCallback((errorMessage) => {
		console.log("[v0] LoginContext: Setting error", errorMessage);
		const cleanMessage = errorMessage?.includes("|")
			? errorMessage.split("|")[1]
			: errorMessage;
		setError(cleanMessage);
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Loading state helpers
	const startLoading = useCallback(() => {
		setIsLoading(true);
		setError(null);
	}, []);

	const stopLoading = useCallback(() => {
		setIsLoading(false);
	}, []);

	const value = {
		// Step management
		currentStep,
		loginData,
		updateLoginData,
		goToStep,
		nextStep,
		previousStep,
		resetLoginFlow,
		isTransitioning,
		STEPS: LOGIN_STEPS,

		// Error handling
		error,
		setLoginError,
		clearError,

		// Loading state
		isLoading,
		startLoading,
		stopLoading,
	};

	return (
		<LoginContext.Provider value={value}>{children}</LoginContext.Provider>
	);
}

export function useLogin() {
	const context = useContext(LoginContext);
	if (!context) throw new Error("useLogin must be used within LoginProvider");
	return context;
}

export { LOGIN_STEPS, LOGIN_AUTH_METHODS, LOGIN_CONTACT_TYPES };
