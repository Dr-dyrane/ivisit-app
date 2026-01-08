/**
 * Database Module - AsyncStorage Abstraction Layer
 *
 * Provides a consistent interface for all storage operations.
 * All storage access in the app should go through this module.
 *
 * Features:
 * - Structured CRUD operations
 * - Error handling with custom DatabaseError
 * - Timeout protection
 * - Collection operations (query, findOne, updateOne, etc.)
 * - Key validation
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys, isValidKey, isCollectionKey } from "./keys";

/** Default timeout for database operations (ms) */
const DB_TIMEOUT = 5000;

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
	constructor(message, code, originalError = null) {
		super(message);
		this.name = "DatabaseError";
		this.code = code;
		this.originalError = originalError;
	}
}

/**
 * Error codes for database operations
 */
export const ErrorCodes = {
	TIMEOUT: "TIMEOUT",
	INVALID_KEY: "INVALID_KEY",
	INVALID_TYPE: "INVALID_TYPE",
	READ_ERROR: "READ_ERROR",
	WRITE_ERROR: "WRITE_ERROR",
	DELETE_ERROR: "DELETE_ERROR",
	NOT_FOUND: "NOT_FOUND",
	CLEAR_ERROR: "CLEAR_ERROR",
	STATS_ERROR: "STATS_ERROR",
};

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise}
 */
const withTimeout = (promise, ms = DB_TIMEOUT) => {
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

/**
 * Database abstraction layer
 */
const database = {
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

	// ============================================
	// BASIC CRUD OPERATIONS
	// ============================================

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

	// ============================================
	// COLLECTION OPERATIONS (for array-based keys)
	// ============================================

	/**
	 * Query items from a collection with a filter predicate
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Filter function (item) => boolean
	 * @returns {Promise<Array>} Filtered items
	 */
	async query(key, predicate) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}, got ${typeof items}`,
				ErrorCodes.INVALID_TYPE
			);
		}
		return items.filter(predicate);
	},

	/**
	 * Find a single item in a collection
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Filter function (item) => boolean
	 * @returns {Promise<*|null>} The found item or null
	 */
	async findOne(key, predicate) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}, got ${typeof items}`,
				ErrorCodes.INVALID_TYPE
			);
		}
		return items.find(predicate) || null;
	},

	/**
	 * Update a single item in a collection (immutable operation)
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Find function (item) => boolean
	 * @param {Object} updates - Properties to update
	 * @returns {Promise<*>} The updated item
	 */
	async updateOne(key, predicate, updates) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}`,
				ErrorCodes.INVALID_TYPE
			);
		}

		const index = items.findIndex(predicate);
		if (index === -1) {
			throw new DatabaseError("Item not found", ErrorCodes.NOT_FOUND);
		}

		const updatedItems = [...items];
		updatedItems[index] = { ...updatedItems[index], ...updates };

		await this.write(key, updatedItems);
		return updatedItems[index];
	},

	/**
	 * Add a new item to a collection
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Object} item - Item to add
	 * @returns {Promise<*>} The added item
	 */
	async createOne(key, item) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}`,
				ErrorCodes.INVALID_TYPE
			);
		}

		const newItems = [...items, item];
		await this.write(key, newItems);
		return item;
	},

	/**
	 * Delete a single item from a collection
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Find function (item) => boolean
	 * @returns {Promise<boolean>} True if item was deleted
	 */
	async deleteOne(key, predicate) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}`,
				ErrorCodes.INVALID_TYPE
			);
		}

		const filtered = items.filter((item) => !predicate(item));
		if (filtered.length === items.length) {
			throw new DatabaseError("Item not found", ErrorCodes.NOT_FOUND);
		}

		await this.write(key, filtered);
		return true;
	},

	/**
	 * Upsert - Update if exists, create if not
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Find function (item) => boolean
	 * @param {Object} item - Full item data
	 * @returns {Promise<{item: *, created: boolean}>}
	 */
	async upsertOne(key, predicate, item) {
		const items = await this.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}`,
				ErrorCodes.INVALID_TYPE
			);
		}

		const index = items.findIndex(predicate);
		if (index === -1) {
			// Create
			const newItems = [...items, item];
			await this.write(key, newItems);
			return { item, created: true };
		} else {
			// Update
			const updatedItems = [...items];
			updatedItems[index] = { ...updatedItems[index], ...item };
			await this.write(key, updatedItems);
			return { item: updatedItems[index], created: false };
		}
	},

	// ============================================
	// UTILITY OPERATIONS
	// ============================================

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

export { database, StorageKeys };

