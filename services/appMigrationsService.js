import { database, StorageKeys } from "../database";
import {
	normalizeEmergencyState,
	normalizeNotificationsList,
	normalizeVisitsList,
} from "../utils/domainNormalize";

const CURRENT_MIGRATION_VERSION = 1;

export const appMigrationsService = {
	async run() {
		const stored = await database.read(StorageKeys.MIGRATION_VERSION, 0);
		const current = Number.isFinite(stored) ? stored : Number(stored) || 0;
		if (current >= CURRENT_MIGRATION_VERSION) return { version: current };

		const visits = await database.read(StorageKeys.VISITS, null);
		if (Array.isArray(visits)) {
			const normalized = normalizeVisitsList(visits);
			await database.write(StorageKeys.VISITS, normalized);
		}

		const notifications = await database.read(StorageKeys.NOTIFICATIONS, null);
		if (Array.isArray(notifications)) {
			const normalized = normalizeNotificationsList(notifications);
			await database.write(StorageKeys.NOTIFICATIONS, normalized);
		}

		const emergencyState = await database.read(StorageKeys.EMERGENCY_STATE, null);
		if (emergencyState && typeof emergencyState === "object") {
			const normalized = normalizeEmergencyState(emergencyState);
			await database.write(StorageKeys.EMERGENCY_STATE, normalized);
		}

		await database.write(StorageKeys.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
		return { version: CURRENT_MIGRATION_VERSION };
	},
};

