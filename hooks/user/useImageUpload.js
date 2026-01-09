import { useState, useCallback } from "react";
import { imageService } from "../../services/imageService";

export function useImageUpload() {
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState(null);

	const uploadImage = useCallback(async (uri) => {
		setIsUploading(true);
		setError(null);
		try {
			const result = await imageService.uploadImage(uri);
			return result;
		} catch (err) {
			const msg = err.message || "Failed to upload image";
			setError(msg);
			throw err;
		} finally {
			setIsUploading(false);
		}
	}, []);

	return {
		uploadImage,
		isUploading,
		error,
	};
}
