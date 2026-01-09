import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import { NotificationsProvider } from "../contexts/NotificationsContext";
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
				<PreferencesProvider>
					<TabBarVisibilityProvider>
						<ScrollAwareHeaderProvider>
							<NotificationsProvider>
								<EmergencyProvider>
									<ToastProvider>{children}</ToastProvider>
								</EmergencyProvider>
							</NotificationsProvider>
						</ScrollAwareHeaderProvider>
					</TabBarVisibilityProvider>
				</PreferencesProvider>
			</ThemeProvider>
		</AuthProvider>
	);
};
