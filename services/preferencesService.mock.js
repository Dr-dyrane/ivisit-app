import { database, StorageKeys } from "../database";

const DEFAULT_PREFERENCES = {
	demoModeEnabled: true,
	notificationsEnabled: true,
	appointmentReminders: true,
	emergencyUpdates: true,
	privacyShareMedicalProfile: false,
	privacyShareEmergencyContacts: false,
};

export const preferencesService = {
	async get() {
		return this.getPreferences();
	},

	async getPreferences() {
		const stored = await database.read(StorageKeys.PREFERENCES, null);
		if (!stored || typeof stored !== "object") return { ...DEFAULT_PREFERENCES };
		return { ...DEFAULT_PREFERENCES, ...stored };
	},

	async updatePreferences(updates) {
		const current = await this.getPreferences();
		const next =
			updates && typeof updates === "object" ? { ...current, ...updates } : current;
		await database.write(StorageKeys.PREFERENCES, next);
		return next;
	},

	async update(updates) {
		return this.updatePreferences(updates);
	},

	async resetPreferences() {
		await database.write(StorageKeys.PREFERENCES, { ...DEFAULT_PREFERENCES });
		return { ...DEFAULT_PREFERENCES };
	},

	async reset() {
		return this.resetPreferences();
	},
};

