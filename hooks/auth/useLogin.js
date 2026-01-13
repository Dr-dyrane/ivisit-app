/**
 * useLogin Hook
 * Uses authService for login operations
 *
 * Can optionally integrate with LoginContext when used inside LoginProvider.
 * When used outside LoginProvider, state management functions can be passed as options.
 */

import { useContext, useCallback, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { authService } from "../../services/authService";

// Input validation helpers
const isValidEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

const isValidPhone = (phone) => {
	const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
	return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

const isValidPassword = (password) => {
	return password && password.length >= 6;
};

/**
 * @param {Object} options - Optional state management functions
 * @param {Function} options.startLoading - Called when operation starts
 * @param {Function} options.stopLoading - Called when operation ends
 * @param {Function} options.setError - Called on error
 * @param {Function} options.clearError - Called to clear errors
 */
const useLogin = (options = {}) => {
	const { login: authLogin } = useContext(AuthContext);

	// Internal loading state as fallback
	const [internalLoading, setInternalLoading] = useState(false);

	// Use provided functions or no-ops
	const startLoading = options.startLoading || (() => setInternalLoading(true));
	const stopLoading = options.stopLoading || (() => setInternalLoading(false));
	const setLoginError = options.setError || (() => {});
	const clearError = options.clearError || (() => {});

	/**
	 * Login with password
	 * @param {Object} credentials - { email?, phone?, password }
	 */
	const loginWithPassword = useCallback(
		async (credentials) => {
			startLoading();
			clearError();

			try {
				// Validate inputs before API call
				if (credentials.email && !isValidEmail(credentials.email)) {
					const errorMessage = "Invalid email address format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				if (credentials.phone && !isValidPhone(credentials.phone)) {
					const errorMessage = "Invalid phone number format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				if (!isValidPassword(credentials.password)) {
					const errorMessage = "Password must be at least 6 characters";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				const result = await authService.loginWithPassword(credentials);

				if (!result.success) {
					setLoginError(result.error);
					return { success: false, error: result.error };
				}

				// Update AuthContext with user data
				const loginSuccess = await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				if (!loginSuccess) {
					setLoginError("Failed to save session");
					return { success: false, error: "Failed to save session" };
				}

				return { success: true, data: result.data };
			} catch (error) {
				console.error("useLogin loginWithPassword error:", error);
				const errorMessage = error?.message || "Login failed";
				setLoginError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[authLogin, startLoading, stopLoading, setLoginError, clearError]
	);

	/**
	 * Request OTP for login
	 * @param {Object} params - { email?, phone? }
	 */
	const requestOtp = useCallback(
		async (params) => {
			startLoading();
			clearError();

			try {
				// Validate inputs before API call
				if (params.email && !isValidEmail(params.email)) {
					const errorMessage = "Invalid email address format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				if (params.phone && !isValidPhone(params.phone)) {
					const errorMessage = "Invalid phone number format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				const result = await authService.requestOtp(params);

				if (!result.success) {
					setLoginError(result.error);
					return { success: false, error: result.error };
				}

				return { success: true, data: result.data };
			} catch (error) {
				console.error("useLogin requestOtp error:", error);
				const errorMessage = error?.message || "Failed to send OTP";
				setLoginError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[startLoading, stopLoading, setLoginError, clearError]
	);

	/**
	 * Verify OTP and complete login
	 * @param {Object} params - { email?, phone?, otp }
	 */
	const verifyOtpLogin = useCallback(
		async (params) => {
			startLoading();
			clearError();

			try {
				// Validate OTP format
				if (!params.otp || params.otp.length < 6) {
					const errorMessage = "Invalid verification code format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				const result = await authService.verifyOtp(params);

				if (!result.success) {
					setLoginError(result.error);
					return { success: false, error: result.error };
				}

				// Check if user exists for auto-login
				if (result.data?.isExistingUser) {
					// Update AuthContext with user data
					const loginSuccess = await authLogin({
						...result.data, // Spread result.data (the user) directly
						token: result.data.token,
					});

					if (!loginSuccess) {
						setLoginError("Failed to save session");
						return { success: false, error: "Failed to save session" };
					}

					return { success: true, data: result.data };
				}

				// User doesn't exist - return success but indicate no user found
				return {
					success: false,
					error: "USER_NOT_FOUND",
					data: { verified: true, isExistingUser: false },
				};
			} catch (error) {
				console.error("useLogin verifyOtpLogin error:", error);
				const errorMessage = error?.message || "OTP verification failed";
				setLoginError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[authLogin, startLoading, stopLoading, setLoginError, clearError]
	);

	/**
	 * Set password for a user
	 * @param {Object} params - { email?, phone?, password }
	 */
	const setPassword = useCallback(
		async (params) => {
			startLoading();
			clearError();

			try {
				// Validate inputs before API call
				if (params.email && !isValidEmail(params.email)) {
					const errorMessage = "Invalid email address format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				if (params.phone && !isValidPhone(params.phone)) {
					const errorMessage = "Invalid phone number format";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				if (!isValidPassword(params.password)) {
					const errorMessage = "Password must be at least 6 characters";
					setLoginError(errorMessage);
					return { success: false, error: errorMessage };
				}

				const result = await authService.setPassword(params);

				if (!result.success) {
					setLoginError(result.error);
					return { success: false, error: result.error };
				}

				// Update AuthContext with user data after password is set
				const loginSuccess = await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				if (!loginSuccess) {
					setLoginError("Failed to save session");
					return { success: false, error: "Failed to save session" };
				}

				return { success: true, data: result.data };
			} catch (error) {
				console.error("useLogin setPassword error:", error);
				const errorMessage = error?.message || "Failed to set password";
				setLoginError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[authLogin, startLoading, stopLoading, setLoginError, clearError]
	);

	/**
	 * Legacy login function for backward compatibility
	 * @param {Object} credentials - { email?, phone?, password }
	 */
	const login = useCallback(
		async (credentials) => {
			const result = await loginWithPassword(credentials);
			if (!result.success) {
				throw new Error(result.error);
			}
			return true;
		},
		[loginWithPassword]
	);

	return {
		// New API
		loginWithPassword,
		requestOtp,
		verifyOtpLogin,
		setPassword,

		// Legacy API for backward compatibility
		login,

		// Internal loading state (when not using context)
		isLoading: internalLoading,
	};
};

export default useLogin;
