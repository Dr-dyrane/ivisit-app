// hooks/auth/useResetPassword.js

/**
 * useResetPassword Hook
 * Uses authService for password reset with OTP verification
 */

import { useState, useCallback } from "react";
import { authService } from "../../services/authService";

const useResetPassword = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

	/**
	 * Reset password using OTP token
	 * @param {string} resetToken - 6-digit OTP
	 * @param {string} newPassword - New password
	 * @param {string} email - User email
	 * @returns {Promise<{success: boolean, error?: string}>}
	 */
	const resetPassword = useCallback(async (resetToken, newPassword, email) => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await authService.resetPassword({
				resetToken,
				newPassword,
				email,
			});

			setLoading(false);
			setSuccess(true);
			return { success: true, message: response.message };
		} catch (err) {
			const errorMessage =
				(err.message?.includes("|") ? err.message.split("|")[1] : err.message) ||
                "Failed to reset password";
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
	}, []);

	return { resetPassword, loading, error, success, reset };
};

export default useResetPassword;
