import React from "react";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { FABProvider } from "../contexts/FABContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";
import { SearchProvider } from "../contexts/SearchContext";

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
					<VisitsProvider>
						<SearchProvider>
							<EmergencyUIProvider>{children}</EmergencyUIProvider>
						</SearchProvider>
					</VisitsProvider>
				</FABProvider>
			</HeaderStateProvider>
		</TabBarVisibilityProvider>
	);
};
