// store/imageStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const imageStore = {
    // Function to store image and return a unique key
    uploadImage: async (imageUri) => {
        try {
            const imageKey = `image_${Date.now()}`; // Generate unique key using timestamp
            await AsyncStorage.setItem(imageKey, imageUri); // Store image URI with key
            return imageKey;
        } catch (error) {
            console.error("Image upload error:", error.message);
            throw error;
        }
    },

    // Function to retrieve image by key
    getImage: async (imageKey) => {
        try {
            const imageUri = await AsyncStorage.getItem(imageKey);
            if (imageUri) {
                return imageUri;
            } else {
                throw new Error("Image not found");
            }
        } catch (error) {
            console.error("Get image error:", error.message);
            throw error;
        }
    },
};

export default imageStore;
