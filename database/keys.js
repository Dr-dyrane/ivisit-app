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

	/** Public route to restore on startup/reload */
	LAST_PUBLIC_ROUTE: `${DB_PREFIX}last_public_route`,

	/** Explicit auth return target for OAuth / redirect-based auth */
	AUTH_RETURN_ROUTE: `${DB_PREFIX}auth_return_route`,

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
	DEMO_VISITS: `${DB_PREFIX}demo_visits`,

	/** Emergency contacts */
	EMERGENCY_CONTACTS: `${DB_PREFIX}emergency_contacts`,

	/** Emergency request data */
	EMERGENCY_REQUESTS: `${DB_PREFIX}emergency_requests`,

	MEDICAL_PROFILE: `${DB_PREFIX}medical_profile`,

	EMERGENCY_STATE: `${DB_PREFIX}emergency_state`,

	/** Mode preferences (emergency/booking, service type) — Phase 6a */
	MODE_PREFERENCES: `${DB_PREFIX}mode_preferences`,

	/** Coverage mode preference (demo/live) — Phase 6b */
	COVERAGE_PREFERENCES: `${DB_PREFIX}coverage_preferences`,

	/** Last known user location cache — Phase 6b */
	LOCATION_CACHE: `${DB_PREFIX}location_cache`,

	/** Insurance policies */
	INSURANCE_POLICIES: `${DB_PREFIX}insurance_policies`,

	// ============================================
	// PAYMENT SYSTEM
	// ============================================
	/** Payment methods */
	PAYMENT_METHODS: `${DB_PREFIX}payment_methods`,

	/** Payment history */
	PAYMENT_HISTORY: `${DB_PREFIX}payment_history`,

	/** Current payment transaction */
	CURRENT_PAYMENT: `${DB_PREFIX}current_payment`,

	/** Payment preferences */
	PAYMENT_PREFERENCES: `${DB_PREFIX}payment_preferences`,

	/** Default payment method choice */
	DEFAULT_PAYMENT_METHOD: `${DB_PREFIX}default_payment_method`,

	// ============================================
	// NOTIFICATIONS & PREFERENCES
	// ============================================
	/** User notifications */
	NOTIFICATIONS: `${DB_PREFIX}notifications`,
	DEMO_NOTIFICATIONS: `${DB_PREFIX}demo_notifications`,

	SEARCH_HISTORY: `${DB_PREFIX}search_history`,

	/** App preferences/settings */
	PREFERENCES: `${DB_PREFIX}preferences`,

	/** Theme preference */
	THEME: `${DB_PREFIX}theme`,

	PROFILE_COMPLETION_DRAFT: `${DB_PREFIX}profile_completion_draft`,
	PROFILE_COMPLETION_DEFERRED: `${DB_PREFIX}profile_completion_deferred`,
	CONTACT_INPUT_MEMORY: `${DB_PREFIX}contact_input_memory`,
	TRACKING_RATING_RECOVERY: `${DB_PREFIX}tracking_rating_recovery`,

	/** Tracking visualization state — Phase 8 (status phase, progress, animation flag, in-flow rating) */
	TRACKING_VISUALIZATION: `${DB_PREFIX}tracking_visualization`,

	MIGRATION_VERSION: `${DB_PREFIX}migration_version`,
};

/**
 * Keys that store arrays (collections)
 * Used for validation in CRUD operations
 */
export const CollectionKeys = [
	StorageKeys.USERS,
	StorageKeys.HOSPITALS,
	StorageKeys.VISITS,
	StorageKeys.DEMO_VISITS,
	StorageKeys.EMERGENCY_CONTACTS,
	StorageKeys.NOTIFICATIONS,
	StorageKeys.DEMO_NOTIFICATIONS,
	StorageKeys.SEARCH_HISTORY,
	// StorageKeys.IMAGES, // Managed as a Map/Object, not an Array
	StorageKeys.RESET_TOKENS,
	StorageKeys.EMERGENCY_REQUESTS,
	StorageKeys.INSURANCE_POLICIES,
	StorageKeys.PAYMENT_METHODS,
	StorageKeys.PAYMENT_HISTORY,
];

/**
 * Keys that store single objects
 */
export const SingletonKeys = [
	StorageKeys.CURRENT_USER,
	StorageKeys.AUTH_TOKEN,
	StorageKeys.PENDING_REGISTRATION,
	StorageKeys.PENDING_OTP,
	StorageKeys.LAST_PUBLIC_ROUTE,
	StorageKeys.AUTH_RETURN_ROUTE,
	StorageKeys.MEDICAL_PROFILE,
	StorageKeys.EMERGENCY_STATE,
	StorageKeys.MODE_PREFERENCES,
	StorageKeys.COVERAGE_PREFERENCES,
	StorageKeys.LOCATION_CACHE,
	StorageKeys.CURRENT_PAYMENT,
	StorageKeys.PAYMENT_PREFERENCES,
	StorageKeys.DEFAULT_PAYMENT_METHOD,
	StorageKeys.PREFERENCES,
	StorageKeys.THEME,
	StorageKeys.PROFILE_COMPLETION_DRAFT,
	StorageKeys.PROFILE_COMPLETION_DEFERRED,
	StorageKeys.CONTACT_INPUT_MEMORY,
	StorageKeys.TRACKING_RATING_RECOVERY,
	StorageKeys.TRACKING_VISUALIZATION,
	StorageKeys.MIGRATION_VERSION,
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
