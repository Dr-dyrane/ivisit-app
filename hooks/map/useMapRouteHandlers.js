// hooks/map/useMapRouteHandlers.js
//
// PULLBACK NOTE: MapScreen decomposition Pass 7 — extracted from MapScreen.jsx lines 244-514
// OLD: Route param parsing, handler callbacks, route visit detail effect, and location prompt
//      effect all lived inline in MapScreen (~200 lines)
// NEW: Owned here — MapScreen passes dependencies, hook returns handlers and route params
//
// Owns:
//   - Route param parsing (mapSheet, visitKey, historyFilter)
//   - Handler callbacks (profile sign-out, book from care, rate history visit, location sheet,
//     location intent from search, close recent visits, history filter change)
//   - Route visit detail effect (opens visit detail from route params)
//   - Location selection prompt effect (auto-prompts for pickup location)
//   - Refs for effect gating (hydrated route truth, pickup prompt)
//
// Does NOT own:
//   - params — from useLocalSearchParams, passed in
//   - logout, clearCommitFlow — from useAuth/useEmergency, passed in
//   - router — from expo-router, passed in
//   - State setters (setCareHistoryVisible, setRecentVisitsVisible, setSheetPhase, setSheetPayload)
//     — from useMapExploreFlow, passed in
//   - sheetPhase, sheetSnapState — from useMapExploreFlow, passed in
//   - History state (selectedHistoryVisit, selectedHistoryVisitKey)
//     — from useMapHistoryFlow, passed in
//   - History handlers (openRatingForVisit, closeHistoryVisitDetails, openHistoryVisitByKey)
//     — from useMapHistoryFlow, passed in
//   - locationControl — from useMapExploreFlow, passed in
//   - showToast — from ToastContext, passed in

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MAP_SHEET_PHASES } from "../../components/map/core/MapSheetOrchestrator";
import { useVisitByIdQuery } from "../visits/useVisitByIdQuery";
import {
  resolveVisitDetailRouteState,
  VISIT_DETAIL_ROUTE_STATUS,
} from "../visits/visitDetailRouteState";

/**
 * useMapRouteHandlers
 *
 * Manages route param parsing, handler callbacks, and route-managed effects for the Map screen.
 * - Parses route params (mapSheet, visitKey, historyFilter)
 * - Provides handler callbacks for profile, booking, rating, location, and history actions
 * - Opens visit detail from route params with failure handling
 * - Auto-prompts for pickup location when required
 *
 * @param {Object} params
 * @param {Object} params.params - Route params from useLocalSearchParams
 * @param {Function} params.logout - Auth logout function
 * @param {Function} params.clearCommitFlow - Emergency commit flow clear function
 * @param {Object} params.router - Expo Router instance
 * @param {Function} params.setCareHistoryVisible - Set care history modal visibility
 * @param {Function} params.setRecentVisitsVisible - Set recent visits modal visibility
 * @param {Function} params.setSheetPhase - Set sheet phase
 * @param {Function} params.setSheetPayload - Set sheet payload
 * @param {string} params.sheetPhase - Current sheet phase
 * @param {string} params.sheetSnapState - Current sheet snap state
 * @param {Object} params.selectedHistoryVisit - Selected history visit
 * @param {string} params.selectedHistoryVisitKey - Selected history visit key
 * @param {Function} params.openRatingForVisit - Open rating modal for visit
 * @param {Function} params.closeHistoryVisitDetails - Close history visit details
 * @param {Function} params.openHistoryVisitByKey - Open history visit by key
 * @param {Object} params.locationControl - Location control object
 * @param {Function} params.showToast - Show toast function
 */
