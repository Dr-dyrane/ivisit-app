import { profileCompletionService } from "../services/profileCompletionService";

export const getProfileCompletionDraftAPI = async () => {
	return await profileCompletionService.getDraft();
};

export const saveProfileCompletionDraftAPI = async (draft) => {
	return await profileCompletionService.saveDraft(draft);
};

export const clearProfileCompletionDraftAPI = async () => {
	return await profileCompletionService.clearDraft();
};

