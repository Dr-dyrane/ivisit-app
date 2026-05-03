// hooks/map/exploreFlow/useMapTrackingStatus.js
// PULLBACK NOTE: Phase 8 — Tracking status visualization hook
// OLD: Status logic scattered in useMapTrackingRuntime and components
// NEW: Centralized status phase + progress tracking with Jotai atoms (5th layer)
// Integrates with 5-layer state management:
//   1. Supabase Realtime (server truth)
//   2. TanStack Query (server cache)
//   3. Zustand (persistent client state)
//   4. XState (trip lifecycle machine)
//   5. Jotai (ephemeral UI state - THIS FILE)

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  trackingStatusPhaseAtom,
  trackingProgressValueAtom,
  hasSheetTitleAnimatedAtom,
  sheetTitleColorAtom,
  heroUnderlayGradientAtom,
  trackingCtaThemeAtom,
} from "../../../atoms/mapScreenAtoms";
import { useTripProgress } from "../../emergency/useTripProgress";
import { useToast } from "../../../contexts/ToastContext";

// Status transition thresholds (progress 0-1)
const STATUS_THRESHOLDS = {
  APPROACHING: 0.7, // 70% progress = approaching destination
  ARRIVED: 0.95,    // 95% progress = arrived
};

/**
 * Maps XState/emergency status to visual status phase
 */
function deriveStatusPhase({
  isArrived,
  isCompleted,
  progress,
  tripStatus,
  bookingStatus,
}) {
  if (isCompleted) return "completed";
  if (isArrived) return "arrived";
  if (progress >= STATUS_THRESHOLDS.ARRIVED) return "arrived";
  if (progress >= STATUS_THRESHOLDS.APPROACHING) return "approaching";
  return "en_route";
}

/**
 * useMapTrackingStatus
 *
 * Manages tracking status visualization state for:
 * - Sheet title animation and color changes
 * - Hero underlay gradient (red → yellow → green)
 * - CTA group theming (muted vs arrival green)
 *
 * @param {Object} params
 * @param {string} params.trackingKind - "ambulance" | "bed" | "idle"
 * @param {Object} params.activeAmbulanceTrip - Active ambulance trip data
 * @param {Object} params.activeBedBooking - Active bed booking data
 * @param {boolean} params.isArrived - XState arrived flag
 * @param {boolean} params.isPendingApproval - XState pending approval flag
 * @param {string} params.ambulanceTripProgress - Trip progress value 0-1
 * @param {number} params.nowMs - Current timestamp for animation sync
 */
export function useMapTrackingStatus({
  trackingKind,
  activeAmbulanceTrip,
  activeBedBooking,
  isArrived,
  isPendingApproval,
  ambulanceTripProgress,
  nowMs,
}) {
  const { showToast } = useToast();

  // Jotai atoms (5th layer - ephemeral UI state)
  const [statusPhase, setStatusPhase] = useAtom(trackingStatusPhaseAtom);
  const [progressValue, setProgressValue] = useAtom(trackingProgressValueAtom);
  const [hasAnimated, setHasAnimated] = useAtom(hasSheetTitleAnimatedAtom);

  // Ref: suppress arrival toast on remount when already arrived; reset on any non-arrived phase
  const hasFiredArrivedToastRef = useRef(statusPhase === "arrived");

  // Derived atoms
  const titleColor = useAtomValue(sheetTitleColorAtom);
  const heroGradient = useAtomValue(heroUnderlayGradientAtom);
  const ctaTheme = useAtomValue(trackingCtaThemeAtom);

  // Calculate raw progress from various sources
  const rawProgress = useMemo(() => {
    if (trackingKind === "idle") return 0;

    if (trackingKind === "ambulance" && activeAmbulanceTrip) {
      // Use trip progress if available
      if (typeof ambulanceTripProgress === "number" && !isNaN(ambulanceTripProgress)) {
        return Math.max(0, Math.min(1, ambulanceTripProgress));
      }

      // Calculate from ETA if available
      const etaSeconds = activeAmbulanceTrip?.etaSeconds;
      const startedAt = activeAmbulanceTrip?.startedAt;
      if (etaSeconds && startedAt) {
        const startTime = typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
        const elapsed = (nowMs || Date.now()) - startTime;
        const total = etaSeconds * 1000;
        return Math.max(0, Math.min(1, elapsed / total));
      }
    }

    if (trackingKind === "bed" && activeBedBooking) {
      // Bed bookings have simpler progress
      const checkInAt = activeBedBooking?.checkInAt;
      const estimatedDuration = activeBedBooking?.estimatedDurationMinutes || 60;

      if (checkInAt) {
        const startTime = typeof checkInAt === "number" ? checkInAt : new Date(checkInAt).getTime();
        const elapsed = (nowMs || Date.now()) - startTime;
        const total = estimatedDuration * 60 * 1000;
        return Math.max(0, Math.min(1, elapsed / total));
      }
    }

    return 0;
  }, [trackingKind, activeAmbulanceTrip, activeBedBooking, ambulanceTripProgress, nowMs]);

  // Derive status phase from all inputs
  const nextStatusPhase = useMemo(() => {
    return deriveStatusPhase({
      isArrived,
      isCompleted: !activeAmbulanceTrip && !activeBedBooking && !isPendingApproval,
      progress: rawProgress,
      tripStatus: activeAmbulanceTrip?.status,
      bookingStatus: activeBedBooking?.status,
    });
  }, [isArrived, activeAmbulanceTrip, activeBedBooking, isPendingApproval, rawProgress]);

  // Sync status phase to atom (with reset of animation flag on change)
  useEffect(() => {
    if (nextStatusPhase !== statusPhase) {
      setStatusPhase(nextStatusPhase);
      setHasAnimated(false); // Reset animation flag for new status

      if (nextStatusPhase === "arrived" && !hasFiredArrivedToastRef.current) {
        hasFiredArrivedToastRef.current = true;
        // PULLBACK NOTE: defer one frame so the button turns green before the toast appears
        requestAnimationFrame(() => showToast("Your driver has arrived", "success"));
      }
      if (nextStatusPhase !== "arrived") {
        hasFiredArrivedToastRef.current = false;
      }
    }
  }, [nextStatusPhase, statusPhase, setStatusPhase, setHasAnimated, showToast]);

  // Sync progress value
  useEffect(() => {
    if (Math.abs(rawProgress - progressValue) > 0.01) {
      setProgressValue(rawProgress);
    }
  }, [rawProgress, progressValue, setProgressValue]);

  // Mark animation as complete
  const markTitleAnimated = useCallback(() => {
    setHasAnimated(true);
  }, [setHasAnimated]);

  // Reset all status state (for cleanup)
  const resetStatus = useCallback(() => {
    setStatusPhase("en_route");
    setProgressValue(0);
    setHasAnimated(false);
  }, [setStatusPhase, setProgressValue, setHasAnimated]);

  return {
    // Status
    statusPhase,
    progressValue: rawProgress,
    shouldAnimateTitle: !hasAnimated,

    // Visual tokens
    titleColor,
    heroGradient,
    ctaTheme,

    // Actions
    markTitleAnimated,
    resetStatus,
  };
}

export default useMapTrackingStatus;
