// hooks/useForgotPassword.js
import { useState } from "react";
import { forgotPasswordAPI } from "../../api/auth";

const useForgotPassword = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

	const forgotPassword = async (email) => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await forgotPasswordAPI(email); // Call the API
			setLoading(false);
			setSuccess(true);
			console.log(response);
			return response;
			// const { message, resetToken } = response;
			// return {resetToken};
		} catch (err) {
			setLoading(false);
			setError(err.message);
			throw err;
		}
	};

	return { forgotPassword, loading, error, success };
};

export default useForgotPassword;