export function useMapRouteHandlers({
  params,
  logout,
  clearCommitFlow,
  router,
  setCareHistoryVisible,
  setRecentVisitsVisible,
  setSheetPhase,
  setSheetPayload,
  sheetPhase,
  sheetSnapState,
  selectedHistoryVisit,
  selectedHistoryVisitKey,
  openRatingForVisit,
  closeHistoryVisitDetails,
  openHistoryVisitByKey,
  beginRouteManagedVisitDetail,
  userId,
  locationControl,
  showToast,
}) {
  // Refs for effect gating
  const routeVisitHydratedRef = useRef({ key: null, data: null });
  const hasPromptedForPickupRef = useRef(false);

  // Route param parsing
  const routeMapSheet =
    typeof params?.mapSheet === "string"
      ? params.mapSheet
      : Array.isArray(params?.mapSheet)
        ? params.mapSheet[0]
        : null;
  const routeVisitKey =
    typeof params?.visitKey === "string"
      ? params.visitKey
      : Array.isArray(params?.visitKey)
        ? params.visitKey[0]
        : null;
  const routeHistoryFilter =
    typeof params?.historyFilter === "string"
      ? params.historyFilter
      : Array.isArray(params?.historyFilter)
        ? params.historyFilter[0]
        : null;
  const isRouteManagedRecentVisits = routeMapSheet === "recent_visits";
  const wantsRouteVisitDetail =
    routeMapSheet === "visit_detail" && Boolean(routeVisitKey);
  const routeVisitQuery = useVisitByIdQuery({
    visitKey: routeVisitKey,
    userId,
    enabled: wantsRouteVisitDetail && Boolean(userId),
  });
  const retryRouteVisit = useCallback(() => {
    void routeVisitQuery.refetch();
  }, [routeVisitQuery.refetch]);
  const routeVisitDetailState = useMemo(() => ({
    ...resolveVisitDetailRouteState({
      enabled: wantsRouteVisitDetail,
      hasUser: Boolean(userId),
      data: routeVisitQuery.data,
      error: routeVisitQuery.error,
      isLoading: routeVisitQuery.isLoading,
      isFetching: routeVisitQuery.isFetching,
    }),
    onRetry: retryRouteVisit,
  }), [
    retryRouteVisit,
    routeVisitQuery.data,
    routeVisitQuery.error,
    routeVisitQuery.isFetching,
    routeVisitQuery.isLoading,
    userId,
    wantsRouteVisitDetail,
  ]);

  // Handler: Profile sign-out
  const handleProfileSignOut = useCallback(async () => {
    const result = await logout();
    if (result?.success) {
      clearCommitFlow?.();
    }
    return result;
  }, [clearCommitFlow, logout]);

  // Handler: Book visit from care (temporary bridge to legacy route)
  // PULLBACK NOTE: This stays in MapScreen per useMapHistoryFlow PULLBACK NOTE (line 23)
  // This is a temporary bridge until Pass 12 booking rebuild
  const handleBookVisitFromCare = useCallback(() => {
    setCareHistoryVisible(false);
    router.push("/(user)/(stacks)/book-visit");
  }, [router, setCareHistoryVisible]);

  // Handler: Rate history visit
  const handleRateHistoryVisit = useCallback(() => {
    if (!selectedHistoryVisit?.id || !selectedHistoryVisit?.canRate) return;
    // PULLBACK NOTE: VD-2 — consolidated into single rating path via openRatingForVisit.
    // completionCommitted: true so neither skipRating nor submitRating tries to stop a trip.
    openRatingForVisit(selectedHistoryVisit);
    closeHistoryVisitDetails();
  }, [closeHistoryVisitDetails, openRatingForVisit, selectedHistoryVisit]);

  // Handler: Open location sheet
  const handleOpenLocationSheet = useCallback(() => {
    setSheetPayload(null);
    setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
  }, [setSheetPayload, setSheetPhase]);

  // Handler: Open location intent from search (preserves query)
  const handleOpenLocationIntentFromSearch = useCallback(
    (options = {}) => {
      const preservedQuery =
        typeof options?.query === "string" && options.query.trim().length > 0
          ? options.query.trim()
          : null;
      const sourcePhase =
        typeof options?.sourcePhase === "string"
          ? options.sourcePhase
          : MAP_SHEET_PHASES.SEARCH;
      const sourceSnapState = options?.sourceSnapState || sheetSnapState;
      setSheetPayload({
        sourcePhase,
        sourceSnapState,
        sourcePayload: options?.sourcePayload || null,
        intentMode: preservedQuery ? "addressSearch" : options?.intentMode || null,
        addressQuery: preservedQuery,
      });
      setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
    },
    [setSheetPayload, setSheetPhase, sheetSnapState],
  );

  // Handler: Close recent visits (with route fallback)
  const handleCloseRecentVisits = useCallback(() => {
    setRecentVisitsVisible(false);
    if (isRouteManagedRecentVisits) {
      router.replace("/(user)");
    }
  }, [isRouteManagedRecentVisits, router, setRecentVisitsVisible]);

  // Handler: Route-managed history filter change
  const handleRouteManagedHistoryFilterChange = useCallback(
    (nextFilter) => {
      if (!isRouteManagedRecentVisits) return;

      const nextParams =
        nextFilter && nextFilter !== "all"
          ? {
              mapSheet: "recent_visits",
              historyFilter: nextFilter,
            }
          : {
              mapSheet: "recent_visits",
            };

      router.replace({
        pathname: "/(user)",
        params: nextParams,
      });
    },
    [isRouteManagedRecentVisits, router],
  );

  // Effect: Route visit detail (opens visit detail from route params)
  useEffect(() => {
    if (!wantsRouteVisitDetail) {
      routeVisitHydratedRef.current = { key: null, data: null };
      return;
    }

    if (routeVisitQuery.data) {
      const alreadyHydrated = routeVisitHydratedRef.current.key === routeVisitKey
        && routeVisitHydratedRef.current.data === routeVisitQuery.data;
      if (!alreadyHydrated) {
        const didOpenHydrated = openHistoryVisitByKey(routeVisitKey, {
          routeManaged: true,
          visit: routeVisitQuery.data,
        });
        if (didOpenHydrated) {
          routeVisitHydratedRef.current = {
            key: routeVisitKey,
            data: routeVisitQuery.data,
          };
        }
      }
      return;
    }

    const hasMatchingSelection = sheetPhase === MAP_SHEET_PHASES.VISIT_DETAIL
      && String(selectedHistoryVisitKey || "") === String(routeVisitKey)
      && Boolean(selectedHistoryVisit);
    if (hasMatchingSelection
      && routeVisitDetailState.status === VISIT_DETAIL_ROUTE_STATUS.LOADING) return;

    if (routeVisitDetailState.status === VISIT_DETAIL_ROUTE_STATUS.LOADING) {
      const didOpenFromList = openHistoryVisitByKey(routeVisitKey, {
        routeManaged: true,
      });
      if (didOpenFromList) return;
      if (
        sheetPhase !== MAP_SHEET_PHASES.VISIT_DETAIL ||
        String(selectedHistoryVisitKey || "") !== String(routeVisitKey)
      ) {
        beginRouteManagedVisitDetail?.(routeVisitKey);
      }
      return;
    }

    if (sheetPhase !== MAP_SHEET_PHASES.VISIT_DETAIL
      || String(selectedHistoryVisitKey || "") !== String(routeVisitKey)) {
      beginRouteManagedVisitDetail?.(routeVisitKey);
    }
  }, [
    beginRouteManagedVisitDetail,
    openHistoryVisitByKey,
    routeMapSheet,
    routeVisitKey,
    routeVisitDetailState.status,
    routeVisitQuery.data,
    selectedHistoryVisit,
    selectedHistoryVisitKey,
    sheetPhase,
    wantsRouteVisitDetail,
  ]);

  // Effect: Location selection prompt (auto-prompts for pickup location)
  useEffect(() => {
    if (!locationControl?.requiresLocationSelection) {
      return;
    }
    if (hasPromptedForPickupRef.current) {
      return;
    }
    if (sheetPhase !== MAP_SHEET_PHASES.EXPLORE_INTENT) {
      return;
    }

    hasPromptedForPickupRef.current = true;
    setSheetPhase(MAP_SHEET_PHASES.LOCATION_INTENT);
  }, [
    locationControl?.requiresLocationSelection,
    setSheetPhase,
    sheetPhase,
  ]);

  return {
    // Route params
    routeMapSheet,
    routeVisitKey,
    routeHistoryFilter,
    isRouteManagedRecentVisits,
    routeVisitDetailState,

    // Handlers
    handleProfileSignOut,
    handleBookVisitFromCare,
    handleRateHistoryVisit,
    handleOpenLocationSheet,
    handleOpenLocationIntentFromSearch,
    handleCloseRecentVisits,
    handleRouteManagedHistoryFilterChange,
  };
}
