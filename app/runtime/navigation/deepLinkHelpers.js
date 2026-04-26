// app/runtime/navigation/deepLinkHelpers.js
// PULLBACK NOTE: Pass 2 - Extracted from RootNavigator.jsx
// Pure utilities for deep link and route parsing - no React dependencies

import * as Linking from "expo-linking";

// Required by Expo Router (all files in app/ must have a default export)
export default null;

/**
 * Extract public auth route from deep link URL
 * @param {string} url - The URL to parse
 * @returns {string|null} The normalized public route or null
 */
export function getPublicAuthRouteFromUrl(url) {
	if (typeof url !== "string" || !url) return null;

	try {
		const parsed = Linking.parse(url);
		const normalizedPath = String(parsed?.path || "")
			.replace(/^--\//, "")
			.replace(/^\/+|\/+$/g, "");

		if (normalizedPath === "map-loading") return "/(auth)/map";
		if (normalizedPath === "map") return "/(auth)/map";
		if (normalizedPath === "(auth)/map") return "/(auth)/map";
		if (normalizedPath === "request-help") return "/(auth)/map";
	} catch (error) {
		console.warn("[DeepLink] Failed to parse initial URL:", error?.message || error);
	}

	if (url.includes("/map-loading")) return "/(auth)/map";
	if (url.includes("/(auth)/map")) return "/(auth)/map";
	if (url.includes("/request-help")) return "/(auth)/map";
	return null;
}

/**
 * Normalize stored public route to canonical form
 * @param {string} pathname - The pathname to normalize
 * @returns {string|null} The normalized route or null
 */
export function normalizeStoredPublicRoute(pathname) {
	if (pathname === "/(auth)/map" || pathname === "/(auth)/map-loading") {
		return "/(auth)/map";
	}
	if (pathname === "/(auth)/request-help") {
		return "/(auth)/map";
	}
	if (pathname === "/map" || pathname === "/map-loading") {
		return "/(auth)/map";
	}
	if (pathname === "/request-help") {
		return "/(auth)/map";
	}
	return null;
}

/**
 * Check if normalized route matches target
 * @param {string} pathname - Current pathname
 * @param {string} targetRoute - Route to check against
 * @returns {boolean}
 */
export function isNormalizedPublicRouteActive(pathname, targetRoute) {
	return normalizeStoredPublicRoute(pathname) === targetRoute;
}

/**
 * Check if URL is base app URL (not a deep link)
 * Used to prevent redirect loops on app launch
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isBaseAppUrl(url) {
	if (typeof url !== "string" || !url) return false;

	const isDevUrl =
		(url.includes(":8081") || url.includes(".ngrok.io") || url.includes(".ngrok-free.app")) &&
		!url.includes("?") &&
		!url.includes("#");

	const isProductionRoot =
		url === Linking.createURL("/") ||
		url === Linking.createURL("") ||
		url === "ivisit://" ||
		url.endsWith("/--");

	const isExpoGoWithPath = url.includes("/--/");

	return isProductionRoot || isDevUrl || isExpoGoWithPath;
}
