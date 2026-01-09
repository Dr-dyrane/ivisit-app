import { useState } from "react";
import { authService } from "../../services/authService";

export const useChangePassword = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const changePassword = async ({ currentPassword, newPassword }) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authService.changePassword({ currentPassword, newPassword });
			return result;
		} catch (err) {
			const msg = err?.message || "Failed to change password";
			setError(msg);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		changePassword,
		isLoading,
		error,
	};
};
