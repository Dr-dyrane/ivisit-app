// api/auth.js
import userStore from "../store/userStore";

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
	console.log(resetToken, newPassword, email);
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
