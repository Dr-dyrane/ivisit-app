import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { isEmergencyDebugEnabled } from "../../utils/emergencyDebug";
import {
  mapRouteAutoFitSuppressedAtom,
  mapRouteFitModeAtom,
  mapRouteLastSourceAtom,
  mapRouteRetryBannerVisibleAtom,
} from "../../atoms/mapRouteAtoms";
import mapRouteQueryKeys from "./mapRoute.queryKeys";
import {
  buildRouteKey,
  fetchRouteSnapshot,
  isRouteResultFresh,
  ROUTE_CACHE_GC_MS,
  ROUTE_CACHE_TTL_MS,
} from "../../services/routeService";
import {
  IDLE_MAP_ROUTE_STATUS,
  useMapRouteStore,
} from "../../stores/mapRouteStore";

export const useMapRoute = () => {
  const emergencyDebugEnabled = isEmergencyDebugEnabled();
  const isBrowserRuntime =
    typeof window !== "undefined" && typeof document !== "undefined";
  const queryClient = useQueryClient();
  const [activeRouteKey, setActiveRouteKey] = useState(null);
  const [fitMode, setFitMode] = useAtom(mapRouteFitModeAtom);
  const [autoFitSuppressed, setAutoFitSuppressed] = useAtom(
    mapRouteAutoFitSuppressedAtom,
  );
  const [retryBannerVisible, setRetryBannerVisible] = useAtom(
    mapRouteRetryBannerVisibleAtom,
  );
  const [routeSource, setRouteSource] = useAtom(mapRouteLastSourceAtom);
  const setRouteLoading = useMapRouteStore((state) => state.setRouteLoading);
  const setRouteResolved = useMapRouteStore((state) => state.setRouteResolved);
  const setRouteError = useMapRouteStore((state) => state.setRouteError);
  const getRouteSnapshot = useMapRouteStore((state) => state.getRouteSnapshot);
  const pruneExpiredRoutes = useMapRouteStore(
    (state) => state.pruneExpiredRoutes,
  );
  const routeSnapshot = useMapRouteStore(
    useCallback(
      (state) =>
        activeRouteKey ? state.routesByKey[activeRouteKey] || null : null,
      [activeRouteKey],
    ),
  );
  const routeStatus = useMapRouteStore(
    useCallback(
      (state) =>
        activeRouteKey
          ? state.statusesByKey[activeRouteKey] || IDLE_MAP_ROUTE_STATUS
          : IDLE_MAP_ROUTE_STATUS,
      [activeRouteKey],
    ),
  );

  const routeCoordinates = useMemo(
    () =>
      Array.isArray(routeSnapshot?.coordinates)
        ? routeSnapshot.coordinates
        : [],
    [routeSnapshot?.coordinates],
  );
  const routeInfo = useMemo(
    () => ({
      durationSec: routeSnapshot?.durationSec ?? null,
      distanceMeters: routeSnapshot?.distanceMeters ?? null,
    }),
    [routeSnapshot?.distanceMeters, routeSnapshot?.durationSec],
  );
  const isFallbackRoute = Boolean(routeSnapshot?.isFallback);
  const isCalculatingRoute = routeStatus?.status === "loading";

  const calculateRoute = useCallback(
    async (origin, destination) => {
      if (!origin || !destination) {
        if (emergencyDebugEnabled) {
          console.warn("[useMapRoute] Missing origin or destination");
        }
        return;
      }

      const routeKey = buildRouteKey(origin, destination);
      if (!routeKey) {
        return;
      }
      setActiveRouteKey(routeKey);
      pruneExpiredRoutes();

      const cachedStoreRoute = getRouteSnapshot(routeKey);
      if (cachedStoreRoute) {
        setRouteSource(cachedStoreRoute?.source || null);
        setRetryBannerVisible(cachedStoreRoute?.isFallback === true);
        return cachedStoreRoute;
      }

      const queryKey = mapRouteQueryKeys.detail({ routeKey });
      const cachedQueryRoute = queryClient.getQueryData(queryKey);
      if (isRouteResultFresh(cachedQueryRoute)) {
        setRouteResolved(routeKey, cachedQueryRoute);
        setRouteSource(cachedQueryRoute?.source || null);
        setRetryBannerVisible(cachedQueryRoute?.isFallback === true);
        return cachedQueryRoute;
      }

      if (cachedQueryRoute && !isRouteResultFresh(cachedQueryRoute)) {
        queryClient.removeQueries({ queryKey, exact: true });
      }

      setRouteLoading(routeKey);
      setRetryBannerVisible(false);

      try {
        const result = await queryClient.fetchQuery({
          queryKey,
          queryFn: async () =>
            fetchRouteSnapshot({
              origin,
              destination,
              debug: emergencyDebugEnabled,
              isBrowserRuntime,
            }),
          staleTime: ROUTE_CACHE_TTL_MS,
          gcTime: ROUTE_CACHE_GC_MS,
        });

        if (result) {
          const normalizedDurationSec = Number.isFinite(result.durationSec)
            ? result.durationSec === 0
              ? 900
              : Math.max(result.durationSec, 60)
            : null;
          const normalizedResult = {
            ...result,
            durationSec: normalizedDurationSec,
          };
          setRouteResolved(routeKey, {
            ...normalizedResult,
          });
          setRouteSource(normalizedResult?.source || null);
          setRetryBannerVisible(normalizedResult?.isFallback === true);
          if (emergencyDebugEnabled) {
            console.log("[useMapRoute] Route calculated:", {
              routeKey,
              distance: normalizedResult.distanceMeters,
              duration: normalizedResult.durationSec,
              fallback: Boolean(normalizedResult.isFallback),
            });
          }
          return normalizedResult;
        }
      } catch (err) {
        console.error("[useMapRoute] Route calculation failed:", err);
        setRouteError(routeKey, err);
        setRouteSource(null);
        setRetryBannerVisible(true);
      } finally {
        pruneExpiredRoutes();
      }

      return null;
    },
    [
      emergencyDebugEnabled,
      getRouteSnapshot,
      isBrowserRuntime,
      pruneExpiredRoutes,
      queryClient,
      setRetryBannerVisible,
      setRouteError,
      setRouteLoading,
      setRouteResolved,
      setRouteSource,
    ],
  );

  const clearRoute = useCallback(() => {
    setActiveRouteKey(null);
    setRouteSource(null);
    setRetryBannerVisible(false);
  }, [setRetryBannerVisible, setRouteSource]);

  const dismissRetryBanner = useCallback(() => {
    setRetryBannerVisible(false);
  }, [setRetryBannerVisible]);

  return {
    routeCoordinates,
    routeInfo,
    isFallbackRoute,
    isCalculatingRoute,
    fitMode,
    setFitMode,
    autoFitSuppressed,
    setAutoFitSuppressed,
    retryBannerVisible,
    dismissRetryBanner,
    routeSource,
    calculateRoute,
    clearRoute,
  };
};
