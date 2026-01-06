// hooks/mutations/useResetPassword.js
import { useState } from "react";
import { resetPasswordAPI } from "../../api/auth";

const useResetPassword = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

	const resetPassword = async (resetToken, newPassword, email) => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			console.log(resetToken, newPassword, email);
			const response = await resetPasswordAPI(resetToken, newPassword, email); // Call the API
			setLoading(false);
			setSuccess(true);
			return response.data;
		} catch (err) {
			setLoading(false);
			setError(err.message);
			throw err;
		}
	};

	return { resetPassword, loading, error, success };
};

export default useResetPassword;
