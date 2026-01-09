import { useState, useCallback, useEffect } from "react";
import { medicalProfileService } from "../../services/medicalProfileService";

export function useMedicalProfile() {
	const [profile, setProfile] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchProfile = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await medicalProfileService.get();
			setProfile(data);
		} catch (err) {
			setError(err.message || "Failed to load medical profile");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const updateProfile = useCallback(async (updates) => {
		setIsLoading(true);
		setError(null);
		try {
			const updated = await medicalProfileService.update(updates);
			setProfile(updated);
			return updated;
		} catch (err) {
			setError(err.message || "Failed to update medical profile");
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	return {
		profile,
		isLoading,
		error,
		refreshProfile: fetchProfile,
		updateProfile,
	};
}
