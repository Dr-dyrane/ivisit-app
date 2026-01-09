import { medicalProfileService } from "../services/medicalProfileService";

export const getMedicalProfileAPI = async () => {
	return await medicalProfileService.get();
};

export const updateMedicalProfileAPI = async (updates) => {
	return await medicalProfileService.update(updates);
};

export const resetMedicalProfileAPI = async () => {
	return await medicalProfileService.reset();
};

