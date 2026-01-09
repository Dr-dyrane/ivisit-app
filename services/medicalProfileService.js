import { database, StorageKeys } from "../database";

const DEFAULT_MEDICAL_PROFILE = {
	bloodType: "",
	allergies: "",
	medications: "",
	conditions: "",
	surgeries: "",
	notes: "",
	updatedAt: null,
};

export const medicalProfileService = {
	async get() {
		const stored = await database.read(StorageKeys.MEDICAL_PROFILE, null);
		if (!stored || typeof stored !== "object") return { ...DEFAULT_MEDICAL_PROFILE };
		return { ...DEFAULT_MEDICAL_PROFILE, ...stored };
	},

	async update(updates) {
		const current = await this.get();
		const next =
			updates && typeof updates === "object"
				? { ...current, ...updates, updatedAt: new Date().toISOString() }
				: { ...current, updatedAt: new Date().toISOString() };
		await database.write(StorageKeys.MEDICAL_PROFILE, next);
		return next;
	},

	async reset() {
		const next = { ...DEFAULT_MEDICAL_PROFILE, updatedAt: new Date().toISOString() };
		await database.write(StorageKeys.MEDICAL_PROFILE, next);
		return next;
	},
};

