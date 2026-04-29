import { useState, useCallback, useEffect } from "react";
import { medicalProfileService } from "../../services/medicalProfileService";

export function useMedicalProfile() {
	const [profile, setProfile] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
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
		setIsSaving(true);
		setError(null);
		try {
			const updated = await medicalProfileService.update(updates);
			setProfile(updated);
			return updated;
		} catch (err) {
			if (err?.nextProfile) {
				setProfile(err.nextProfile);
			}
			console.error('[useMedicalProfile] Update failed:', err);
			const errorMessage = err?.message || "Failed to update medical profile";
			setError(errorMessage);
			if (err instanceof Error) {
				throw err;
			}
			const wrappedError = new Error(errorMessage);
			if (err?.localSaved) wrappedError.localSaved = true;
			if (err?.nextProfile) wrappedError.nextProfile = err.nextProfile;
			throw wrappedError;
		} finally {
			setIsSaving(false);
		}
	}, []);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	return {
		profile,
		isLoading,
		isSaving,
		error,
		refreshProfile: fetchProfile,
		updateProfile,
	};
}
