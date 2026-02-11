import AsyncStorage from "@react-native-async-storage/async-storage";
import { isValidKey } from "./keys";
import { DatabaseError, ErrorCodes, DB_TIMEOUT } from "./dbTypes";

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise}
 */
export const withTimeout = (promise, ms = DB_TIMEOUT) => {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(
				() =>
					reject(new DatabaseError("Database operation timeout", ErrorCodes.TIMEOUT)),
				ms
			)
		),
	]);
};

export const dbCore = {
	/**
	 * Validates that a key exists in StorageKeys
	 * @param {string} key
	 * @throws {DatabaseError} If key is invalid
	 */
	_validateKey(key) {
		if (!isValidKey(key)) {
			throw new DatabaseError(`Invalid storage key: ${key}`, ErrorCodes.INVALID_KEY);
		}
	},

	/**
	 * Read a value from storage
	 * @param {string} key - Storage key from StorageKeys
	 * @param {*} defaultValue - Value to return if key doesn't exist
	 * @returns {Promise<*>} The stored value or defaultValue
	 */
	async read(key, defaultValue = null) {
		this._validateKey(key);
		try {
			const value = await withTimeout(AsyncStorage.getItem(key));
			if (value === null) return defaultValue;
			return JSON.parse(value);
		} catch (error) {
			if (error instanceof DatabaseError) throw error;
			throw new DatabaseError(`Failed to read ${key}`, ErrorCodes.READ_ERROR, error);
		}
	},

	/**
	 * Write a value to storage
	 * @param {string} key - Storage key from StorageKeys
	 * @param {*} value - Value to store (will be JSON stringified)
	 * @returns {Promise<*>} The written value
	 */
	async write(key, value) {
		this._validateKey(key);
		try {
			await withTimeout(AsyncStorage.setItem(key, JSON.stringify(value)));
			return value;
		} catch (error) {
			if (error instanceof DatabaseError) throw error;
			throw new DatabaseError(`Failed to write ${key}`, ErrorCodes.WRITE_ERROR, error);
		}
	},

	/**
	 * Delete a key from storage
	 * @param {string} key - Storage key from StorageKeys
	 * @returns {Promise<boolean>} True if successful
	 */
	async delete(key) {
		this._validateKey(key);
		try {
			await withTimeout(AsyncStorage.removeItem(key));
			return true;
		} catch (error) {
			if (error instanceof DatabaseError) throw error;
			throw new DatabaseError(`Failed to delete ${key}`, ErrorCodes.DELETE_ERROR, error);
		}
	},

	/**
	 * Check if a key exists in storage
	 * @param {string} key - Storage key from StorageKeys
	 * @returns {Promise<boolean>}
	 */
	async exists(key) {
		this._validateKey(key);
		try {
			const value = await withTimeout(AsyncStorage.getItem(key));
			return value !== null;
		} catch (error) {
			if (error instanceof DatabaseError) throw error;
			throw new DatabaseError(`Failed to check ${key}`, ErrorCodes.READ_ERROR, error);
		}
	},
};
