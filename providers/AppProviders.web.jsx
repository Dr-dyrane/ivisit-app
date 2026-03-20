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
