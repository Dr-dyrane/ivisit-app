/**
 * Database Storage Keys
 *
 * All AsyncStorage keys used by the app.
 * Uses @ivisit_ prefix for namespace isolation.
 *
 * IMPORTANT: Never use raw strings for storage keys!
 * Always import from this file.
 */

const DB_PREFIX = "@ivisit_";

/**
 * All storage keys used by the application
 */
export const StorageKeys = {
	// ============================================
	// AUTH & USER
	// ============================================
	/** Array of all registered users */
	USERS: `${DB_PREFIX}users`,

	/** Currently logged in user object */
	CURRENT_USER: `${DB_PREFIX}current_user`,

	/** JWT or session token */
	AUTH_TOKEN: `${DB_PREFIX}auth_token`,

	/** Pending registration data (for incomplete signups) */
	PENDING_REGISTRATION: `${DB_PREFIX}pending_registration`,

	/** Pending OTP for verification (mock - dev only) */
	PENDING_OTP: `${DB_PREFIX}pending_otp`,

	/** Password reset tokens */
	RESET_TOKENS: `${DB_PREFIX}reset_tokens`,

	// ============================================
	// IMAGES & MEDIA
	// ============================================
	/** Stored images (base64 or URIs) */
	IMAGES: `${DB_PREFIX}images`,

	/** Profile image key mapping */
	PROFILE_IMAGES: `${DB_PREFIX}profile_images`,

	// ============================================
	// HEALTHCARE DATA
	// ============================================
	/** Hospital/facility data */
	HOSPITALS: `${DB_PREFIX}hospitals`,

	/** User visits/appointments */
	VISITS: `${DB_PREFIX}visits`,

	/** Emergency contacts */
	EMERGENCY_CONTACTS: `${DB_PREFIX}emergency_contacts`,

	/** Emergency request data */
	EMERGENCY_REQUESTS: `${DB_PREFIX}emergency_requests`,

	MEDICAL_PROFILE: `${DB_PREFIX}medical_profile`,

	// ============================================
	// NOTIFICATIONS & PREFERENCES
	// ============================================
	/** User notifications */
	NOTIFICATIONS: `${DB_PREFIX}notifications`,

	/** App preferences/settings */
	PREFERENCES: `${DB_PREFIX}preferences`,

	/** Theme preference */
	THEME: `${DB_PREFIX}theme`,

	PROFILE_COMPLETION_DRAFT: `${DB_PREFIX}profile_completion_draft`,
};

/**
 * Keys that store arrays (collections)
 * Used for validation in CRUD operations
 */
export const CollectionKeys = [
	StorageKeys.USERS,
	StorageKeys.HOSPITALS,
	StorageKeys.VISITS,
	StorageKeys.EMERGENCY_CONTACTS,
	StorageKeys.NOTIFICATIONS,
	StorageKeys.IMAGES,
	StorageKeys.RESET_TOKENS,
	StorageKeys.EMERGENCY_REQUESTS,
];

/**
 * Keys that store single objects
 */
export const SingletonKeys = [
	StorageKeys.CURRENT_USER,
	StorageKeys.AUTH_TOKEN,
	StorageKeys.PENDING_REGISTRATION,
	StorageKeys.PENDING_OTP,
	StorageKeys.MEDICAL_PROFILE,
	StorageKeys.PREFERENCES,
	StorageKeys.THEME,
	StorageKeys.PROFILE_COMPLETION_DRAFT,
];

/**
 * Database prefix for external use
 */
export const DB_PREFIX_VALUE = DB_PREFIX;

/**
 * Validate if a key is a valid storage key
 * @param {string} key
 * @returns {boolean}
 */
export const isValidKey = (key) => {
	return Object.values(StorageKeys).includes(key);
};

/**
 * Validate if a key is a collection (array) key
 * @param {string} key
 * @returns {boolean}
 */
export const isCollectionKey = (key) => {
	return CollectionKeys.includes(key);
};

/**
 * Validate if a key is a singleton (object) key
 * @param {string} key
 * @returns {boolean}
 */
export const isSingletonKey = (key) => {
	return SingletonKeys.includes(key);
};
