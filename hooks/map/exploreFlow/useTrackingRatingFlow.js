// hooks/map/exploreFlow/useTrackingRatingFlow.js
//
// PULLBACK NOTE: Phase 8 — Pass B (Lift in-flow rating modal)
// OLD: <ServiceRatingModal/> rendered inside MapTrackingStageBase. When the
//      tracking sheet phase changed, the modal unmounted before the user could
//      respond. State lived in `useMapTrackingController` via Jotai atom but
//      the renderer location was the actual defect.
// NEW: Renderer lifted to MapScreen. This hook owns the close/skip/submit
//      handlers that drive the lifted renderer. Reads/writes the persisted
//      `trackingRatingStateAtom`. Trigger (open) still lives in the controller
//      where the completion business logic exists.
//
// Audit reference: docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md section 2.4
// Learning reference: docs/architecture/TRACKING_SHEET_LEARNINGS.md section 2.1

import { useCallback, useMemo } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  ratingRecoveryClaimsAtom,
  recoveredRatingStateAtom,
  trackingRatingStateAtom,
  INITIAL_TRACKING_RATING_STATE,
} from "../../../atoms/mapScreenAtoms";
import {
  buildTrackingResolutionToast,
  resolveTrackingRatingSkip,
  resolveTrackingRatingSubmit,
  deleteTrackingRatingRecoveryClaim,
  shouldPresentTrackingRatingState,
} from "../../../components/map/views/tracking/mapTracking.rating";

const normalizeHistoryServiceType = (requestType) => {
  if (requestType === "ambulance") return "ambulance";
  if (requestType === "bed") return "bed";
  return "visit";
};

const buildHistoryVisitRatingState = (historyItem) => {
  if (!historyItem?.id) return null;
  const serviceType = normalizeHistoryServiceType(historyItem.requestType);
  const title =
    serviceType === "ambulance"
      ? "Rate your transport"
      : serviceType === "bed"
        ? "Rate your stay"
        : "Rate your visit";
  return {
    visible: true,
    visitId: historyItem.id,
    completeKind: null,
    completionCommitted: true,
    serviceType,
    title,
    subtitle: historyItem.facilityName ? `For ${historyItem.facilityName}` : null,
    serviceDetails: {
      hospital: historyItem.facilityName || null,
      provider:
        historyItem.doctorName ||
        historyItem.actorName ||
        (serviceType === "ambulance" ? "Emergency services" : "Care team"),
    },
  };
};

/**
 * useTrackingRatingFlow
 *
 * Drives the in-flow tracking rating modal from MapScreen level.
 * Survives sheet phase transitions because the renderer is at the screen root
 * (not inside MapTrackingStageBase, which only mounts during TRACKING phase).
 *
 * @param {Object} params
 * @param {Function} params.showToast
 * @param {Function} params.stopAmbulanceTrip
 * @param {Function} params.stopBedBooking
 * @param {Function} params.suppressRecoveredRatingForSession
 * @param {Array}    params.visits - visits array from VisitsContext (already loaded)
 *   Used once on mount to validate persisted ratingState.visible against server truth.
 *   If the visit is already RATED, the atom is reset before the modal can surface.
 *   (BUG-012 fix — PC class: persisted atom boolean validated on cold-start hydration)
 * @returns {{
 *   ratingState: object,
 *   closeRating: () => void,
 *   skipRating: () => Promise<boolean>,
 *   submitRating: (input: { rating: number, comment?: string, tipAmount?: number, tipCurrency?: string }) => Promise<boolean>,
 * }}
 */
