// hooks/mutations/useSignUp.js

/**
 * useSignUp Hook
 * Uses authService for registration operations
 *
 * Can optionally integrate with RegistrationContext when used inside RegistrationProvider.
 * When used outside RegistrationProvider (e.g., inside the provider itself),
 * state management functions can be passed as options.
 */

import { useContext, useCallback, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { authService } from "../../services/authService";

/**
 * @param {Object} options - Optional state management functions
 * @param {Function} options.startLoading - Called when operation starts
 * @param {Function} options.stopLoading - Called when operation ends
 * @param {Function} options.setError - Called on error
 * @param {Function} options.clearError - Called to clear errors
 */
const useSignUp = (options = {}) => {
	const { login: authLogin } = useContext(AuthContext);

	// Internal loading state as fallback
	const [internalLoading, setInternalLoading] = useState(false);

	// Use provided functions or no-ops
	const startLoading = options.startLoading || (() => setInternalLoading(true));
	const stopLoading = options.stopLoading || (() => setInternalLoading(false));
	const setRegistrationError = options.setError || (() => {});
	const clearError = options.clearError || (() => {});

	/**
	 * Register a new user
	 * @param {Object} userData - Registration data
	 */
	const signUpUser = useCallback(
		async (userData) => {
			startLoading();
			clearError();

			try {
				const result = await authService.register(userData);

				if (!result.success) {
					setRegistrationError(result.error);
					return { success: false, error: result.error };
				}

				// Update AuthContext with user data
				const loginSuccess = await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				if (!loginSuccess) {
					setRegistrationError("Failed to save session");
					return { success: false, error: "Failed to save session" };
				}

				return { success: true, data: result.data };
			} catch (error) {
				const errorMessage = error?.message || "Registration failed";
				setRegistrationError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[authLogin, startLoading, stopLoading, setRegistrationError, clearError]
	);

	/**
	 * Request OTP for registration verification
	 * @param {Object} params - { email?, phone? }
	 */
	const requestRegistrationOtp = useCallback(
		async (params) => {
			startLoading();
			clearError();

			try {
				const result = await authService.requestOtp(params);

				if (!result.success) {
					setRegistrationError(result.error);
					return { success: false, error: result.error };
				}

				return { success: true, data: result.data };
			} catch (error) {
				const errorMessage = error?.message || "Failed to send OTP";
				setRegistrationError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[startLoading, stopLoading, setRegistrationError, clearError]
	);

	/**
	 * Verify OTP during registration
	 * @param {Object} params - { email?, phone?, otp }
	 */
	const verifyRegistrationOtp = useCallback(
		async (params) => {
			startLoading();
			clearError();

			try {
				const result = await authService.verifyOtp(params);

				if (!result.success) {
					setRegistrationError(result.error);
					return { success: false, error: result.error };
				}

				return { success: true, data: result.data };
			} catch (error) {
				const errorMessage = error?.message || "OTP verification failed";
				setRegistrationError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[startLoading, stopLoading, setRegistrationError, clearError]
	);

	/**
	 * Social signup helper
	 * @param {string} provider - Provider name (google, apple, facebook)
	 * @param {Object} profile - Social profile data
	 */
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
					return { success: false, error: result.error };
				}

				// Update AuthContext with user data
				await authLogin({
					...result.data.user,
					token: result.data.token,
				});

				return { success: true, data: result.data };
			} catch (error) {
				const errorMessage = error?.message || "Social signup failed";
				setRegistrationError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				stopLoading();
			}
		},
		[authLogin, startLoading, stopLoading, setRegistrationError, clearError]
	);

	/**
	 * Legacy signUp function for backward compatibility
	 * @param {Object} credentials - Registration data
	 */
	const signUp = useCallback(
		async (credentials) => {
			const result = await signUpUser(credentials);
			if (!result.success) {
				throw new Error(result.error);
			}
			return true;
		},
		[signUpUser]
	);

	return {
		// New API
		signUpUser,
		requestRegistrationOtp,
		verifyRegistrationOtp,
		socialSignUp,

		// Legacy API for backward compatibility
		signUp,

		// Internal loading state (when not using context)
		isLoading: internalLoading,
	};
};

export default useSignUp;
