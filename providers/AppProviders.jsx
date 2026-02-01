import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
// FAB VISIBILITY FIX: Added FABProvider and EmergencyUIProvider to resolve context errors
// These providers were missing, causing "useFAB must be used within a FABProvider" and "useEmergencyUI must be used within EmergencyUIProvider" errors
// FABProvider manages global FAB state and competition resolution
// EmergencyUIProvider manages emergency-specific UI state

import { ThemeProvider } from "../contexts/ThemeContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";
import { NotificationsProvider } from "../contexts/NotificationsContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import ToastProvider from "../contexts/ToastContext";
import { HelpSupportProvider } from "../contexts/HelpSupportContext";
import { FABProvider } from "../contexts/FABContext";

/**
 * AppProviders
 *
 * File Path: providers/AppProviders.jsx
 *
 * Wraps the application with all necessary context providers.
 * Order matters:
 * 1. AuthProvider (Top level state)
 * 2. ThemeProvider (UI Theming)
 * 3. Feature Providers (TabBar, Headers, Emergency, EmergencyUI, FAB, Toast)
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
												<EmergencyUIProvider>
													<FABProvider>
														<HelpSupportProvider>{children}</HelpSupportProvider>
													</FABProvider>
												</EmergencyUIProvider>
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
