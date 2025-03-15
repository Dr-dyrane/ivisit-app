import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext"; // Import your AuthContext
import { signUpUserAPI } from "../../api/auth"; // Import your simulated API call

const useSignUp = () => {
	const { login } = useContext(AuthContext); // Get the login function from context

	const signUpUser = async (credentials) => {
		console.log("calling api");
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

	return { signUp: signUpUser }; // Return the signUp function
};

export default useSignUp;
