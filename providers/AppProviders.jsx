import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import { NotificationsProvider } from "../contexts/NotificationsContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import ToastProvider from "../contexts/ToastContext";
import { HelpSupportProvider } from "../contexts/HelpSupportContext";

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
					<ToastProvider>
						<TabBarVisibilityProvider>
							<ScrollAwareHeaderProvider>
								<HeaderStateProvider>
									<NotificationsProvider>
										<VisitsProvider>
											<EmergencyProvider>
												<HelpSupportProvider>{children}</HelpSupportProvider>
											</EmergencyProvider>
										</VisitsProvider>
									</NotificationsProvider>
								</HeaderStateProvider>
							</ScrollAwareHeaderProvider>
						</TabBarVisibilityProvider>
					</ToastProvider>
				</PreferencesProvider>
			</ThemeProvider>
		</AuthProvider>
	);
};
