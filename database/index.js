/**
 * Database Module - Main Export
 *
 * This is the main entry point for all database operations.
 *
 * Usage:
 *   import { database, StorageKeys } from '../database';
 *
 *   // Read current user
 *   const user = await database.read(StorageKeys.CURRENT_USER);
 *
 *   // Write auth token
 *   await database.write(StorageKeys.AUTH_TOKEN, token);
 *
 *   // Find user by email
 *   const user = await database.findOne(
 *     StorageKeys.USERS,
 *     (u) => u.email === email
 *   );
 */

// Main database operations
export { database, StorageKeys, DatabaseError, ErrorCodes } from "./db";

// Key utilities
export {
	isValidKey,
	isCollectionKey,
	isSingletonKey,
	CollectionKeys,
	SingletonKeys,
	DB_PREFIX_VALUE,
} from "./keys";

