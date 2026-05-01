import { useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  mapRouteLastSourceAtom,
  mapRouteRetryBannerVisibleAtom,
} from "../../atoms/mapRouteAtoms";
import { useMapRouteStore } from "../../stores/mapRouteStore";
import { useMapRouteLifecycle } from "./useMapRouteLifecycle";

// PULLBACK NOTE: Map route bootstrap host.
// Owns: single-call lifecycle sync for the shared routing infrastructure.

export function useMapRouteBootstrap() {
  const activeRequestCount = useMapRouteStore(
    (state) => state.activeRequestCount,
  );
  const lastResolvedRouteKey = useMapRouteStore(
    (state) => state.lastResolvedRouteKey,
  );
  const lastResolvedWasFallback = useMapRouteStore(
    (state) => state.lastResolvedWasFallback,
  );
  const lastResolvedSource = useMapRouteStore(
    (state) => state.lastResolvedSource,
  );
  const lastError = useMapRouteStore((state) => state.lastError);
  const setLifecycleStatus = useMapRouteStore(
    (state) => state.setLifecycleStatus,
  );
  const setLastSource = useSetAtom(mapRouteLastSourceAtom);
  const setRetryBannerVisible = useSetAtom(mapRouteRetryBannerVisibleAtom);

  const lifecycle = useMapRouteLifecycle({
    activeRequestCount,
    lastResolvedRouteKey,
    lastResolvedWasFallback,
    lastResolvedSource,
    lastError,
  });

  useEffect(() => {
    setLifecycleStatus({
      lifecycleState: lifecycle.lifecycleState,
      lifecycleError: lifecycle.error,
    });
  }, [lifecycle.error, lifecycle.lifecycleState, setLifecycleStatus]);

  useEffect(() => {
    setLastSource(lifecycle.lastSource || null);
  }, [lifecycle.lastSource, setLastSource]);

  useEffect(() => {
    setRetryBannerVisible(lifecycle.isFallback || lifecycle.isError);
  }, [lifecycle.isError, lifecycle.isFallback, setRetryBannerVisible]);

  return {
    lifecycleState: lifecycle.lifecycleState,
  };
}

export default useMapRouteBootstrap;
