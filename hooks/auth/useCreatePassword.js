import { useState } from "react";
import { authService } from "../../services/authService";

export const useCreatePassword = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const createPassword = async ({ password }) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authService.createPassword({ password });
			return result;
		} catch (err) {
			const msg = err?.message || "Failed to create password";
			setError(msg);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		createPassword,
		isLoading,
		error,
	};
};
