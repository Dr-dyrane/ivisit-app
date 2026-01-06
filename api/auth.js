// api/auth.js
import userStore from "../store/userStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Function to login a user
export const loginUserAPI = async (credentials) => {
	return await userStore.login(credentials);
};

// Function to sign up a new user
export const signUpUserAPI = async (credentials) => {
	return await userStore.signUp(credentials);
};

// Function to update user data
export const updateUserAPI = async (newData) => {
	return await userStore.updateUser(newData);
};

// Function to delete a user
export const deleteUserAPI = async () => {
	return await userStore.deleteUser();
};

// Function to get current user data
export const getCurrentUserAPI = async () => {
	return await userStore.getCurrentUser();
};

// Function to initiate forgot password
export const forgotPasswordAPI = async (email) => {
	return await userStore.forgotPassword(email);
};

// Function to reset password
export const resetPasswordAPI = async (resetToken, newPassword, email) => {
	return await userStore.resetPassword(resetToken, newPassword, email);
};

// Function to check if user exists and has password
export const checkUserExistsAPI = async (credentials) => {
	return await userStore.checkUserExists(credentials);
};

// Function to set password for existing users
export const setPasswordAPI = async (credentials) => {
	return await userStore.setPassword(credentials);
};

// Helper function to check pending registration
export const getPendingRegistrationAPI = async () => {
	try {
		const pendingData = await AsyncStorage.getItem("pendingRegistration");
		if (pendingData) {
			await AsyncStorage.removeItem("pendingRegistration");
			return JSON.parse(pendingData);
		}
		return null;
	} catch (error) {
		console.error("Get pending registration error:", error);
		return null;
	}
};
