// hooks/mutations/useLoginMutation.js

"use client";

/**
 * useLoginMutation
 * Handles all login-related API calls and AuthContext integration
 * Components should ONLY use this hook, never call API or store directly
 */

import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {
	loginUserAPI,
	checkUserExistsAPI,
	setPasswordAPI,
} from "../../api/auth";

const useLoginMutation = () => {
	const { login } = useContext(AuthContext);

	const checkUserExists = async (credentials) => {
		try {
			return await checkUserExistsAPI(credentials);
		} catch (error) {
			throw error;
		}
	};

	const setPassword = async (credentials) => {
		try {
			const response = await setPasswordAPI(credentials);
			const { token, ...userData } = response.data;

			const loginSuccess = await login({ ...userData, token });

			if (loginSuccess) {
				return { success: true, data: userData };
			} else {
				throw new Error("FAILED|Failed to set password and login");
			}
		} catch (error) {
			throw error;
		}
	};

	const loginUser = async (credentials) => {
		try {
			const response = await loginUserAPI(credentials);
			const { token, ...userData } = response.data;

			const loginSuccess = await login({ ...userData, token });

			if (loginSuccess) {
				return { success: true, data: userData };
			} else {
				throw new Error("FAILED|Login failed");
			}
		} catch (error) {
			throw error;
		}
	};

	return { loginUser, checkUserExists, setPassword };
};

export default useLoginMutation;
