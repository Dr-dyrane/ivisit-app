// hooks/mutations/useSignUp.js

import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext"; // Import your AuthContext
import { signUpUserAPI } from "../../api/auth"; // Import your simulated API call

const useSignUp = () => {
	const { login } = useContext(AuthContext); // Get the login function from context

	const signUpUser = async (credentials) => {
		try {
			const response = await signUpUserAPI(credentials); // Call the simulated API
			const { token, email, username, ...userData } = response.data; // Extract token, email, and other user data

			// Store the user data and token in context
			await login({ ...userData, email, token, username }); // Include email in the user data
			return true; // Return true if sign-up is successful
		} catch (error) {
			throw error; // Rethrow error for handling in SignUpScreen
		}
	};

	// Social signup helper: creates a username from profile and signs up via API
	const socialSignUp = async (provider, profile) => {
		try {
			const username = profile.name
				? profile.name.replace(/\s+/g, "_").toLowerCase()
				: `${provider}_user_${Date.now()}`;

			const payload = {
				username,
				email: profile.email || null,
			};

			const response = await signUpUserAPI(payload);
			if (!response?.data) throw new Error("Social signup failed");

			await login(response.data);
			return response.data;
		} catch (err) {
			throw err;
		}
	};

	return { signUp: signUpUser, socialSignUp };
};

export default useSignUp;
