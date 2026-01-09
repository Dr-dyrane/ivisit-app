import { preferencesService } from "../services/preferencesService";

export const getPreferencesAPI = async () => {
	return await preferencesService.getPreferences();
};

export const updatePreferencesAPI = async (updates) => {
	return await preferencesService.updatePreferences(updates);
};

export const resetPreferencesAPI = async () => {
	return await preferencesService.resetPreferences();
};

