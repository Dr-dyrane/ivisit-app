/**
 * Database Module - AsyncStorage Abstraction Layer
 * 
 * Treats AsyncStorage like a real database with:
 * - Structured CRUD operations
 * - Error handling & validation
 * - Type safety
 * - Querying capabilities
 * - Transactions (atomic operations)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_PREFIX = '@ivisit_';
const DB_TIMEOUT = 5000;

const StorageKeys = {
  USERS: `${DB_PREFIX}users`,
  CURRENT_USER: `${DB_PREFIX}current_user`,
  AUTH_TOKEN: `${DB_PREFIX}auth_token`,
  HOSPITALS: `${DB_PREFIX}hospitals`,
  VISITS: `${DB_PREFIX}visits`,
  EMERGENCY_CONTACTS: `${DB_PREFIX}emergency_contacts`,
  NOTIFICATIONS: `${DB_PREFIX}notifications`,
};

class DatabaseError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

const withTimeout = (promise, ms = DB_TIMEOUT) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new DatabaseError('Database timeout', 'TIMEOUT')), ms)
    ),
  ]);
};

const database = {
  /**
   * Validates key exists in StorageKeys
   */
  _validateKey(key) {
    if (!Object.values(StorageKeys).includes(key)) {
      throw new DatabaseError(`Invalid storage key: ${key}`, 'INVALID_KEY');
    }
  },

  /**
   * Generic read operation
   */
  async read(key, defaultValue = null) {
    this._validateKey(key);
    try {
      const value = await withTimeout(AsyncStorage.getItem(key));
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to read ${key}`, 'READ_ERROR', error);
    }
  },

  /**
   * Generic write operation
   */
  async write(key, value) {
    this._validateKey(key);
    try {
      await withTimeout(AsyncStorage.setItem(key, JSON.stringify(value)));
      return value;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to write ${key}`, 'WRITE_ERROR', error);
    }
  },

  /**
   * Generic delete operation
   */
  async delete(key) {
    this._validateKey(key);
    try {
      await withTimeout(AsyncStorage.removeItem(key));
      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to delete ${key}`, 'DELETE_ERROR', error);
    }
  },

  /**
   * Query operation with filtering
   * @param {string} key - Storage key
   * @param {Function} predicate - Filter function
   * @returns {Array} Filtered results
   */
  async query(key, predicate) {
    const items = await this.read(key, []);
    if (!Array.isArray(items)) {
      throw new DatabaseError(`Expected array at ${key}`, 'INVALID_TYPE');
    }
    return items.filter(predicate);
  },

  /**
   * Find single item in collection
   */
  async findOne(key, predicate) {
    const items = await this.query(key, predicate);
    return items[0] || null;
  },

  /**
   * Update item in collection (immutable)
   */
  async updateOne(key, predicate, updates) {
    const items = await this.read(key, []);
    const index = items.findIndex(predicate);

    if (index === -1) {
      throw new DatabaseError('Item not found', 'NOT_FOUND');
    }

    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };

    await this.write(key, updated);
    return updated[index];
  },

  /**
   * Add item to collection
   */
  async createOne(key, item) {
    const items = await this.read(key, []);
    const newItems = [...items, item];
    await this.write(key, newItems);
    return item;
  },

  /**
   * Delete item from collection
   */
  async deleteOne(key, predicate) {
    const items = await this.read(key, []);
    const filtered = items.filter((item) => !predicate(item));

    if (filtered.length === items.length) {
      throw new DatabaseError('Item not found', 'NOT_FOUND');
    }

    await this.write(key, filtered);
    return true;
  },

  /**
   * Clear all storage (use with caution!)
   */
  async clear() {
    try {
      const keys = Object.values(StorageKeys);
      await withTimeout(AsyncStorage.multiRemove(keys));
      return true;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to clear database', 'CLEAR_ERROR', error);
    }
  },

  /**
   * Get database stats (for debugging)
   */
  async stats() {
    try {
      const allKeys = Object.values(StorageKeys);
      const sizes = await Promise.all(
        allKeys.map(async (key) => {
          const value = await AsyncStorage.getItem(key);
          return {
            key,
            size: value ? (new TextEncoder().encode(value).length / 1024).toFixed(2) + ' KB' : '0 KB',
          };
        })
      );
      return sizes;
    } catch (error) {
      throw new DatabaseError('Failed to get stats', 'STATS_ERROR', error);
    }
  },
};

export { database, StorageKeys, DatabaseError };
