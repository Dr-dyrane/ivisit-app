import { database, StorageKeys } from "../database";

const DEFAULT_STATE = {
	mode: "emergency",
	activeAmbulanceTrip: null,
	activeBedBooking: null,
};

export const emergencyStateService = {
	async get() {
		const stored = await database.read(StorageKeys.EMERGENCY_STATE, null);
		if (!stored || typeof stored !== "object") return { ...DEFAULT_STATE };
		return { ...DEFAULT_STATE, ...stored };
	},

	async set(next) {
		const current = await this.get();
		const merged = next && typeof next === "object" ? { ...current, ...next } : current;
		await database.write(StorageKeys.EMERGENCY_STATE, merged);
		return merged;
	},

	async clear() {
		await database.write(StorageKeys.EMERGENCY_STATE, { ...DEFAULT_STATE });
		return { ...DEFAULT_STATE };
	},
};

