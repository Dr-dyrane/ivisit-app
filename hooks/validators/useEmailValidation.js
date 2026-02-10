import { useState, useEffect } from "react";
import { isValidEmail } from "../../utils/validation";

/**
 * useEmailValidation Hook
 *
 * Simple email validation with regex
 * No complex logic to avoid stack overflow issues
 *
 * @returns {Object} - Email validation state and methods
 */
export default function useEmailValidation() {
	const [email, setEmail] = useState("");
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		if (!email) {
			setIsValid(false);
			return;
		}

		// Validate email format
		setIsValid(isValidEmail(email));
	}, [email]);

	const clear = () => {
		setEmail("");
		setIsValid(false);
	};

	return {
		email,
		setEmail,
		isValid,
		clear,
	};
}
