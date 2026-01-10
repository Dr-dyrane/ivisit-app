/**
 * Image Service
 *
 * Handles image upload, retrieval, caching, and deletion
 * using Supabase Storage + local cache (hybrid strategy).
 */

import { database, StorageKeys } from "../database";
import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

// ============================================
// CONFIG
// ============================================

const BUCKET_NAME = "images";

// ============================================
// ERROR HELPER
// ============================================

const createImageError = (message) => {
	const error = new Error(message);
	error.name = "ImageServiceError";
	return error;
};

// ============================================
// IMAGE SERVICE
// ============================================

const imageService = {
	/**
	 * Upload image to Supabase Storage
	 * @param {string} imageUri
	 * @returns {Promise<string>} public URL
	 */
	async uploadImage(imageUri) {
		if (!imageUri) {
			throw createImageError("Image URI is required");
		}

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw createImageError("User must be logged in to upload images");
			}

			// Extract extension safely
			const ext =
				imageUri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";

			const fileName = `${Date.now()}_${Math.random()
				.toString(36)
				.slice(2, 8)}.${ext}`;

			const filePath = `${user.id}/${fileName}`;

			// Read file as Base64 for Supabase Upload (React Native standard)
			const base64 = await FileSystem.readAsStringAsync(imageUri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			// Upload binary
			const { error: uploadError } = await supabase.storage
				.from(BUCKET_NAME)
				.upload(filePath, decode(base64), {
					contentType: ext === "png" ? "image/png" : "image/jpeg",
					upsert: false,
				});

			if (uploadError) {
				throw createImageError(uploadError.message);
			}

			// Get public URL
			const {
				data: { publicUrl },
			} = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

			// Cache locally
			const images = (await database.read(StorageKeys.IMAGES, {})) || {};

			images[filePath] = {
				uri: publicUrl,
				localUri: imageUri,
				path: filePath,
				createdAt: Date.now(),
			};

			await database.write(StorageKeys.IMAGES, images);

			return publicUrl;
		} catch (error) {
			if (error.name === "ImageServiceError") throw error;
			throw createImageError(`Upload failed: ${error.message}`);
		}
	},

	/**
	 * Get image URL (cache-first)
	 */
	async getImage(imageKey) {
		if (!imageKey) return null;
		if (imageKey.startsWith("http")) return imageKey;

		try {
			const images = await database.read(StorageKeys.IMAGES, {});
			return images?.[imageKey]?.uri ?? null;
		} catch {
			return null;
		}
	},

	/**
	 * Delete image from Supabase + local cache
	 */
	async deleteImage(imageUrl) {
		if (!imageUrl) return false;

		try {
			let path = imageUrl;

			if (imageUrl.includes(`/${BUCKET_NAME}/`)) {
				path = imageUrl.split(`/${BUCKET_NAME}/`).pop();
			}

			await supabase.storage.from(BUCKET_NAME).remove([path]);

			const images = await database.read(StorageKeys.IMAGES, {});
			if (!images) return true;

			Object.keys(images).forEach((key) => {
				if (images[key].uri === imageUrl || key === path) {
					delete images[key];
				}
			});

			await database.write(StorageKeys.IMAGES, images);
			return true;
		} catch (error) {
			throw createImageError(`Delete failed: ${error.message}`);
		}
	},

	/**
	 * List cached images
	 */
	async listAll() {
		try {
			const images = await database.read(StorageKeys.IMAGES, {});
			return Object.values(images || {});
		} catch {
			return [];
		}
	},

	/**
	 * Clear cache (debug)
	 */
	async clearLocalCache() {
		await database.write(StorageKeys.IMAGES, {});
		return true;
	},
};

export { imageService, createImageError };
