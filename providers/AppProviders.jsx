import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { OTAUpdatesProvider } from "../contexts/OTAUpdatesContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { UnifiedScrollProvider } from "../contexts/UnifiedScrollContext";
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
 * 2. OTAUpdatesProvider (Shared update state - NEW)
 * 3. ThemeProvider (UI Theming)
 * 4. UnifiedScrollProvider (Synchronized scroll animations)
 * 5. Feature Providers (TabBar, Headers, Emergency, EmergencyUI, FAB, Toast)
 */
export const AppProviders = ({ children }) => {
	return (
		<AuthProvider>
			<OTAUpdatesProvider>
				<ThemeProvider>
					<PreferencesProvider>
						<ToastProvider>
							<UnifiedScrollProvider>
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
							</UnifiedScrollProvider>
						</ToastProvider>
					</PreferencesProvider>
				</ThemeProvider>
			</OTAUpdatesProvider>
		</AuthProvider>
	);
};
