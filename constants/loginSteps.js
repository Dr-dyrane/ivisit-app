// constants/loginSteps.js

export const LOGIN_STEPS = {
	AUTH_METHOD: "auth_method", // Choose OTP or Password
	CONTACT_TYPE: "contact_type", // Choose Email or Phone
	CONTACT_INPUT: "contact_input", // Enter email or phone value
	OTP_VERIFICATION: "otp_verification", // Verify OTP if chosen
	PASSWORD_INPUT: "password_input", // Enter password if chosen
	FORGOT_PASSWORD: "forgot_password",
	RESET_PASSWORD: "reset_password",
};

export const LOGIN_CONTACT_TYPES = {
	EMAIL: "email",
	PHONE: "phone",
};

export const LOGIN_AUTH_METHODS = {
	OTP: "otp",
	PASSWORD: "password",
};

// Flow helper to determine next step based on current state
export const getNextLoginStep = (currentStep, authMethod, contactType) => {
	if (currentStep === LOGIN_STEPS.AUTH_METHOD) {
		return LOGIN_STEPS.CONTACT_TYPE;
	}

	if (currentStep === LOGIN_STEPS.CONTACT_TYPE) {
		return LOGIN_STEPS.CONTACT_INPUT;
	}

	if (currentStep === LOGIN_STEPS.CONTACT_INPUT) {
		return authMethod === LOGIN_AUTH_METHODS.OTP
			? LOGIN_STEPS.OTP_VERIFICATION
			: LOGIN_STEPS.PASSWORD_INPUT;
	}

	return currentStep;
};

// Flow helper to determine previous step
export const getPreviousLoginStep = (currentStep) => {
	if (currentStep === LOGIN_STEPS.CONTACT_TYPE) {
		return LOGIN_STEPS.AUTH_METHOD;
	}

	if (currentStep === LOGIN_STEPS.CONTACT_INPUT) {
		return LOGIN_STEPS.CONTACT_TYPE;
	}

	if (
		currentStep === LOGIN_STEPS.OTP_VERIFICATION ||
		currentStep === LOGIN_STEPS.PASSWORD_INPUT
	) {
		return LOGIN_STEPS.CONTACT_INPUT;
	}

	if (
		currentStep === LOGIN_STEPS.FORGOT_PASSWORD ||
		currentStep === LOGIN_STEPS.RESET_PASSWORD
	) {
		return LOGIN_STEPS.PASSWORD_INPUT;
	}

	return LOGIN_STEPS.AUTH_METHOD;
};
