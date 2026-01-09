import { useState } from "react";
import { authService } from "../../services/authService";

export const useUpdateProfile = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const updateProfile = async (updates) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authService.updateUser(updates);
			return result;
		} catch (err) {
			const msg = err?.message || "Failed to update profile";
			setError(msg);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		updateProfile,
		isLoading,
		error,
	};
};
