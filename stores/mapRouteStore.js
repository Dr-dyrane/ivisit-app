import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  getRouteCacheTtlMs,
  isRouteResultFresh,
} from "../services/routeService";

export const IDLE_MAP_ROUTE_STATUS = {
  status: "idle",
  error: null,
  updatedAt: null,
};

export const useMapRouteStore = create(
  immer((set, get) => ({
    routesByKey: {},
    statusesByKey: {},
    activeRequestCount: 0,
    lastRouteKey: null,
    lastResolvedRouteKey: null,
    lastResolvedWasFallback: false,
    lastResolvedSource: null,
    lastError: null,
    lifecycleState: "idle",
    lifecycleError: null,

    setRouteLoading: (routeKey) => {
      if (!routeKey) return;
      set((state) => {
        const previousStatus = state.statusesByKey[routeKey]?.status || "idle";
        state.statusesByKey[routeKey] = {
          status: "loading",
          error: null,
          updatedAt: Date.now(),
        };
        state.lastRouteKey = routeKey;
        state.lastError = null;
        if (previousStatus !== "loading") {
          state.activeRequestCount += 1;
        }
      });
    },

    setRouteResolved: (routeKey, snapshot) => {
      if (!routeKey || !snapshot) return;
      set((state) => {
        const previousStatus = state.statusesByKey[routeKey]?.status || "idle";
        state.routesByKey[routeKey] = snapshot;
        state.statusesByKey[routeKey] = {
          status: snapshot.isFallback ? "fallback" : "resolved",
          error: null,
          updatedAt: Date.now(),
        };
        state.lastRouteKey = routeKey;
        state.lastResolvedRouteKey = routeKey;
        state.lastResolvedWasFallback = snapshot.isFallback === true;
        state.lastResolvedSource = snapshot?.source || null;
        state.lastError = null;
        if (previousStatus === "loading") {
          state.activeRequestCount = Math.max(0, state.activeRequestCount - 1);
        }
      });
    },

    setRouteError: (routeKey, error) => {
      if (!routeKey) return;
      set((state) => {
        const previousStatus = state.statusesByKey[routeKey]?.status || "idle";
        state.statusesByKey[routeKey] = {
          status: "error",
          error: error?.message || String(error || "Unknown error"),
          updatedAt: Date.now(),
        };
        state.lastRouteKey = routeKey;
        state.lastError = error?.message || String(error || "Unknown error");
        if (previousStatus === "loading") {
          state.activeRequestCount = Math.max(0, state.activeRequestCount - 1);
        }
      });
    },

    setLifecycleStatus: (status = {}) => {
      set((state) => {
        state.lifecycleState =
          typeof status?.lifecycleState === "string"
            ? status.lifecycleState
            : state.lifecycleState;
        state.lifecycleError =
          status?.lifecycleError != null
            ? String(status.lifecycleError)
            : status?.lifecycleError === null
              ? null
              : state.lifecycleError;
      });
    },

    getRouteSnapshot: (routeKey) => {
      if (!routeKey) return null;
      const snapshot = get().routesByKey[routeKey];
      return isRouteResultFresh(snapshot) ? snapshot : null;
    },

    getRouteStatus: (routeKey) => {
      if (!routeKey) return IDLE_MAP_ROUTE_STATUS;
      return get().statusesByKey[routeKey] || IDLE_MAP_ROUTE_STATUS;
    },

    pruneExpiredRoutes: (now = Date.now()) => {
      set((state) => {
        let hasExpiredRoute = false;
        Object.keys(state.routesByKey).forEach((routeKey) => {
          const snapshot = state.routesByKey[routeKey];
          const fetchedAtMs = Number(snapshot?.fetchedAtMs);
          const ttlMs = getRouteCacheTtlMs(snapshot);
          if (!Number.isFinite(fetchedAtMs) || now - fetchedAtMs >= ttlMs) {
            hasExpiredRoute = true;
            delete state.routesByKey[routeKey];
            delete state.statusesByKey[routeKey];
          }
        });
        if (!hasExpiredRoute) {
          return;
        }
        state.activeRequestCount = Object.values(state.statusesByKey).filter(
          (status) => status?.status === "loading",
        ).length;
      });
    },
  })),
);

export default useMapRouteStore;
