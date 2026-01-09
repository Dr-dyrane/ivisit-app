import React from "react";
import { RegistrationProvider } from "../contexts/RegistrationContext";
import { LoginProvider } from "../contexts/LoginContext";

/**
 * AuthProviders
 *
 * File Path: providers/AuthProviders.jsx
 *
 * Wraps the auth stack with necessary context providers.
 */
export const AuthProviders = ({ children }) => {
	return (
		<RegistrationProvider>
			<LoginProvider>{children}</LoginProvider>
		</RegistrationProvider>
	);
};
