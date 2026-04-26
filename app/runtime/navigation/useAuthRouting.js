// app/runtime/navigation/useAuthRouting.js
// PULLBACK NOTE: Pass 3 - Simplified to coordination only
// OLD: useAuthRouting handled all auth redirects (unauthenticated → /(auth), incomplete → /complete-profile)
// NEW: Auth redirects moved to route group layouts:
//      - app/(user)/_layout.js handles unauthenticated redirect and profile completion redirect
//      - app/(auth)/_layout.js allows all access (no guards needed)
// This hook now only handles startup route clearing for coordination

import { useEffect } from "react";
import { usePathname } from "expo-router";
import { isNormalizedPublicRouteActive } from "./deepLinkHelpers";

// Required by Expo Router (all files in app/ must have a default export)
export default null;

/**
 * useAuthRouting - Startup route coordination only
 *
 * Responsibilities:
 * - Clear startup public route once reached
 *
 * NOTE: Auth redirects are now handled by route group layouts:
 * - app/(user)/_layout.js enforces authentication + profile completion
 * - app/(auth)/_layout.js allows public access (including /map)
 *
 * Dependencies:
 * - startupPublicRoute: string|null — public route user started on
 * - setStartupPublicRoute: function — callback to clear startup route
 */
export function useAuthRouting({ startupPublicRoute, setStartupPublicRoute }) {
	const pathname = usePathname();

	// Clear startup route once reached
	useEffect(() => {
		if (!startupPublicRoute) return;
		if (isNormalizedPublicRouteActive(pathname, startupPublicRoute)) {
			setStartupPublicRoute(null);
		}
	}, [pathname, startupPublicRoute, setStartupPublicRoute]);
}
