// app/runtime/navigation/useAuthRouting.js
import { useEffect } from "react";
import { usePathname } from "expo-router";

function normalizeStoredPublicRoute(pathname) {
	if (pathname === "/(auth)/map" || pathname === "/(auth)/map-loading") {
		return "/(auth)/map";
	}
	if (pathname === "/(auth)/request-help") return "/(auth)/map";
	if (pathname === "/map" || pathname === "/map-loading") return "/(auth)/map";
	if (pathname === "/request-help") return "/(auth)/map";
	return null;
}

function isNormalizedPublicRouteActive(pathname, targetRoute) {
	return normalizeStoredPublicRoute(pathname) === targetRoute;
}

/**
 * useAuthRouting
 *
 * Handles auth-based routing decisions:
 * - Clear startup public route when reached
 * - Used by RootNavigator and UserLayout
 *
 * Dependencies:
 * - startupPublicRoute: string|null - public route user started on
 * - setStartupPublicRoute: function - callback to clear startup route
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
