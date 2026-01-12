import { useState } from "react";
import { authService } from "../../services/authService";

export const useUpdateProfile = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const updateProfile = async (updates) => {
		console.log('[useUpdateProfile] updateProfile called with:', { updates });
		setIsLoading(true);
		setError(null);
		try {
			console.log('[useUpdateProfile] Calling authService.updateUser with:', updates);
			const result = await authService.updateUser(updates);
			console.log('[useUpdateProfile] authService.updateUser result:', result);
			return result;
		} catch (err) {
			console.log('[useUpdateProfile] Error caught:', err);
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
