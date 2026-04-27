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
// Audit reference: docs/audit/TRACKING_SHEET_PHASE_AUDIT_2026-04-26.md §2.4
// Learning reference: docs/architecture/TRACKING_SHEET_LEARNINGS.md §2.1

import { useCallback } from "react";
import { useAtom } from "jotai";
import {
  trackingRatingStateAtom,
  INITIAL_TRACKING_RATING_STATE,
} from "../../../atoms/mapScreenAtoms";
import {
  buildTrackingResolutionToast,
  resolveTrackingRatingSkip,
  resolveTrackingRatingSubmit,
  deleteTrackingRatingRecoveryClaim,
} from "../../../components/map/views/tracking/mapTracking.rating";

/**
 * useTrackingRatingFlow
 *
 * Drives the in-flow tracking rating modal from MapScreen level.
 * Survives sheet phase transitions because the renderer is at the screen root
 * (not inside MapTrackingStageBase, which only mounts during TRACKING phase).
 *
 * @param {Object} params
 * @param {Function} params.updateVisit
 * @param {Function} params.showToast
 * @param {Function} params.stopAmbulanceTrip
 * @param {Function} params.stopBedBooking
 * @returns {{
 *   ratingState: object,
 *   closeRating: () => void,
 *   skipRating: () => Promise<boolean>,
 *   submitRating: (input: { rating: number, comment?: string, tipAmount?: number, tipCurrency?: string }) => Promise<boolean>,
 * }}
 */
export function useTrackingRatingFlow({
  updateVisit,
  showToast,
  stopAmbulanceTrip,
  stopBedBooking,
}) {
  const [ratingState, setRatingState] = useAtom(trackingRatingStateAtom);

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
      updateVisit,
      deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
    });
    if (!resolution.ok) {
      showToast?.("Could not close rating right now.", "error");
      return false;
    }
    const completeKind = ratingState?.completeKind;
    const serviceType = ratingState?.serviceType;
    const hospitalTitle = ratingState?.serviceDetails?.hospital ?? null;
    setRatingState(INITIAL_TRACKING_RATING_STATE);
    finalizeCompletedTracking(completeKind);
    const skipToast = buildTrackingResolutionToast({
      action: "skipped",
      serviceType,
      hospitalTitle,
    });
    showToast?.(skipToast.message, skipToast.level);
    return true;
  }, [
    finalizeCompletedTracking,
    ratingState?.completeKind,
    ratingState?.serviceDetails?.hospital,
    ratingState?.serviceType,
    ratingState?.visitId,
    setRatingState,
    showToast,
    updateVisit,
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
        updateVisit,
        deleteRecoveryClaim: deleteTrackingRatingRecoveryClaim,
      });
      if (!resolution.ok) {
        showToast?.("Could not save your rating right now.", "error");
        return false;
      }
      if (resolution.tipError) {
        console.warn("[useTrackingRatingFlow] Tip processing failed:", resolution.tipError);
      }
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
      setRatingState(INITIAL_TRACKING_RATING_STATE);
      finalizeCompletedTracking(completeKind);
      return true;
    },
    [
      finalizeCompletedTracking,
      ratingState?.completeKind,
      ratingState?.serviceDetails?.hospital,
      ratingState?.serviceType,
      ratingState?.visitId,
      setRatingState,
      showToast,
      updateVisit,
    ],
  );

  return {
    ratingState,
    closeRating,
    skipRating,
    submitRating,
  };
}

export default useTrackingRatingFlow;
