/**
 * Image Service
 *
 * File Path: services/imageService.js
 *
 * Handles image storage and retrieval operations.
 * 
 * Strategy (Hybrid):
 * 1. Upload: Pushes to Supabase Storage bucket 'images'.
 * 2. Caching: Stores the resulting public URL in local storage for offline access to the list.
 */

import { database, StorageKeys, DatabaseError } from "../database";
import { supabase } from "./supabase";
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// ============================================
// CONFIGURATION
// ============================================

const BUCKET_NAME = 'images'; // Standard bucket name

// ============================================
// ERROR HELPERS
// ============================================

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
	 * Upload an image to Supabase Storage and cache the metadata
	 * @param {string} imageUri - Local file URI (e.g., from ImagePicker)
	 * @returns {Promise<string>} The public URL of the uploaded image
	 */
	async uploadImage(imageUri) {
		if (!imageUri) {
			throw createImageError("Image URI is required");
		}

        // 1. Prepare File for Upload
		try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw createImageError("User must be logged in to upload images");

			// Generate unique path: user_id/timestamp_random.ext
            const ext = imageUri.split('.').pop().toLowerCase() || 'jpg';
			const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const filePath = `${user.id}/${fileName}`;

            // Read file as Base64 for Supabase Upload (React Native standard)
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // 2. Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, decode(base64), {
                    contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
                    upsert: false
                });

            if (uploadError) {
                console.error("Supabase Storage Upload Error:", uploadError);
                throw createImageError(`Upload failed: ${uploadError.message}`);
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            // 4. Update Local Cache (Hybrid)
			let images = await database.read(StorageKeys.IMAGES, {});
			if (typeof images !== "object" || Array.isArray(images)) images = {};

            // Store mapping: filePath (key) -> publicUrl (value)
            // Or just store the publicUrl keyed by itself if we don't need the path later
			images[filePath] = {
				uri: publicUrl,
                localUri: imageUri, // Keep local URI for immediate display if needed
				createdAt: Date.now(),
			};

			await database.write(StorageKeys.IMAGES, images);

			return publicUrl;

		} catch (error) {
			if (error.name === "ImageServiceError") throw error;
            console.error("Image Upload Exception:", error);
			throw createImageError(`Failed to upload image: ${error.message}`);
		}
	},

	/**
	 * Retrieve an image URL (from cache or pass through)
	 * @param {string} imageKey - The unique key or URL
	 * @returns {Promise<string>} The image URI
	 */
	async getImage(imageKey) {
		if (!imageKey) return null;
        
        // If it's already a full URL, return it
        if (imageKey.startsWith('http')) return imageKey;

		try {
			const images = await database.read(StorageKeys.IMAGES, {});
            
            // Try to find by key
			if (images && images[imageKey]) {
				return images[imageKey].uri;
			}

            return null;
		} catch (error) {
            console.warn("Get Image Error:", error);
			return null;
		}
	},

	/**
	 * Delete an image (from Storage and Cache)
	 * @param {string} imageUrl - The full public URL or path
	 * @returns {Promise<boolean>}
	 */
	async deleteImage(imageUrl) {
		if (!imageUrl) return false;

		try {
            // Extract path from URL if possible
            // URL: https://.../storage/v1/object/public/images/user_id/filename.jpg
            // Path: user_id/filename.jpg
            let path = imageUrl;
            if (imageUrl.includes(`/${BUCKET_NAME}/`)) {
                path = imageUrl.split(`/${BUCKET_NAME}/`).pop();
            }

            // 1. Delete from Supabase
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) {
                console.warn("Supabase Delete Warning:", error);
                // Continue to clear local cache even if remote fails (maybe already gone)
            }

            // 2. Clear from Local Cache
			const images = await database.read(StorageKeys.IMAGES, {});
            
            // Find key by URI if we passed in a URI
            let keyToDelete = path;
            Object.keys(images).forEach(k => {
                if (images[k].uri === imageUrl) keyToDelete = k;
            });

			if (images[keyToDelete]) {
			    delete images[keyToDelete];
			    await database.write(StorageKeys.IMAGES, images);
            }

			return true;
		} catch (error) {
            console.error("Delete Image Error:", error);
			throw createImageError(`Failed to delete image: ${error.message}`);
		}
	},

    /**
     * Clear local cache (Debugging)
     */
	async clearLocalCache() {
		await database.write(StorageKeys.IMAGES, {});
        return true;
	}
};

export { imageService, createImageError };
