/**
 * Image Service
 *
 * Handles image storage and retrieval operations.
 * Uses database layer for all storage operations.
 *
 * This replaces store/imageStore.js with proper abstraction.
 */

import { database, StorageKeys, DatabaseError } from "../database";

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Create an image service error
 * @param {string} message
 * @returns {Error}
 */
const createImageError = (message) => {
	const error = new Error(message);
	error.name = "ImageServiceError";
	return error;
};

// ============================================
// IMAGE SERVICE METHODS
// ============================================

const imageService = {
	/**
	 * Upload an image and return a unique key
	 * @param {string} imageUri - The image URI to store
	 * @returns {Promise<string>} The unique image key
	 */
	async uploadImage(imageUri) {
		if (!imageUri) {
			throw createImageError("Image URI is required");
		}

		try {
			// Generate unique key using timestamp
			const imageKey = `image_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			// Get existing images or initialize empty object
			let images = await database.read(StorageKeys.IMAGES, {});

			if (typeof images !== "object" || Array.isArray(images)) {
				images = {};
			}

			// Store the image URI with its key
			images[imageKey] = {
				uri: imageUri,
				createdAt: Date.now(),
			};

			await database.write(StorageKeys.IMAGES, images);

			return imageKey;
		} catch (error) {
			if (error instanceof DatabaseError) {
				throw createImageError(`Failed to upload image: ${error.message}`);
			}
			throw error;
		}
	},

	/**
	 * Retrieve an image by its key
	 * @param {string} imageKey - The image key
	 * @returns {Promise<string>} The image URI
	 */
	async getImage(imageKey) {
		if (!imageKey) {
			throw createImageError("Image key is required");
		}

		try {
			const images = await database.read(StorageKeys.IMAGES, {});

			if (typeof images !== "object" || !images[imageKey]) {
				throw createImageError("Image not found");
			}

			// Return just the URI for backward compatibility
			const imageData = images[imageKey];
			return typeof imageData === "object" ? imageData.uri : imageData;
		} catch (error) {
			if (error.name === "ImageServiceError") {
				throw error;
			}
			if (error instanceof DatabaseError) {
				throw createImageError(`Failed to get image: ${error.message}`);
			}
			throw error;
		}
	},

	/**
	 * Delete an image by its key
	 * @param {string} imageKey - The image key
	 * @returns {Promise<boolean>}
	 */
	async deleteImage(imageKey) {
		if (!imageKey) {
			throw createImageError("Image key is required");
		}

		try {
			const images = await database.read(StorageKeys.IMAGES, {});

			if (typeof images !== "object" || !images[imageKey]) {
				throw createImageError("Image not found");
			}

			delete images[imageKey];
			await database.write(StorageKeys.IMAGES, images);

			return true;
		} catch (error) {
			if (error.name === "ImageServiceError") {
				throw error;
			}
			if (error instanceof DatabaseError) {
				throw createImageError(`Failed to delete image: ${error.message}`);
			}
			throw error;
		}
	},

	/**
	 * Get all stored images
	 * @returns {Promise<Object>} Object with image keys and data
	 */
	async getAllImages() {
		try {
			const images = await database.read(StorageKeys.IMAGES, {});
			return typeof images === "object" && !Array.isArray(images) ? images : {};
		} catch (error) {
			if (error instanceof DatabaseError) {
				throw createImageError(`Failed to get images: ${error.message}`);
			}
			throw error;
		}
	},

	/**
	 * Clear all stored images
	 * @returns {Promise<boolean>}
	 */
	async clearAllImages() {
		try {
			await database.write(StorageKeys.IMAGES, {});
			return true;
		} catch (error) {
			if (error instanceof DatabaseError) {
				throw createImageError(`Failed to clear images: ${error.message}`);
			}
			throw error;
		}
	},
};

export { imageService, createImageError };

