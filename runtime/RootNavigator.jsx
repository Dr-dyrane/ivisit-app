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
import { useTheme } from "../contexts/ThemeContext";
import { getRootSurfaceColor } from "../constants/appSurfaces";
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
export function RootNavigator() {
	const { isDarkMode } = useTheme();
	const rootSurfaceColor = getRootSurfaceColor(isDarkMode);

	// Routing hooks - each owns one concern
	// NOTE: Auth redirects are handled by route group layouts, not here
	const {
		initialRouteResolved,
		startupPublicRoute,
		setStartupPublicRoute,
	} = useInitialRoute();
	useRoutePersistence({ initialRouteResolved, startupPublicRoute });
	useAuthRouting({ startupPublicRoute, setStartupPublicRoute });

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={rootSurfaceColor}
			/>
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: rootSurfaceColor },
				}}
			>
				<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
				<Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(user)" />
			</Stack>

			<OTAModalLayer />
		</>
	);
}
