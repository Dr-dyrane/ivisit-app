import { DatabaseError, ErrorCodes } from "./dbTypes";
import { dbCore } from "./dbCore";

export const dbCollections = {
	/**
	 * Query items from a collection with a filter predicate
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Filter function (item) => boolean
	 * @returns {Promise<Array>} Filtered items
	 */
	async query(key, predicate) {
		const items = await dbCore.read(key, []);
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
		const items = await dbCore.read(key, []);
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
		const items = await dbCore.read(key, []);
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

		await dbCore.write(key, updatedItems);
		return updatedItems[index];
	},

	/**
	 * Add a new item to a collection
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Object} item - Item to add
	 * @returns {Promise<*>} The added item
	 */
	async createOne(key, item) {
		const items = await dbCore.read(key, []);
		if (!Array.isArray(items)) {
			throw new DatabaseError(
				`Expected array at ${key}`,
				ErrorCodes.INVALID_TYPE
			);
		}

		const newItems = [...items, item];
		await dbCore.write(key, newItems);
		return item;
	},

	/**
	 * Delete a single item from a collection
	 * @param {string} key - Storage key (must be a collection)
	 * @param {Function} predicate - Find function (item) => boolean
	 * @returns {Promise<boolean>} True if item was deleted
	 */
	async deleteOne(key, predicate) {
		const items = await dbCore.read(key, []);
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

		await dbCore.write(key, filtered);
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
		const items = await dbCore.read(key, []);
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
			await dbCore.write(key, newItems);
			return { item, created: true };
		} else {
			// Update
			const updatedItems = [...items];
			updatedItems[index] = { ...updatedItems[index], ...item };
			await dbCore.write(key, updatedItems);
			return { item: updatedItems[index], created: false };
		}
	},
};
