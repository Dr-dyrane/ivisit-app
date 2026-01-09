import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import ToastProvider from "../contexts/ToastContext";

/**
 * AppProviders
 *
 * File Path: providers/AppProviders.jsx
 *
 * Wraps the application with all necessary context providers.
 * Order matters:
 * 1. AuthProvider (Top level state)
 * 2. ThemeProvider (UI Theming)
 * 3. Feature Providers (TabBar, Headers, Emergency, Toast)
 */
export const AppProviders = ({ children }) => {
	return (
		<AuthProvider>
			<ThemeProvider>
				<TabBarVisibilityProvider>
					<ScrollAwareHeaderProvider>
						<EmergencyProvider>
							<ToastProvider>{children}</ToastProvider>
						</EmergencyProvider>
					</ScrollAwareHeaderProvider>
				</TabBarVisibilityProvider>
			</ThemeProvider>
		</AuthProvider>
	);
};
