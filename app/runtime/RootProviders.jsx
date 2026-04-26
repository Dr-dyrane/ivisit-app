// app/runtime/RootProviders.jsx
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders } from "../../providers/AppProviders";
import { GlobalLocationProvider } from "../../contexts/GlobalLocationContext";
import GlobalErrorBoundary from "../../components/GlobalErrorBoundary";
import ThemeToggle from "../../components/ThemeToggle";

/**
 * RootProviders
 *
 * Wraps the application with all necessary providers.
 * Order matters:
 * 1. GestureHandlerRootView (gesture system)
 * 2. GlobalErrorBoundary (catch-all errors)
 * 3. GlobalLocationProvider (location services)
 * 4. AppProviders (auth, theme, features)
 * 5. ThemeToggle (floating UI)
 */
export function RootProviders({ children }) {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<GlobalErrorBoundary>
				<GlobalLocationProvider>
					<AppProviders>
						<View style={{ flex: 1 }}>
							{children}
							<ThemeToggle showLabel={false} />
						</View>
					</AppProviders>
				</GlobalLocationProvider>
			</GlobalErrorBoundary>
		</GestureHandlerRootView>
	);
}
