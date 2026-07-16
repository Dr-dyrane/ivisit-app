// app/runtime/navigation/useInitialRoute.js
// PULLBACK NOTE: Pass 2 - Extracted from RootNavigator.jsx
// Handles deep links and initial route hydration on app startup

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
	getProtectedAuthReturnRouteFromUrl,
	getPublicAuthRouteFromUrl,
	hasExplicitLaunchPathname,
	isAuthCallbackUrl,
	isBaseAppUrl,
	isNormalizedPublicRouteActive,
	normalizeStoredPublicRoute,
} from "./deepLinkHelpers";
import {
	readStoredAuthReturnRoute,
	readStoredPublicRoute,
	writeStoredAuthReturnRoute,
	writeStoredPublicRoute,
} from "./useRoutePersistence";
import { useAuth } from "../../contexts/AuthContext";

/**
 * useInitialRoute - Handles deep links and initial route hydration
 *
 * Responsibilities:
 * - Listen for deep link events
 * - Parse initial URL on mount
 * - Restore stored routes
 * - Handle auth callback and reset-password deep links
 * - Set initialRouteResolved flag when complete
 *
 * Returns:
 * - initialRouteResolved: boolean - true when initial hydration is done
 * - startupPublicRoute: string|null - the public route to restore
 */
export function useInitialRoute() {
	const router = useRouter();
	const pathname = usePathname();
	const { user, loading } = useAuth();
	const pathnameRef = useRef(pathname);
	const authStateRef = useRef({
		isAuthenticated: user.isAuthenticated,
		loading,
	});
	const [initialRouteResolved, setInitialRouteResolved] = useState(false);
	const [startupPublicRoute, setStartupPublicRoute] = useState(null);

	// Sync pathname ref for use inside async callbacks
	useEffect(() => {
		pathnameRef.current = pathname;
	}, [pathname]);

	useEffect(() => {
		authStateRef.current = {
			isAuthenticated: user.isAuthenticated,
			loading,
		};
	}, [loading, user.isAuthenticated]);

	// Initial route hydration (deep links + stored routes)
	useEffect(() => {
		let isMounted = true;
		const hydrateCompletedRef = { current: false };

		const handleDeepLink = async (event) => {
			const url = event.url;
			if (!url) return;

			const isResetPassword = url.includes("auth/reset-password");
			const isAuthCallback = !isResetPassword && isAuthCallbackUrl(url);
			const isAlreadyOnResetPasswordRoute = pathnameRef.current === "/auth/reset-password";
			const isAlreadyOnAuthCallbackRoute = pathnameRef.current === "/auth/callback";

			if (isResetPassword) {
				if (!isAlreadyOnResetPasswordRoute) {
					router.replace("/auth/reset-password");
				}
				return true;
			}

			if (isAuthCallback) {
				if (!isAlreadyOnAuthCallbackRoute) {
					router.replace("/auth/callback");
				}
				return true;
			}

			const protectedReturnRoute = getProtectedAuthReturnRouteFromUrl(url);
			if (protectedReturnRoute) {
				await writeStoredAuthReturnRoute(protectedReturnRoute);

				if (
					!authStateRef.current.loading &&
					authStateRef.current.isAuthenticated
				) {
					router.replace(protectedReturnRoute);
				} else {
					router.replace("/(auth)");
				}
				return true;
			}

			const publicAuthRoute = getPublicAuthRouteFromUrl(url);
			if (publicAuthRoute) {
				if (isMounted) setStartupPublicRoute(publicAuthRoute);
				await writeStoredPublicRoute(publicAuthRoute);
				if (!isNormalizedPublicRouteActive(pathnameRef.current, publicAuthRoute)) {
					router.replace(publicAuthRoute);
				}
				return true;
			}

			// Prevent loop on base app URLs - no redirect needed
			if (isBaseAppUrl(url)) return false;
			return false;
		};

		const hydrateInitialRoute = async () => {
			// Guard: prevent duplicate runs if effect re-fires
			if (hydrateCompletedRef.current) return;

			try {
				const url = await Linking.getInitialURL();
				let initialUrlHandled = false;
				if (url) {
					initialUrlHandled = await handleDeepLink({ url });
				}

				if (initialUrlHandled) return;

				// An explicit launch pathname (/login, /signup, /onboarding) is the
				// destination the link asked for, so it passes through untouched.
				// Only a URL that names no route may fall back to a stored route.
				if (url && hasExplicitLaunchPathname(url)) return;

				// Check stored public routes as a fallback when the launch URL did not
				// identify a destination. Protected intent is left for auth routing.
				// On Metro reload, Expo Go may provide a URL that doesn't contain
				// routing info, so we rely on the stored last route.
				const storedAuthReturnRoute = await readStoredAuthReturnRoute();
				const storedAuthPublicRoute = normalizeStoredPublicRoute(
					storedAuthReturnRoute,
				);
				if (storedAuthReturnRoute && !storedAuthPublicRoute) return;

				const restoredPublicRoute =
					storedAuthPublicRoute || (await readStoredPublicRoute());
				if (restoredPublicRoute) {
					if (isMounted) {
						setStartupPublicRoute(restoredPublicRoute);
					}
					if (!isNormalizedPublicRouteActive(pathnameRef.current, restoredPublicRoute)) {
						router.replace(restoredPublicRoute);
					}
				}
			} catch (err) {
				console.warn("[useInitialRoute] hydrateInitialRoute failed:", err);
			} finally {
				hydrateCompletedRef.current = true;
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	return { initialRouteResolved, startupPublicRoute, setStartupPublicRoute };
}
