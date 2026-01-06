"use client";

/**
 * Simplified Login Context
 * Single flow: Choose auth method (OTP/Password) → Enter contact → Authenticate
 */

import { createContext, useContext, useState, useCallback } from "react";
import { LOGIN_STEPS, LOGIN_AUTH_METHODS } from "../constants/loginSteps";

const LoginContext = createContext();

const initialLoginData = {
	authMethod: null, // "otp" | "password"
	contactType: null, // "email" | "phone"
	contact: null, // email or phone value
	password: null,
	otp: null,
};

export function LoginProvider({ children }) {
	const [currentStep, setCurrentStep] = useState(LOGIN_STEPS.AUTH_METHOD);
	const [loginData, setLoginData] = useState(initialLoginData);

	const updateLoginData = useCallback((updates) => {
		setLoginData((prev) => ({ ...prev, ...updates }));
	}, []);

	const goToStep = useCallback((step) => setCurrentStep(step), []);

	const nextStep = useCallback(() => {
		if (currentStep === LOGIN_STEPS.AUTH_METHOD) {
			setCurrentStep(LOGIN_STEPS.CONTACT_INPUT);
		} else if (currentStep === LOGIN_STEPS.CONTACT_INPUT) {
			if (loginData.authMethod === LOGIN_AUTH_METHODS.OTP) {
				setCurrentStep(LOGIN_STEPS.OTP_VERIFICATION);
			} else {
				setCurrentStep(LOGIN_STEPS.PASSWORD_INPUT);
			}
		}
	}, [currentStep, loginData.authMethod]);

	const previousStep = useCallback(() => {
		if (currentStep === LOGIN_STEPS.CONTACT_INPUT) {
			setCurrentStep(LOGIN_STEPS.AUTH_METHOD);
		} else if (
			currentStep === LOGIN_STEPS.OTP_VERIFICATION ||
			currentStep === LOGIN_STEPS.PASSWORD_INPUT
		) {
			setCurrentStep(LOGIN_STEPS.CONTACT_INPUT);
		} else if (
			currentStep === LOGIN_STEPS.FORGOT_PASSWORD ||
			currentStep === LOGIN_STEPS.RESET_PASSWORD
		) {
			setCurrentStep(LOGIN_STEPS.PASSWORD_INPUT);
		}
	}, [currentStep]);

	const resetLoginFlow = useCallback(() => {
		setCurrentStep(LOGIN_STEPS.AUTH_METHOD);
		setLoginData(initialLoginData);
	}, []);

	const value = {
		currentStep,
		loginData,
		updateLoginData,
		goToStep,
		nextStep,
		previousStep,
		resetLoginFlow,
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

export { LOGIN_STEPS, LOGIN_AUTH_METHODS };
