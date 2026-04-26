// app/runtime/navigation/useInitialRoute.js
// PULLBACK NOTE: Pass 2 - Extracted from RootNavigator.jsx
// Handles deep links and initial route hydration on app startup

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
	getPublicAuthRouteFromUrl,
	isBaseAppUrl,
	isNormalizedPublicRouteActive,
} from "./deepLinkHelpers";
import { readStoredAuthReturnRoute, readStoredPublicRoute, writeStoredPublicRoute } from "./useRoutePersistence";

// Required by Expo Router (all files in app/ must have a default export)
export default null;

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
 * - initialRouteResolved: boolean — true when initial hydration is done
 * - startupPublicRoute: string|null — the public route to restore
 */
export function useInitialRoute() {
	const router = useRouter();
	const pathname = usePathname();
	const pathnameRef = useRef(pathname);
	const [initialRouteResolved, setInitialRouteResolved] = useState(false);
	const [startupPublicRoute, setStartupPublicRoute] = useState(null);

	// Sync pathname ref for use inside async callbacks
	useEffect(() => {
		pathnameRef.current = pathname;
	}, [pathname]);

	// Initial route hydration (deep links + stored routes)
	useEffect(() => {
		let isMounted = true;
		const hydrateCompletedRef = { current: false };

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
				if (!isAlreadyOnResetPasswordRoute) {
					router.replace("/auth/reset-password");
				}
				return;
			}

			if (isAuthCallback) {
				if (!isAlreadyOnAuthCallbackRoute) {
					router.replace("/auth/callback");
				}
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

			// Prevent loop on base app URLs - no redirect needed
			const isBaseUrl = isBaseAppUrl(url);
		};

		const hydrateInitialRoute = async () => {
			// Guard: prevent duplicate runs if effect re-fires
			if (hydrateCompletedRef.current) return;

			try {
				const url = await Linking.getInitialURL();
				if (url) {
					await handleDeepLink({ url });
				}

				// Always check stored route as fallback, even if URL was present.
				// On Metro reload, Expo Go may provide a URL that doesn't contain
				// routing info, so we rely on the stored last route.
				const restoredPublicRoute =
					(await readStoredAuthReturnRoute()) || (await readStoredPublicRoute());
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
