import { emergencyRequestsService } from "../services/emergencyRequestsService";

export const listEmergencyRequestsAPI = async () => {
	return await emergencyRequestsService.list();
};

export const createEmergencyRequestAPI = async (request) => {
	return await emergencyRequestsService.create(request);
};

export const updateEmergencyRequestAPI = async (id, updates) => {
	return await emergencyRequestsService.update(id, updates);
};

export const setEmergencyRequestStatusAPI = async (id, status) => {
	return await emergencyRequestsService.setStatus(id, status);
};

export const getActiveEmergencyRequestAPI = async () => {
	return await emergencyRequestsService.getActive();
};

