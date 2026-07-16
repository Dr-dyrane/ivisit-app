// app/runtime/navigation/deepLinkHelpers.js
// PULLBACK NOTE: Pass 2 - Extracted from RootNavigator.jsx
// Pure utilities for deep link and route parsing - no React dependencies

import * as Linking from "expo-linking";
import {
	PROTECTED_VISIT_ROUTE_PATH,
	buildProtectedVisitReturnRoute,
} from "./authReturnRoute";

function normalizeParsedPath(pathname) {
	return String(pathname || "")
		.replace(/^\/+|\/+$/g, "")
		.replace(/^--\//, "");
}

function getParsedPathCandidates(url, parsed) {
	const candidates = [parsed?.path, parsed?.hostname];

	try {
		const standardUrl = new URL(url);
		candidates.push(standardUrl.pathname, standardUrl.hostname);
	} catch {
		// Linking.parse remains the source for Expo-specific URL shapes.
	}

	return candidates.map(normalizeParsedPath).filter(Boolean);
}

function isCanonicalWebRoot(url) {
	try {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol) && parsed.pathname === "/";
	} catch {
		return false;
	}
}

const AUTH_CALLBACK_PATH = "auth/callback";
// Supabase returns the session either as a PKCE "code" or as implicit-flow
// tokens, and the tokens may arrive on the URL fragment instead of the query.
const OAUTH_SESSION_KEYS = ["access_token", "refresh_token"];
const OAUTH_CODE_SIBLING_KEYS = [
	"state",
	"token_type",
	"expires_in",
	"provider_token",
	"provider_refresh_token",
];

function getAuthPathCandidates(url, parsed) {
	const parsedPath = normalizeParsedPath(parsed?.path);
	const parsedHostname = normalizeParsedPath(parsed?.hostname);
	// ivisit://auth/callback parses as hostname "auth" + path "callback".
	const candidates = [
		parsedPath,
		parsedHostname && parsedPath ? `${parsedHostname}/${parsedPath}` : null,
	];

	try {
		const standardUrl = new URL(url);
		const standardPath = normalizeParsedPath(standardUrl.pathname);
		const standardHostname = normalizeParsedPath(standardUrl.hostname);
		candidates.push(standardPath);
		if (standardHostname && standardPath) {
			candidates.push(`${standardHostname}/${standardPath}`);
		}
	} catch {
		// Linking.parse remains the source for Expo-specific URL shapes.
	}

	return candidates.filter(Boolean);
}

function getUrlParamKeys(url, parsed) {
	const paramKeys = new Set(Object.keys(parsed?.queryParams || {}));

	try {
		const standardUrl = new URL(url);
		standardUrl.searchParams.forEach((_value, key) => paramKeys.add(key));
		const hash = standardUrl.hash?.startsWith("#")
			? standardUrl.hash.slice(1)
			: standardUrl.hash || "";
		if (hash) {
			new URLSearchParams(hash).forEach((_value, key) => paramKeys.add(key));
		}
	} catch {
		// Custom-scheme URLs fall back to the Linking.parse query params above.
	}

	return paramKeys;
}

/**
 * Identify a genuine OAuth callback URL.
 * Substring matching on "code=" also captured invite_code/promo_code links, so
 * the callback path and exact OAuth param keys are the only accepted signals.
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isAuthCallbackUrl(url) {
	if (typeof url !== "string" || !url) return false;

	let parsed = null;
	try {
		parsed = Linking.parse(url);
	} catch (error) {
		console.warn("[DeepLink] Failed to parse callback URL:", error?.message || error);
	}

	if (getAuthPathCandidates(url, parsed).includes(AUTH_CALLBACK_PATH)) return true;

	const paramKeys = getUrlParamKeys(url, parsed);
	if (OAUTH_SESSION_KEYS.some((key) => paramKeys.has(key))) return true;

	return (
		paramKeys.has("code") &&
		OAUTH_CODE_SIBLING_KEYS.some((key) => paramKeys.has(key))
	);
}

/**
 * Report whether a launch URL names its own destination. An explicit pathname
 * is the destination the user asked for, so a stored route must not replace it.
 * @param {string} url - The launch URL
 * @returns {boolean}
 */
export function hasExplicitLaunchPathname(url) {
	if (typeof url !== "string" || !url) return false;

	try {
		const parsed = Linking.parse(url);
		return Boolean(normalizeParsedPath(parsed?.path));
	} catch (error) {
		console.warn("[DeepLink] Failed to parse launch URL:", error?.message || error);
		return false;
	}
}

/**
 * Extract public auth route from deep link URL
 * @param {string} url - The URL to parse
 * @returns {string|null} The normalized public route or null
 */
export function getPublicAuthRouteFromUrl(url) {
	if (typeof url !== "string" || !url) return null;

	try {
		const parsed = Linking.parse(url);
		const normalizedPath = normalizeParsedPath(parsed?.path);

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
 * Extract and sanitize the protected visit-detail intent from a deep link.
 * The external URL itself is never retained as a navigation target.
 */
export function getProtectedAuthReturnRouteFromUrl(url) {
	if (typeof url !== "string" || !url) return null;

	try {
		const parsed = Linking.parse(url);
		const hasProtectedPath = isCanonicalWebRoot(url)
			|| getParsedPathCandidates(url, parsed).some(
				(pathname) => pathname === normalizeParsedPath(PROTECTED_VISIT_ROUTE_PATH),
			);
		if (!hasProtectedPath) return null;

		return buildProtectedVisitReturnRoute(
			PROTECTED_VISIT_ROUTE_PATH,
			parsed?.queryParams || {},
		);
	} catch (error) {
		console.warn("[DeepLink] Failed to parse protected URL:", error?.message || error);
		return null;
	}
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
