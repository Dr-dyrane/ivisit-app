// app/runtime/RootProviders.jsx
// PULLBACK NOTE: Pass 1B - Extracted from app/_layout.js
// OLD: RootLayout contained provider nesting
// NEW: RootProviders owns provider order only

import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders } from "../../providers/AppProviders";
import { GlobalLocationProvider } from "../../contexts/GlobalLocationContext";
import GlobalErrorBoundary from "../../components/GlobalErrorBoundary";
import ThemeToggle from "../../components/ThemeToggle";

/**
 * RootProviders - Pure provider composition
 *
 * Responsibilities:
 * - Nest providers in correct order
 * - No state, no effects, no logic
 * - Only composition
 *
 * Provider Order (outside to inside):
 * 1. GestureHandlerRootView (gesture system)
 * 2. GlobalErrorBoundary (error catching)
 * 3. GlobalLocationProvider (location services)
 * 4. AppProviders (auth, theme, toast, etc.)
 * 5. View wrapper (flex: 1)
 * 6. Children (the app)
 * 7. ThemeToggle (floating)
 */
// Required by Expo Router (all files in app/ must have a default export)
export default null;

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
