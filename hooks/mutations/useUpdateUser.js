// hooks/useUpdateUser.js
import { useState } from "react";
import { updateUserAPI } from "../../api/auth";
import imageStore from "../../store/imageStore";

const useUpdateUser = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const updateUser = async (newData, imageUri) => {
		setLoading(true);
		setError(null);

		try {
			let imageKey = null;

			// If there's a new image, upload it and get the image key
			if (imageUri) {
				imageKey = await imageStore.uploadImage(imageUri);
			}

			// Update user data, including the image key if available
			const updatedData = { ...newData, profileImageKey: imageKey };
			const response = await updateUserAPI(updatedData);

			setLoading(false);
			return response.data;
		} catch (err) {
			setLoading(false);
			setError(err.message);
			throw err;
		}
	};

	return { updateUser, loading, error };
};

export default useUpdateUser;
