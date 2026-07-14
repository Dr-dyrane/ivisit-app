// app/runtime/navigation/useAuthRouting.js
// PULLBACK NOTE: Startup and post-auth return coordination only.
// OLD: useAuthRouting handled unauthenticated and complete-profile redirects.
// NEW: route group layouts own auth enforcement, and complete-profile is deprecated fallback only.

import { useEffect, useRef } from "react";
import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import {
  isNormalizedPublicRouteActive,
  normalizeStoredPublicRoute,
} from "./deepLinkHelpers";
import {
  PROTECTED_VISIT_ROUTE_PATH,
  buildProtectedVisitReturnRoute,
} from "./authReturnRoute";
import {
  clearStoredAuthReturnRoute,
  readStoredAuthReturnRoute,
} from "./useRoutePersistence";
import { useAuth } from "../../contexts/AuthContext";

/**
 * useAuthRouting
 *
 * Responsibilities:
 * - clear startup public route once the destination is reached
 * - resume a sanitized auth return route after authentication settles
 *
 * NOTE:
 * - app/(user)/_layout.js now enforces authentication only
 * - app/(auth)/_layout.js keeps public auth/map entry available
 * - complete-profile is no longer a mandatory post-auth route
 */
export function useAuthRouting({ startupPublicRoute, setStartupPublicRoute }) {
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const { user, loading } = useAuth();
  const handedOffRouteRef = useRef(null);

  const isUserMapHome =
    segments?.[0] === "(user)" &&
    (segments.length === 1 || (segments.length === 2 && segments[1] === "index"));
  const activeProtectedReturnRoute = buildProtectedVisitReturnRoute(
    isUserMapHome ? PROTECTED_VISIT_ROUTE_PATH : null,
    {
      mapSheet: params?.mapSheet,
      visitKey: params?.visitKey,
    },
  );
  const isAuthCallbackRoute =
    pathname === "/auth/callback" ||
    (segments?.[0] === "auth" && segments?.[1] === "callback");

  useEffect(() => {
    if (!startupPublicRoute) return;
    if (isNormalizedPublicRouteActive(pathname, startupPublicRoute)) {
      setStartupPublicRoute(null);
    }
  }, [pathname, startupPublicRoute, setStartupPublicRoute]);

  useEffect(() => {
    if (loading || !user.isAuthenticated) {
      handedOffRouteRef.current = null;
      return undefined;
    }
    if (isAuthCallbackRoute) return undefined;

    let cancelled = false;

    const resumeStoredRoute = async () => {
      const returnRoute = await readStoredAuthReturnRoute();
      if (cancelled || !returnRoute) return;

      const publicReturnRoute = normalizeStoredPublicRoute(returnRoute);
      const isDestinationActive = publicReturnRoute
        ? isNormalizedPublicRouteActive(pathname, publicReturnRoute)
        : activeProtectedReturnRoute === returnRoute;

      if (isDestinationActive) {
        await clearStoredAuthReturnRoute();
        handedOffRouteRef.current = null;
        return;
      }

      if (handedOffRouteRef.current === returnRoute) return;
      handedOffRouteRef.current = returnRoute;

      try {
        router.replace(returnRoute);
      } catch (error) {
        handedOffRouteRef.current = null;
        console.warn("[useAuthRouting] Return-route handoff failed:", error);
      }
    };

    void resumeStoredRoute();
    return () => {
      cancelled = true;
    };
  }, [
    activeProtectedReturnRoute,
    isAuthCallbackRoute,
    loading,
    pathname,
    router,
    user.isAuthenticated,
  ]);
}
