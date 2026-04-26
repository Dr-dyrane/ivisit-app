// app/runtime/RootNavigator.jsx
import React, { useEffect, useRef, useState } from "react";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useOTAUpdates } from "../../hooks/useOTAUpdates";
import UpdateAvailableModal from "../../components/ui/UpdateAvailableModal";
import { isProfileComplete, shouldDeferProfileCompletion } from "../../utils/profileCompletion";
import { authService } from "../../services/authService";
import { database, StorageKeys } from "../../database";

const LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY = "@ivisit/last_public_route_v1";

// Helper: Get public route from deep link URL
function getPublicAuthRouteFromUrl(url) {
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
		console.warn("[DeepLink] Parse error:", error?.message);
	}
	if (url.includes("/map-loading")) return "/(auth)/map";
	if (url.includes("/map")) return "/(auth)/map";
	if (url.includes("/request-help")) return "/(auth)/map";
	return null;
}

// Helper: Normalize stored route
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

function isBaseAppUrl(url) {
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

async function readStoredPublicRoute() {
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

async function readStoredAuthReturnRoute() {
	const route = await database.read(StorageKeys.AUTH_RETURN_ROUTE).catch(() => null);
	return normalizeStoredPublicRoute(route);
}

async function writeStoredPublicRoute(route) {
	const normalizedRoute = normalizeStoredPublicRoute(route);
	if (!normalizedRoute) return;
	await database.write(StorageKeys.LAST_PUBLIC_ROUTE, normalizedRoute).catch(() => {});
	database.deleteRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => {});
}

async function clearStoredPublicRoute() {
	await database.delete(StorageKeys.LAST_PUBLIC_ROUTE).catch(() => {});
	database.deleteRaw(LEGACY_LAST_PUBLIC_ROUTE_STORAGE_KEY).catch(() => {});
}

/**
 * RootNavigator
 *
 * Stack navigation with auth-based routing and deep link handling.
 */
export function RootNavigator() {
	const { user, loading } = useAuth();
	const { isDarkMode } = useTheme();
	const router = useRouter();
	const segments = useSegments();
	const pathname = usePathname();
	const pathnameRef = useRef(pathname);
	const [initialRouteResolved, setInitialRouteResolved] = useState(false);
	const [startupPublicRoute, setStartupPublicRoute] = useState(null);
	const normalizedPublicPathname = normalizeStoredPublicRoute(pathname);

	const { showModal, showSuccessModal, handleRestart, handleLater, handleDismissSuccess } =
		useOTAUpdates();

	// Sync pathname ref
	useEffect(() => {
		pathnameRef.current = pathname;
	}, [pathname]);

	// Handle deep links and initial route
	useEffect(() => {
		let isMounted = true;

		const handleDeepLink = async (event) => {
			const url = event.url;
			if (!url) return;

			const isResetPassword = url.includes("auth/reset-password");
			const isAuthCallback =
				!isResetPassword &&
				(url.includes("auth/callback") || url.includes("code=") || url.includes("access_token="));
			const isAlreadyOnResetPasswordRoute = pathnameRef.current === "/auth/reset-password";
			const isAlreadyOnAuthCallbackRoute = pathnameRef.current === "/auth/callback";

			if (isResetPassword) {
				if (!isAlreadyOnResetPasswordRoute) router.replace("/auth/reset-password");
				return;
			}

			if (isAuthCallback) {
				if (!isAlreadyOnAuthCallbackRoute) router.replace("/auth/callback");
				return;
			}

			const publicAuthRoute = getPublicAuthRouteFromUrl(url);
			if (publicAuthRoute) {
				if (isMounted) setStartupPublicRoute(publicAuthRoute);
				await writeStoredPublicRoute(publicAuthRoute);
				if (!isNormalizedPublicRouteActive(pathnameRef.current, publicAuthRoute)) {
					router.replace(publicAuthRoute);
				}
				return;
			}

			const isBaseUrl = isBaseAppUrl(url);
			if (user?.isAuthenticated && !isBaseUrl && !isAuthCallback) {
				router.replace("/(user)");
			}
		};

		const hydrateInitialRoute = async () => {
			try {
				const url = await Linking.getInitialURL();
				if (url) {
					await handleDeepLink({ url });
					if (isBaseAppUrl(url)) {
						const restoredPublicRoute =
							(await readStoredAuthReturnRoute()) || (await readStoredPublicRoute());
						if (restoredPublicRoute === "/(auth)/map") {
							if (isMounted) setStartupPublicRoute(restoredPublicRoute);
							if (!isNormalizedPublicRouteActive(pathnameRef.current, restoredPublicRoute)) {
								router.replace(restoredPublicRoute);
							}
						}
					}
					return;
				}

				const restoredPublicRoute =
					(await readStoredAuthReturnRoute()) || (await readStoredPublicRoute());
				if (restoredPublicRoute === "/(auth)/map") {
					if (isMounted) setStartupPublicRoute(restoredPublicRoute);
					if (!isNormalizedPublicRouteActive(pathnameRef.current, restoredPublicRoute)) {
						router.replace(restoredPublicRoute);
					}
				}
			} finally {
				if (isMounted) setInitialRouteResolved(true);
			}
		};

		hydrateInitialRoute();

		const subscription = Linking.addEventListener("url", (event) => {
			void handleDeepLink(event);
			if (isMounted) setInitialRouteResolved(true);
		});
		return () => {
			isMounted = false;
			subscription.remove();
		};
	}, [router, user?.isAuthenticated]);

	// Persist route changes
	useEffect(() => {
		if (!pathname) return;
		const nextStoredRoute = normalizeStoredPublicRoute(pathname);
		if (nextStoredRoute) {
			writeStoredPublicRoute(nextStoredRoute).catch(() => {});
			return;
		}
		if (pathname === "/") {
			clearStoredPublicRoute().catch(() => {});
		}
	}, [pathname]);

	// Auth-based routing
	useEffect(() => {
		const rootGroup = segments?.[0] ?? null;
		const isStandaloneAuthRoute =
			pathname === "/auth/callback" || pathname === "/auth/reset-password";
		const onCompleteProfile =
			segments?.[0] === "(user)" &&
			segments?.[1] === "(stacks)" &&
			segments?.[2] === "complete-profile";
		const isPublicMapFlow =
			normalizedPublicPathname === "/(auth)/map" || startupPublicRoute === "/(auth)/map";

		if (loading || !initialRouteResolved) return;
		if (isStandaloneAuthRoute) return;

		// Not authenticated - redirect to auth
		if (!user.isAuthenticated) {
			if (!pathname) return;
			if (!isPublicMapFlow && rootGroup !== "(auth)") {
				router.replace("/(auth)");
			}
			return;
		}

		// Authenticated but profile incomplete
		const deferProfileCompletion = shouldDeferProfileCompletion(user);
		const profileComplete = isProfileComplete(user);

		if (!profileComplete && !onCompleteProfile && !deferProfileCompletion && !isPublicMapFlow) {
			router.replace("/(user)/(stacks)/complete-profile");
			return;
		}

		if (profileComplete && deferProfileCompletion) {
			authService.clearEmergencyProfileCompletionDeferred().catch((error) => {
				console.warn("[RootNavigator] Clear deferred flag error:", error);
			});
		}

		// Authenticated - redirect away from auth routes
		if (!isPublicMapFlow && (rootGroup === "(auth)" || rootGroup !== "(user)")) {
			router.replace("/(user)");
		}
	}, [
		initialRouteResolved,
		loading,
		normalizedPublicPathname,
		pathname,
		router,
		segments,
		startupPublicRoute,
		user,
	]);

	// Clear startup route when reached
	useEffect(() => {
		if (!startupPublicRoute) return;
		if (isNormalizedPublicRouteActive(pathname, startupPublicRoute)) {
			setStartupPublicRoute(null);
		}
	}, [pathname, startupPublicRoute]);

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

			<UpdateAvailableModal
				visible={showModal}
				variant="available"
				onRestart={handleRestart}
				onLater={handleLater}
			/>
			<UpdateAvailableModal
				visible={showSuccessModal}
				variant="completed"
				onDismiss={handleDismissSuccess}
			/>
		</>
	);
}
