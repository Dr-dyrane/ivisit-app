import React from "react";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { FABProvider } from "../contexts/FABContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import { NotificationsProvider } from "../contexts/NotificationsContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";
import { SearchProvider } from "../contexts/SearchContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";

/**
 * UserProviders
 *
 * File Path: providers/UserProviders.jsx
 *
 * Wraps the user stack with necessary context providers.
 */
export const UserProviders = ({ children }) => {
	return (
		<TabBarVisibilityProvider>
			<HeaderStateProvider>
				<FABProvider>
					<PreferencesProvider>
						<VisitsProvider>
							<NotificationsProvider>
								<SearchProvider>
									<EmergencyUIProvider>{children}</EmergencyUIProvider>
								</SearchProvider>
							</NotificationsProvider>
						</VisitsProvider>
					</PreferencesProvider>
				</FABProvider>
			</HeaderStateProvider>
		</TabBarVisibilityProvider>
	);
};
