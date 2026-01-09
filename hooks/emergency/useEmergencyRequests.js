import { useState, useCallback } from "react";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";

export function useEmergencyRequests() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const createRequest = useCallback(async (requestData) => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await emergencyRequestsService.create(requestData);
			return result;
		} catch (err) {
			setError(err.message || "Failed to create emergency request");
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const setRequestStatus = useCallback(async (requestId, status) => {
		// Don't set global loading here to avoid UI blocking on background updates
		try {
			await emergencyRequestsService.setStatus(requestId, status);
		} catch (err) {
			console.error("Failed to set request status", err);
		}
	}, []);

	return {
		createRequest,
		setRequestStatus,
		isLoading,
		error,
	};
}
