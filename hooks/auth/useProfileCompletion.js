import { useState, useCallback } from "react";
import { profileCompletionService } from "../../services/profileCompletionService";

export function useProfileCompletion() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const getDraft = useCallback(async () => {
		try {
			return await profileCompletionService.getDraft();
		} catch (err) {
			console.error("Failed to get profile draft", err);
			return null;
		}
	}, []);

	const saveDraft = useCallback(async (draft) => {
		try {
			return await profileCompletionService.saveDraft(draft);
		} catch (err) {
			console.error("Failed to save profile draft", err);
		}
	}, []);

	const clearDraft = useCallback(async () => {
		try {
			await profileCompletionService.clearDraft();
		} catch (err) {
			console.error("Failed to clear profile draft", err);
		}
	}, []);

	return {
		getDraft,
		saveDraft,
		clearDraft,
		isLoading,
		error,
	};
}
