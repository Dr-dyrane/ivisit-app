/**
 * API Client Configuration
 *
 * This file will be the central point for backend API configuration.
 * Currently set up for local AsyncStorage, but designed for easy
 * migration to Supabase or other backends.
 *
 * FUTURE: When migrating to Supabase, update this file with:
 * - Supabase client initialization
 * - API base URL configuration
 * - Authentication headers
 * - Request/response interceptors
 */

// ============================================
// CONFIGURATION
// ============================================

/**
 * API Configuration
 * Update these values when connecting to a real backend
 */
export const API_CONFIG = {
	// Set to true when using a real backend
	USE_REMOTE_BACKEND: false,

	// Base URL for API calls (when using remote backend)
	BASE_URL: "",

	// API version prefix
	API_VERSION: "v1",

	// Request timeout in milliseconds
	TIMEOUT: 30000,
};

// ============================================
// SUPABASE PLACEHOLDER
// ============================================

/**
 * Supabase client placeholder
 *
 * FUTURE: Initialize Supabase client here:
 *
 * import { createClient } from '@supabase/supabase-js'
 *
 * const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
 * const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
 *   auth: {
 *     storage: AsyncStorage,
 *     autoRefreshToken: true,
 *     persistSession: true,
 *     detectSessionInUrl: false,
 *   },
 * })
 */
export const supabase = null;

// ============================================
// STORAGE MODE HELPERS
// ============================================

/**
 * Check if app is using local storage mode
 * @returns {boolean}
 */
export const isLocalMode = () => {
	return !API_CONFIG.USE_REMOTE_BACKEND;
};

/**
 * Check if app is using remote backend
 * @returns {boolean}
 */
export const isRemoteMode = () => {
	return API_CONFIG.USE_REMOTE_BACKEND;
};

// ============================================
// API HELPER FUNCTIONS (for future use)
// ============================================

/**
 * Build full API URL
 * @param {string} endpoint
 * @returns {string}
 */
export const buildUrl = (endpoint) => {
	if (isLocalMode()) {
		console.warn("buildUrl called in local mode - no remote API configured");
		return endpoint;
	}
	return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}${endpoint}`;
};

/**
 * Generic fetch wrapper with error handling
 * FUTURE: Use this for API calls when backend is ready
 *
 * @param {string} endpoint
 * @param {Object} options - fetch options
 * @returns {Promise<Object>}
 */
export const apiRequest = async (endpoint, options = {}) => {
	if (isLocalMode()) {
		throw new Error("API requests not available in local mode");
	}

	const url = buildUrl(endpoint);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(error.message || `HTTP error ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		clearTimeout(timeout);
		if (error.name === "AbortError") {
			throw new Error("Request timeout");
		}
		throw error;
	}
};

