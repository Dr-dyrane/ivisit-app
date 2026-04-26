// app/runtime/RootNavigator.jsx
// PULLBACK NOTE: Pass 3 - Auth redirects moved to route group layouts
// OLD: RootNavigator held auth redirect logic via useAuthRouting
// NEW: RootNavigator only handles Stack rendering + OTA updates
//      Auth redirects handled by:
//      - app/(auth)/_layout.js (allows all access including /map)
//      - app/(user)/_layout.js (enforces auth + profile completion)

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../contexts/ThemeContext";
import { useInitialRoute } from "./navigation/useInitialRoute";
import { OTAModalLayer } from "./OTAModalLayer";
import { useRoutePersistence } from "./navigation/useRoutePersistence";
import { useAuthRouting } from "./navigation/useAuthRouting";

/**
 * RootNavigator - Stack navigator composition only
 *
 * Responsibilities:
 * - Render Stack and Stack.Screen definitions
 * - Import and call routing hooks
 * - Render StatusBar
 * - Render OTAModalLayer for OTA update modals
 *
 * Does NOT contain:
 * - Helper functions
 * - useEffect logic blocks
 * - Auth redirect logic (moved to route group layouts)
 * - Route persistence logic
 * - Deep link parsing
 * - OTA modal logic (extracted to OTAModalLayer)
 */
// Required by Expo Router (all files in app/ must have a default export)
export default null;

export function RootNavigator() {
	const { isDarkMode } = useTheme();

	// Routing hooks - each owns one concern
	// NOTE: Auth redirects are handled by route group layouts, not here
	const { startupPublicRoute, setStartupPublicRoute } = useInitialRoute();
	useRoutePersistence();
	useAuthRouting({ startupPublicRoute, setStartupPublicRoute });

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#0D121D" : "#FFFFFF"}
			/>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
				<Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(user)" />
			</Stack>

			<OTAModalLayer />
		</>
	);
}
