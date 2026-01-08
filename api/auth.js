/**
 * Authentication API Layer
 *
 * Thin wrapper around authService for API-like interface.
 * This layer exists to:
 * 1. Maintain consistent API function naming
 * 2. Enable easy migration to real backend (Supabase)
 * 3. Add any API-level transformations if needed
 *
 * Uses: services/authService.js (NOT store/userStore.js)
 */

import { authService } from "../services";

// ============================================
// AUTH API FUNCTIONS
// ============================================

/**
 * Login a user
 * @param {Object} credentials - { email?, phone?, password?, otp? }
 * @returns {Promise<{ data: Object }>}
 */
export const loginUserAPI = async (credentials) => {
	return await authService.login(credentials);
};

/**
 * Sign up a new user
 * @param {Object} credentials - { username, email?, phone?, password?, firstName?, lastName?, etc. }
 * @returns {Promise<{ data: Object }>}
 */
export const signUpUserAPI = async (credentials) => {
	return await authService.signUp(credentials);
};

/**
 * Update current user data
 * @param {Object} newData - Data to update
 * @returns {Promise<{ data: Object }>}
 */
export const updateUserAPI = async (newData) => {
	return await authService.updateUser(newData);
};

/**
 * Delete current user's account
 * @returns {Promise<boolean>}
 */
export const deleteUserAPI = async () => {
	return await authService.deleteUser();
};

/**
 * Get current logged in user
 * @returns {Promise<{ data: Object }>}
 */
export const getCurrentUserAPI = async () => {
	return await authService.getCurrentUser();
};

/**
 * Initiate forgot password flow
 * @param {string} email
 * @returns {Promise<{ message: string, resetToken: string }>}
 */
export const forgotPasswordAPI = async (email) => {
	return await authService.forgotPassword(email);
};

/**
 * Reset password using token
 * @param {string} resetToken
 * @param {string} newPassword
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export const resetPasswordAPI = async (resetToken, newPassword, email) => {
	return await authService.resetPassword({ resetToken, newPassword, email });
};

/**
 * Check if user exists by email or phone
 * @param {Object} credentials - { email?, phone? }
 * @returns {Promise<{ exists: boolean, hasPassword: boolean, ... }>}
 */
export const checkUserExistsAPI = async (credentials) => {
	return await authService.checkUserExists(credentials);
};

/**
 * Set password for existing user
 * @param {Object} credentials - { email?, phone?, password }
 * @returns {Promise<{ data: Object }>}
 */
export const setPasswordAPI = async (credentials) => {
	return await authService.setPassword(credentials);
};

/**
 * Logout current user
 * @returns {Promise<boolean>}
 */
export const logoutAPI = async () => {
	return await authService.logout();
};

// ============================================
// PENDING REGISTRATION HELPERS
// ============================================

/**
 * Get and clear pending registration data
 * @returns {Promise<Object|null>}
 */
export const getPendingRegistrationAPI = async () => {
	try {
		const pendingData = await authService.getPendingRegistration();
		if (pendingData) {
			await authService.clearPendingRegistration();
			return pendingData;
		}
		return null;
	} catch (error) {
		console.error("Get pending registration error:", error);
		return null;
	}
};

/**
 * Save pending registration data
 * @param {Object} data
 */
export const savePendingRegistrationAPI = async (data) => {
	return await authService.savePendingRegistration(data);
};