export function useTrackingRatingFlow({
  showToast,
  stopAmbulanceTrip,
  stopBedBooking,
  suppressRecoveredRatingForSession,
  onAfterResolution,
  onAfterSubmit,
  visits,
}) {
  const [ratingState, setRatingState] = useAtom(trackingRatingStateAtom);
  const setRatingRecoveryClaims = useSetAtom(ratingRecoveryClaimsAtom);
  const setRecoveredRatingState = useSetAtom(recoveredRatingStateAtom);

  const removeRecoveredRatingClaim = useCallback(
    async (visitId) => {
      if (!visitId) return;
      const normalizedVisitId = String(visitId);
      setRatingRecoveryClaims((currentClaims) => {
        if (!currentClaims || !currentClaims[normalizedVisitId]) return currentClaims;
        const nextClaims = { ...currentClaims };
        delete nextClaims[normalizedVisitId];
        return nextClaims;
      });
    },
    [setRatingRecoveryClaims],
  );

  // PULLBACK NOTE: BUG-012 fix — PC class (Phase Contamination / persisted atom validation)
  // OLD: useEffect+useRef side-effect that wrote back to the atom — layer violation
  //      (reactive side-effect on a data dependency belongs in derived state, not useEffect).
  // NEW: pure useMemo derivation — reads atom + visits, returns validated shape without writing.
  //      Layer: L5 derived read (Jotai atom is source of truth; visits is context-provided truth).
  //      Hydration prevents visible:true on cold start. A committed in-flow handoff remains
  //      visible while its invalidated visits query catches up, but rated server truth wins.
  const validatedRatingState = useMemo(() => {
    return shouldPresentTrackingRatingState(ratingState, visits)
      ? ratingState
      : INITIAL_TRACKING_RATING_STATE;
  }, [ratingState, visits]);

  const finalizeCompletedTracking = useCallback(
    (completeKind) => {
      if (completeKind === "ambulance") {
        stopAmbulanceTrip?.();
        return;
      }
      if (completeKind === "bed") {
        stopBedBooking?.();
      }
    },
    [stopAmbulanceTrip, stopBedBooking],
  );

  const closeRating = useCallback(() => {
    setRatingState(INITIAL_TRACKING_RATING_STATE);
  }, [setRatingState]);

  const skipRating = useCallback(async () => {
    const visitId = ratingState?.visitId;
    if (!visitId) {
      setRatingState(INITIAL_TRACKING_RATING_STATE);
      return true;
    }
    const resolution = await resolveTrackingRatingSkip({
      visitId,
      deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
    });
    if (!resolution.ok) {
      showToast?.("Could not close rating right now.", "error");
      return false;
    }
    const completeKind = ratingState?.completeKind;
    const serviceType = ratingState?.serviceType;
    const hospitalTitle = ratingState?.serviceDetails?.hospital ?? null;
    suppressRecoveredRatingForSession?.(visitId);
    // Keep the in-memory claim closed before removing the terminal request or
    // hiding the in-flow modal. The recovered-rating effect observes both
    // independently; reversing this order lets it reopen the same visit for
    // one render and recreates the double-rating sheet.
    await removeRecoveredRatingClaim(visitId);
    setRatingState(INITIAL_TRACKING_RATING_STATE);
    finalizeCompletedTracking(completeKind);
    // PULLBACK NOTE: VD-B4 — 5th layer refetch after skip
    onAfterResolution?.();
    const skipToast = buildTrackingResolutionToast({
      action: "skipped",
      serviceType,
      hospitalTitle,
    });
    showToast?.(skipToast.message, skipToast.level);
    return true;
  }, [
    onAfterResolution,
    finalizeCompletedTracking,
    suppressRecoveredRatingForSession,
    ratingState?.completeKind,
    ratingState?.serviceDetails?.hospital,
    ratingState?.serviceType,
    ratingState?.visitId,
    removeRecoveredRatingClaim,
    setRatingState,
    showToast,
  ]);

  const submitRating = useCallback(
    async ({ rating, comment, tipAmount, tipCurrency }) => {
      const visitId = ratingState?.visitId;
      if (!visitId) return false;
      const resolution = await resolveTrackingRatingSubmit({
        visitId,
        rating,
        comment,
        tipAmount,
        tipCurrency,
        deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
      });
      if (!resolution.ok) {
        showToast?.("Could not save your rating right now.", "error");
        return false;
      }
      if (resolution.tipError) {
        console.warn("[useTrackingRatingFlow] Tip processing failed:", resolution.tipError);
      }
      suppressRecoveredRatingForSession?.(visitId);
      const completeKind = ratingState?.completeKind;
      const serviceType = ratingState?.serviceType;
      const hospitalTitle = ratingState?.serviceDetails?.hospital ?? null;
      const successToast = buildTrackingResolutionToast({
        action: "rated",
        serviceType,
        hospitalTitle,
        tipAmount,
        tipError: resolution.tipError,
      });
      showToast?.(successToast.message, successToast.level);
      await removeRecoveredRatingClaim(visitId);
      setRatingState(INITIAL_TRACKING_RATING_STATE);
      finalizeCompletedTracking(completeKind);
      // PULLBACK NOTE: VD-B4 — 5th layer refetch after submit
      onAfterResolution?.();
      // PULLBACK NOTE: VD-2 — notify caller with visitId so screen-level side effects
      // (e.g. re-open visit detail) can be applied without leaking state into this hook.
      onAfterSubmit?.({ visitId });
      return true;
    },
    [
      onAfterResolution,
      onAfterSubmit,
      finalizeCompletedTracking,
      suppressRecoveredRatingForSession,
      ratingState?.completeKind,
      ratingState?.serviceDetails?.hospital,
      ratingState?.serviceType,
      ratingState?.visitId,
      setRatingState,
      showToast,
    ],
  );

  // PULLBACK NOTE: VD-2 — entrypoint for history visit detail "Rate" CTA.
  // Uses the same trackingRatingStateAtom + modal renderer as in-flow completions.
  // completionCommitted: true (trip already done), completeKind: null (no Zustand cleanup needed).
  const openRatingForVisit = useCallback(
    (historyItem) => {
      const nextState = buildHistoryVisitRatingState(historyItem);
      if (!nextState) return;
      setRecoveredRatingState(null);
      setRatingState(nextState);
    },
    [setRatingState, setRecoveredRatingState],
  );

  return {
    ratingState: validatedRatingState,
    closeRating,
    skipRating,
    submitRating,
    openRatingForVisit,
  };
}

export default useTrackingRatingFlow;
