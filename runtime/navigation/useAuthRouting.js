// app/runtime/navigation/useAuthRouting.js
// PULLBACK NOTE: Startup coordination only.
// OLD: useAuthRouting handled unauthenticated and complete-profile redirects.
// NEW: route group layouts own auth enforcement, and complete-profile is deprecated fallback only.

import { useEffect } from "react";
import { usePathname } from "expo-router";
import { isNormalizedPublicRouteActive } from "./deepLinkHelpers";

/**
 * useAuthRouting
 *
 * Responsibilities:
 * - clear startup public route once the destination is reached
 *
 * NOTE:
 * - app/(user)/_layout.js now enforces authentication only
 * - app/(auth)/_layout.js keeps public auth/map entry available
 * - complete-profile is no longer a mandatory post-auth route
 */
export function useAuthRouting({ startupPublicRoute, setStartupPublicRoute }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!startupPublicRoute) return;
    if (isNormalizedPublicRouteActive(pathname, startupPublicRoute)) {
      setStartupPublicRoute(null);
    }
  }, [pathname, startupPublicRoute, setStartupPublicRoute]);
}
