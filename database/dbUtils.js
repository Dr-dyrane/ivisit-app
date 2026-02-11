import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys } from "./keys";
import { DatabaseError, ErrorCodes } from "./dbTypes";
import { withTimeout } from "./dbCore";

export const dbUtils = {
	/**
	 * Clear all iVisit data from storage
	 * @returns {Promise<boolean>}
	 */
	async clear() {
		try {
			const keys = Object.values(StorageKeys);
			await withTimeout(AsyncStorage.multiRemove(keys));
			return true;
		} catch (error) {
			if (error instanceof DatabaseError) throw error;
			throw new DatabaseError(
				"Failed to clear database",
				ErrorCodes.CLEAR_ERROR,
				error
			);
		}
	},

	/**
	 * Get storage statistics for debugging
	 * @returns {Promise<Array<{key: string, size: string}>>}
	 */
	async stats() {
		try {
			const allKeys = Object.values(StorageKeys);
			const sizes = await Promise.all(
				allKeys.map(async (key) => {
					const value = await AsyncStorage.getItem(key);
					const sizeBytes = value ? new TextEncoder().encode(value).length : 0;
					return {
						key: key.replace("@ivisit_", ""),
						size: sizeBytes > 1024
							? `${(sizeBytes / 1024).toFixed(2)} KB`
							: `${sizeBytes} B`,
						exists: value !== null,
					};
				})
			);
			return sizes;
		} catch (error) {
			throw new DatabaseError("Failed to get stats", ErrorCodes.STATS_ERROR, error);
		}
	},

	/**
	 * Get all keys that have data
	 * @returns {Promise<string[]>}
	 */
	async getActiveKeys() {
		try {
			const allKeys = Object.values(StorageKeys);
			const results = await Promise.all(
				allKeys.map(async (key) => {
					const value = await AsyncStorage.getItem(key);
					return value !== null ? key : null;
				})
			);
			return results.filter(Boolean);
		} catch (error) {
			throw new DatabaseError(
				"Failed to get active keys",
				ErrorCodes.READ_ERROR,
				error
			);
		}
	},
};
