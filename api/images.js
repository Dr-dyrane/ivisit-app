/**
 * Images API Layer
 *
 * Thin wrapper around imageService for API-like interface.
 * This layer exists to:
 * 1. Maintain consistent API function naming
 * 2. Enable easy migration to real backend (Supabase Storage)
 * 3. Add any API-level transformations if needed
 *
 * Uses: services/imageService.js (NOT store/imageStore.js)
 */

import { imageService } from "../services";

// ============================================
// IMAGE API FUNCTIONS
// ============================================

/**
 * Upload an image and get a unique key
 * @param {string} imageUri - The image URI to store
 * @returns {Promise<string>} The unique image key
 */
export const uploadImageAPI = async (imageUri) => {
	return await imageService.uploadImage(imageUri);
};

/**
 * Get an image by its key
 * @param {string} imageKey - The image key
 * @returns {Promise<string>} The image URI
 */
export const getImageAPI = async (imageKey) => {
	return await imageService.getImage(imageKey);
};

/**
 * Delete an image by its key
 * @param {string} imageKey - The image key
 * @returns {Promise<boolean>}
 */
export const deleteImageAPI = async (imageKey) => {
	return await imageService.deleteImage(imageKey);
};

/**
 * Get all stored images
 * @returns {Promise<Object>} Object with image keys and data
 */
export const getAllImagesAPI = async () => {
	return await imageService.getAllImages();
};

/**
 * Clear all stored images
 * @returns {Promise<boolean>}
 */
export const clearAllImagesAPI = async () => {
	return await imageService.clearAllImages();
};

