import React from "react";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { FABProvider } from "../contexts/FABContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";

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
						<EmergencyUIProvider>{children}</EmergencyUIProvider>
					</VisitsProvider>
				</FABProvider>
			</HeaderStateProvider>
		</TabBarVisibilityProvider>
	);
};
