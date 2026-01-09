import { emergencyContactsService } from "../services/emergencyContactsService";

export const listEmergencyContactsAPI = async () => {
	return await emergencyContactsService.list();
};

export const createEmergencyContactAPI = async (contact) => {
	return await emergencyContactsService.create(contact);
};

export const updateEmergencyContactAPI = async (id, updates) => {
	return await emergencyContactsService.update(id, updates);
};

export const deleteEmergencyContactAPI = async (id) => {
	return await emergencyContactsService.remove(id);
};

