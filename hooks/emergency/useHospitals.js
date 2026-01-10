import { useState, useEffect, useCallback } from "react";
import { hospitalsService } from "../../services/hospitalsService";

/**
 * Hook to fetch hospitals using the hospitals service
 *
 * @returns {Object} { hospitals, isLoading, error, refetch }
 */
export function useHospitals() {
	const [hospitals, setHospitals] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchHospitals = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const data = await hospitalsService.list();
			setHospitals(data);
		} catch (err) {
			console.error("Error fetching hospitals:", err);
			setError(err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchHospitals();
	}, [fetchHospitals]);

	return {
		hospitals,
		isLoading,
		error,
		refetch: fetchHospitals,
	};
}
