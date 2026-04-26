// app/runtime/navigation/deepLinkHelpers.js
import * as Linking from "expo-linking";

/**
 * Deep link helper functions for route hydration
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
		if (normalizedPath === "request-help") return "/(auth)/map";
	} catch (error) {
		console.warn("[DeepLink] Failed to parse initial URL:", error?.message || error);
	}
	if (url.includes("/map-loading")) return "/(auth)/map";
	if (url.includes("/map")) return "/(auth)/map";
	if (url.includes("/request-help")) return "/(auth)/map";
	return null;
}

export function normalizeStoredPublicRoute(pathname) {
	if (pathname === "/(auth)/map" || pathname === "/(auth)/map-loading") {
		return "/(auth)/map";
	}
	if (pathname === "/(auth)/request-help") return "/(auth)/map";
	if (pathname === "/map" || pathname === "/map-loading") return "/(auth)/map";
	if (pathname === "/request-help") return "/(auth)/map";
	return null;
}

export function isNormalizedPublicRouteActive(pathname, targetRoute) {
	return normalizeStoredPublicRoute(pathname) === targetRoute;
}

export function isBaseAppUrl(url) {
	if (typeof url !== "string" || !url) return false;
	const isRootDevUrl = url.includes(":8081") && !url.includes("?") && !url.includes("#");
	return (
		url === Linking.createURL("/") ||
		url === Linking.createURL("") ||
		url === "ivisit://" ||
		url.endsWith("/--") ||
		isRootDevUrl
	);
}
