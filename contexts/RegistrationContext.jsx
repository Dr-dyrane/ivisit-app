// contetxs/RegistrationContext

"use client";

/**
 * Global Registration Flow Context
 * Manages state across all registration steps for iVisit
 * Allows users to navigate back/forth while preserving data
 */

import { createContext, useContext, useState, useCallback } from "react";
import { useToast } from "./ToastContext";
import useSignUp from "../hooks/mutations/useSignup";
import { REGISTRATION_STEPS } from "../constants/registrationSteps";

const RegistrationContext = createContext();

export function RegistrationProvider({ children }) {
	const { showToast } = useToast();
	const { socialSignUp: hookSocialSignUp } = useSignUp();

	// --- Current registration step
	const [currentStep, setCurrentStep] = useState(
		REGISTRATION_STEPS.METHOD_SELECTION
	);

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

	// --- Social signup wrapper
	const socialSignUp = useCallback(
		async (provider, profile) => {
			try {
				const data = await hookSocialSignUp(provider, profile);
				if (!data) throw new Error("Signup failed");

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
				showToast(`Social signup failed: ${err?.message || err}`, "error");
				return false;
			}
		},
		[hookSocialSignUp, resetRegistration, updateRegistrationData, showToast]
	);

	// --- Context value
	const value = {
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
