// hooks/auth/useForgotPassword.js

/**
 * useForgotPassword Hook
 * Uses authService for forgot password flow with OTP
 */

import { useState, useCallback } from "react";
import { authService } from "../../services/authService";

const useForgotPassword = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);
	const [resetToken, setResetToken] = useState(null); // DEV: Store for display

	/**
	 * Initiate forgot password - sends OTP to email
	 * @param {string} email
	 * @returns {Promise<{success: boolean, resetToken?: string, error?: string}>}
	 */
	const forgotPassword = useCallback(async (email) => {
		setLoading(true);
		setError(null);
		setSuccess(false);
		setResetToken(null);

		try {
			const response = await authService.forgotPassword(email);

			// DEV: Store reset token for display
			if (response.resetToken) {
				setResetToken(response.resetToken);
				console.log(`[DEV] Reset token generated: ${response.resetToken}`);
			}

			setLoading(false);
			setSuccess(true);
			return {
				success: true,
				resetToken: response.resetToken,
				message: response.message,
			};
		} catch (err) {
			const errorMessage =
				(err.message?.includes("|") ? err.message.split("|")[1] : err.message) ||
                "Failed to send reset code";
			setLoading(false);
			setError(errorMessage);
			return { success: false, error: errorMessage };
		}
	}, []);

	/**
	 * Clear state
	 */
	const reset = useCallback(() => {
		setLoading(false);
		setError(null);
		setSuccess(false);
		setResetToken(null);
	}, []);

	return {
		forgotPassword,
		loading,
		error,
		success,
		resetToken, // DEV: For display in UI
		reset,
	};
};

export default useForgotPassword;
