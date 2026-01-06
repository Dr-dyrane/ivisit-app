// contexts/LoginContext

/**
 * contexts/LoginContext.jsx
 * Simplified Login Context with proper flow control
 */

import { createContext, useContext, useState, useCallback } from "react";
import {
	LOGIN_STEPS,
	LOGIN_AUTH_METHODS,
	LOGIN_CONTACT_TYPES,
	getNextLoginStep,
	getPreviousLoginStep,
} from "../constants/loginSteps";

const LoginContext = createContext();

const initialLoginData = {
	authMethod: null, // "otp" | "password"
	contactType: null, // "email" | "phone"
	contact: null, // email or phone value
	email: null,
	phone: null,
	password: null,
	otp: null,
};

export function LoginProvider({ children }) {
	const [currentStep, setCurrentStep] = useState(LOGIN_STEPS.AUTH_METHOD);
	const [loginData, setLoginData] = useState(initialLoginData);
	const [isTransitioning, setIsTransitioning] = useState(false);

	const updateLoginData = useCallback((updates) => {
		console.log("[v0] LoginContext: Updating login data", updates);
		setLoginData((prev) => ({ ...prev, ...updates }));
	}, []);

	const goToStep = useCallback((step) => {
		console.log("[v0] LoginContext: Going to step", step);
		setCurrentStep(step);
		setIsTransitioning(false);
	}, []);

	const nextStep = useCallback(() => {
		if (isTransitioning) {
			console.log("[v0] LoginContext: Already transitioning, ignoring");
			return;
		}

		setIsTransitioning(true);
		const next = getNextLoginStep(
			currentStep,
			loginData.authMethod,
			loginData.contactType
		);
		console.log("[v0] LoginContext: Moving from", currentStep, "to", next);

		setTimeout(() => {
			setCurrentStep(next);
			setIsTransitioning(false);
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
		setCurrentStep(LOGIN_STEPS.AUTH_METHOD);
		setLoginData(initialLoginData);
		setIsTransitioning(false);
	}, []);

	const value = {
		currentStep,
		loginData,
		updateLoginData,
		goToStep,
		nextStep,
		previousStep,
		resetLoginFlow,
		isTransitioning,
		STEPS: LOGIN_STEPS,
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
