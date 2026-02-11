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

import { StorageKeys } from "./keys";
import { DatabaseError, ErrorCodes } from "./dbTypes";
import { dbCore } from "./dbCore";
import { dbCollections } from "./dbCollections";
import { dbUtils } from "./dbUtils";

/**
 * Database abstraction layer
 */
const database = {
    // Basic CRUD
    ...dbCore,

    // Collection Operations
    ...dbCollections,

    // Utility Operations
    ...dbUtils,
};

export { database, StorageKeys, DatabaseError, ErrorCodes };
