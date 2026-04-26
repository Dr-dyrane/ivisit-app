// app/runtime/navigation/useRoutePersistence.js
// PULLBACK NOTE: Pass 2 - Extracted from RootNavigator.jsx
// Handles route storage persistence (read, write, clear)

import { useEffect } from "react";
import { usePathname } from "expo-router";
import { database, StorageKeys } from "../../../database";
import { normalizeStoredPublicRoute } from "./deepLinkHelpers";

// LEGACY: This key is checked for migration purposes
const LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY = "@ivisit/last_public_route_v1";

/**
 * Read stored public route from database
 * Migrates legacy key to new key if present
 * @returns {Promise<string|null>} The normalized public route
 */
export async function readStoredPublicRoute() {
	const [storedRoute, legacyStoredRoute] = await Promise.all([
		database.read(StorageKeys.LAST_PUBLIC_ROUTE).catch(() => null),
		database.readRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => null),
	]);

	const normalizedRoute =
		normalizeStoredPublicRoute(storedRoute) ||
		normalizeStoredPublicRoute(legacyStoredRoute);

	if (normalizedRoute) {
		await database.write(StorageKeys.LAST_PUBLIC_ROUTE, normalizedRoute).catch(() => {});
	}

	if (legacyStoredRoute) {
		database.deleteRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => {});
	}

	return normalizedRoute;
}

/**
 * Read stored auth return route from database
 * @returns {Promise<string|null>} The normalized public route
 */
export async function readStoredAuthReturnRoute() {
	const route = await database.read(StorageKeys.AUTH_RETURN_ROUTE).catch(() => null);
	return normalizeStoredPublicRoute(route);
}

/**
 * Write stored public route to database
 * Only writes if the route is a valid public route
 * @param {string} route - The route to store
 */
export async function writeStoredPublicRoute(route) {
	const normalizedRoute = normalizeStoredPublicRoute(route);
	if (!normalizedRoute) {
		return;
	}

	await database.write(StorageKeys.LAST_PUBLIC_ROUTE, normalizedRoute).catch(() => {});
	database.deleteRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => {});
}

/**
 * Clear stored public route from database
 */
export async function clearStoredPublicRoute() {
	await database.delete(StorageKeys.LAST_PUBLIC_ROUTE).catch(() => {});
	database.deleteRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => {});
}

/**
 * useRoutePersistence - Watches pathname changes and persists/clears routes
 *
 * Responsibilities:
 * - Persist public routes when user navigates to them
 * - Clear stored route when user navigates to root "/"
 * - No other side effects
 */
export function useRoutePersistence() {
	const pathname = usePathname();

	useEffect(() => {
		if (!pathname) {
			return;
		}

		const nextStoredRoute = normalizeStoredPublicRoute(pathname);
		if (nextStoredRoute) {
			writeStoredPublicRoute(nextStoredRoute).catch(() => {});
			return;
		}

		if (pathname === "/") {
			clearStoredPublicRoute().catch(() => {});
		}
	}, [pathname]);
}
