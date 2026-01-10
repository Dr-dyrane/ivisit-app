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
		try {
			const result = await emergencyRequestsService.setStatus(requestId, status);
			console.log(`[setRequestStatus] Updated ${requestId} to ${status}`, result);
			return result;
		} catch (err) {
			console.error(`[setRequestStatus] Failed to set ${requestId} to ${status}:`, err);
			throw err;
		}
	}, []);

	return {
		createRequest,
		setRequestStatus,
		isLoading,
		error,
	};
}
