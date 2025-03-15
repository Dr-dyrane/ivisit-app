import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext"; // Import your AuthContext
import { loginUserAPI } from "../../api/auth"; // Import your simulated API call

const useLogin = () => {
	const { login } = useContext(AuthContext); // Get the login function from context

	const loginUser = async (credentials) => {
		try {
			const response = await loginUserAPI(credentials); // Call the simulated API
			const { token, ...userData } = response.data; // Extract token and user data

			// Call the login function in context and return true if successful
			const loginSuccess = await login({ ...userData, token });

			if (loginSuccess) {
				return true; // Return true to indicate login success
			} else {
				throw new Error("Login failed"); // Handle failure
			}
		} catch (error) {
			throw error; // Rethrow error for handling in LoginScreen
		}
	};

	return { login: loginUser }; // Return the login function
};

export default useLogin;
