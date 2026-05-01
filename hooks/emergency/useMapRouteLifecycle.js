import { useMachine } from "@xstate/react";
import { useCallback, useEffect, useRef } from "react";
import { MapRouteState, mapRouteMachine } from "../../machines/mapRouteMachine";

// PULLBACK NOTE: Map route five-layer completion - Layer 4 lifecycle adapter.

export function useMapRouteLifecycle({
  activeRequestCount,
  lastResolvedRouteKey,
  lastResolvedWasFallback,
  lastResolvedSource,
  lastError,
}) {
  const [snapshot, send] = useMachine(mapRouteMachine);
  const resolutionSignatureRef = useRef(null);
  const errorSignatureRef = useRef(null);

  useEffect(() => {
    if (activeRequestCount > 0) {
      errorSignatureRef.current = null;
      resolutionSignatureRef.current = null;
      send({ type: "ROUTE_REQUESTED" });
    }
  }, [activeRequestCount, send]);

  useEffect(() => {
    if (!lastResolvedRouteKey) return;
    const signature = [
      lastResolvedRouteKey,
      lastResolvedWasFallback ? "fallback" : "resolved",
      lastResolvedSource || "unknown",
    ].join("::");

    if (resolutionSignatureRef.current === signature) return;
    resolutionSignatureRef.current = signature;

    send({
      type: lastResolvedWasFallback ? "ROUTE_FALLBACK" : "ROUTE_RESOLVED",
      source: lastResolvedSource || null,
    });
  }, [lastResolvedRouteKey, lastResolvedSource, lastResolvedWasFallback, send]);

  useEffect(() => {
    if (!lastError) return;
    if (errorSignatureRef.current === lastError) return;
    errorSignatureRef.current = lastError;
    send({
      type: "ROUTE_ERROR",
      error: lastError,
    });
  }, [lastError, send]);

  const reset = useCallback(() => {
    send({ type: "RESET" });
  }, [send]);

  return {
    mapRouteLifecycleSnapshot: snapshot,
    send,
    lifecycleState: snapshot.value,
    isIdle: snapshot.matches(MapRouteState.IDLE),
    isResolving: snapshot.matches(MapRouteState.RESOLVING),
    isResolved: snapshot.matches(MapRouteState.RESOLVED),
    isFallback: snapshot.matches(MapRouteState.FALLBACK),
    isError: snapshot.matches(MapRouteState.ERROR),
    error: snapshot.context.error || null,
    lastSource: snapshot.context.lastSource || null,
    reset,
  };
}

export default useMapRouteLifecycle;
