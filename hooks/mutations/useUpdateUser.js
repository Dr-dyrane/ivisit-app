// hooks/mutations/useUpdateUser.js

/**
 * useUpdateUser Hook
 * Uses userService for profile updates with integrated state management
 */

import { useState, useCallback, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { imageService } from "../../services/imageService";

const useUpdateUser = () => {
	const { syncUserData } = useContext(AuthContext);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	/**
	 * Update user profile
	 * @param {Object} newData - Profile data to update
	 * @param {string} imageUri - Optional new profile image URI
	 */
	const updateUser = useCallback(
		async (newData, imageUri) => {
			setLoading(true);
			setError(null);

			try {
				let imageKey = null;

				// If there's a new image, upload it and get the image key
				if (imageUri) {
					imageKey = await imageService.uploadImage(imageUri);
				}

				// Update user data, including the image key if available
				const updatedData = imageKey
					? { ...newData, profileImageKey: imageKey }
					: newData;

				const result = await userService.updateProfile(updatedData);

				if (!result.success) {
					setError(result.error);
					return { success: false, error: result.error };
				}

				// Sync AuthContext with updated data
				await syncUserData();

				return { success: true, data: result.data };
			} catch (err) {
				const errorMessage = err?.message || "Failed to update profile";
				setError(errorMessage);
				return { success: false, error: errorMessage };
			} finally {
				setLoading(false);
			}
		},
		[syncUserData]
	);

	/**
	 * Update specific profile fields
	 * @param {Object} fields - Fields to update
	 */
	const updateProfileFields = useCallback(
		async (fields) => {
			return updateUser(fields, null);
		},
		[updateUser]
	);

	/**
	 * Update profile image only
	 * @param {string} imageUri - New profile image URI
	 */
	const updateProfileImage = useCallback(
		async (imageUri) => {
			return updateUser({}, imageUri);
		},
		[updateUser]
	);

	/**
	 * Clear error state
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		updateUser,
		updateProfileFields,
		updateProfileImage,
		loading,
		error,
		clearError,
	};
};

export default useUpdateUser;
