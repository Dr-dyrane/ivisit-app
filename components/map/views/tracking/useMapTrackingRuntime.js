import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { trackingRouteInfoAtom } from "../../../../atoms/mapScreenAtoms";
import { EmergencyRequestStatus } from "../../../../services/emergencyRequestsService";
import { useEmergencyHandlers } from "../../../../hooks/emergency/useEmergencyHandlers";
import { useTripProgress } from "../../../../hooks/emergency/useTripProgress";
import { useBedBookingProgress } from "../../../../hooks/emergency/useBedBookingProgress";
import {
	hasMeaningfulTriageDraftData,
	normalizeTriageDraft,
	triageStepAnswered,
} from "../../../emergency/triage/triageFlow.shared";
import { buildMapCommitTriageSteps } from "../commitTriage/mapCommitTriage.helpers";
import { buildTrackingViewState } from "./mapTracking.derived";

export const TRACKING_TRIAGE_STEP_FLOOR = 7;

export function useMapTrackingRuntime({
	hospitals = [],
	allHospitals = [],
	hospital,
	payload = null,
	activeMapRequest = null,
	currentLocation = null,
	routeInfo = null,
	activeAmbulanceTrip,
	ambulanceTelemetryHealth,
	activeBedBooking,
	pendingApproval,
	// PULLBACK NOTE: Phase 5b — XState lifecycle flags (optional, fall back to raw status)
	// OLD: canMarkArrived/canComplete derived from activeAmbulanceTrip?.status comparisons
	// NEW: isArrived/isPendingApproval passed from context, machine is source of truth
	isArrived: isArrivedProp,
	isPendingApproval: isPendingApprovalProp,
	isDarkMode,
	setRequestStatus,
	cancelVisit,
	completeVisit,
	updateVisit,
	setAmbulanceTripStatus,
	setBedBookingStatus,
	stopAmbulanceTrip,
	stopBedBooking,
}) {
	const [nowMs, setNowMs] = useState(Date.now());

	useEffect(() => {
		setNowMs(Date.now());
		const intervalId = setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(intervalId);
	}, []);

	const triageRequestId =
		activeMapRequest?.requestId ||
		activeAmbulanceTrip?.requestId ||
		activeBedBooking?.requestId ||
		pendingApproval?.requestId ||
		null;
	const triageRequestDraft = useMemo(
		() =>
			normalizeTriageDraft(
				activeAmbulanceTrip?.triage?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin ||
					activeAmbulanceTrip?.triageCheckin ||
					activeBedBooking?.triage?.signals?.userCheckin ||
					activeBedBooking?.triageSnapshot?.signals?.userCheckin ||
					activeBedBooking?.triageCheckin ||
					pendingApproval?.triage?.signals?.userCheckin ||
					pendingApproval?.triageSnapshot?.signals?.userCheckin ||
					pendingApproval?.initiatedData?.triageCheckin ||
					null,
			),
		[
			activeAmbulanceTrip?.triage?.signals?.userCheckin,
			activeAmbulanceTrip?.triageCheckin,
			activeAmbulanceTrip?.triageSnapshot?.signals?.userCheckin,
			activeBedBooking?.triage?.signals?.userCheckin,
			activeBedBooking?.triageCheckin,
			activeBedBooking?.triageSnapshot?.signals?.userCheckin,
			pendingApproval?.initiatedData?.triageCheckin,
			pendingApproval?.triage?.signals?.userCheckin,
			pendingApproval?.triageSnapshot?.signals?.userCheckin,
		],
	);
	const triageSteps = useMemo(() => buildMapCommitTriageSteps(false), []);
	const triageDisplayTotalSteps = Math.max(
		TRACKING_TRIAGE_STEP_FLOOR,
		triageSteps.length || 0,
	);
	const triageAnsweredCount = useMemo(
		() =>
			triageSteps.filter((step) => triageStepAnswered(step, triageRequestDraft)).length,
		[triageRequestDraft, triageSteps],
	);
	const triageIsComplete =
		triageSteps.length > 0 && triageAnsweredCount >= triageSteps.length;
	const triageProgressValue =
		triageDisplayTotalSteps > 0
			? triageAnsweredCount / triageDisplayTotalSteps
			: 0;
	const triageHasData = hasMeaningfulTriageDraftData(triageRequestDraft);

	const {
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
	} = useEmergencyHandlers({
		activeAmbulanceTrip,
		activeBedBooking,
		setRequestStatus,
		cancelVisit,
		completeVisit,
		updateVisit,
		setAmbulanceTripStatus,
		setBedBookingStatus,
		stopAmbulanceTrip,
		stopBedBooking,
	});

	// PULLBACK NOTE: ETA display fix — subscribe to trackingRouteInfoAtom directly so
	// durationSec is always current. The prop-chain path (routeInfo) can be stale on
	// fresh trip open: useMapTrackingSync resets the atom when a new requestKey is
	// detected, and EmergencyLocationPreviewMap won't re-fire onRouteInfoChange because
	// its signature ref hasn't changed. Reading the atom here bypasses that gap.
	// When activeAmbulanceTrip.etaSeconds is null (store not yet patched), the live
	// durationSec from the atom is used as a transient fallback so useTripProgress
	// computes remainingSeconds immediately. Once the store is patched, the store value
	// takes over and the atom fallback has no effect.
	const liveRouteInfo = useAtomValue(trackingRouteInfoAtom);
	const ambulanceTripForProgress = useMemo(() => {
		if (!activeAmbulanceTrip) return activeAmbulanceTrip;
		if (Number.isFinite(activeAmbulanceTrip.etaSeconds) && activeAmbulanceTrip.etaSeconds > 0) return activeAmbulanceTrip;
		const fallbackEta = liveRouteInfo?.durationSec;
		if (!Number.isFinite(fallbackEta) || fallbackEta <= 0) return activeAmbulanceTrip;
		return { ...activeAmbulanceTrip, etaSeconds: fallbackEta };
	}, [activeAmbulanceTrip, liveRouteInfo?.durationSec]);

	const {
		remainingSeconds: ambulanceRemainingSeconds,
		tripProgress: ambulanceTripProgress,
		computedStatus: ambulanceComputedStatus,
	} = useTripProgress({
		activeAmbulanceTrip: ambulanceTripForProgress,
		nowMs,
	});
	const {
		remainingBedSeconds,
		bedProgress,
		bedStatus,
		formattedBedRemaining,
	} = useBedBookingProgress({
		activeBedBooking,
		nowMs,
	});

	// PULLBACK NOTE: Phase 5b — prefer machine flags over raw status string assembly
	// OLD: resolvedStatus = String(activeAmbulanceTrip?.status || ...).toLowerCase()
	// NEW: machine flags used for boolean decisions; resolvedStatus kept for display/derived
	const isArrived = isArrivedProp ?? (activeAmbulanceTrip?.status === EmergencyRequestStatus.ARRIVED || activeBedBooking?.status === EmergencyRequestStatus.ARRIVED);
	const isPendingApproval = isPendingApprovalProp ?? (activeAmbulanceTrip?.status === EmergencyRequestStatus.PENDING_APPROVAL || activeBedBooking?.status === EmergencyRequestStatus.PENDING_APPROVAL || !!pendingApproval?.requestId);
	const resolvedStatus = String(
		(activeAmbulanceTrip?.status ||
			activeBedBooking?.status ||
			pendingApproval?.status ||
			"").toLowerCase(),
	);

	const viewState = useMemo(
		() =>
			buildTrackingViewState({
				hospitals,
				allHospitals,
				hospital,
				payload,
				currentLocation,
				routeInfo,
				activeMapRequest,
				activeAmbulanceTrip,
				activeBedBooking,
				pendingApproval,
				ambulanceTelemetryHealth,
				ambulanceRemainingSeconds,
				remainingBedSeconds,
				bedStatus,
				ambulanceComputedStatus,
				resolvedStatus,
				nowMs,
				isDarkMode,
			}),
		[
			activeMapRequest,
			activeAmbulanceTrip,
			activeBedBooking,
			allHospitals,
			ambulanceComputedStatus,
			ambulanceRemainingSeconds,
			ambulanceTelemetryHealth,
			bedStatus,
			currentLocation,
			hospital,
			hospitals,
			isDarkMode,
			nowMs,
			payload,
			pendingApproval,
			remainingBedSeconds,
			resolvedStatus,
			routeInfo,
		],
	);

	const routeVisualProgress = useMemo(() => {
		if (viewState.trackingKind !== "ambulance") return 0;
		if (
			resolvedStatus === EmergencyRequestStatus.ARRIVED ||
			resolvedStatus === EmergencyRequestStatus.COMPLETED
		) {
			return 1;
		}
		if (!Number.isFinite(ambulanceTripProgress)) return 0;
		return Math.max(0, Math.min(1, ambulanceTripProgress));
	}, [ambulanceTripProgress, resolvedStatus, viewState.trackingKind]);

	// PULLBACK NOTE: Phase 5b — use machine isArrived flag instead of raw status
	const canMarkArrived =
		viewState.trackingKind === "ambulance" &&
		(activeMapRequest?.canConfirmArrival || ambulanceComputedStatus === "Arrived") &&
		!isArrived;
	const canCompleteAmbulance =
		viewState.trackingKind === "ambulance" &&
		(activeMapRequest?.canCompleteAmbulance || isArrived);
	const canCheckInBed =
		viewState.trackingKind === "bed" &&
		bedStatus === "Ready" &&
		!isArrived;
	const canCompleteBed =
		viewState.trackingKind === "bed" &&
		(activeMapRequest?.canCompleteBed || isArrived);
	const shouldPromoteTriage =
		Boolean(pendingApproval?.requestId) && (!triageHasData || !triageIsComplete);

	return {
		triageRequestId,
		triageRequestDraft,
		triageAnsweredCount,
		triageDisplayTotalSteps,
		triageHasData,
		triageIsComplete,
		triageProgressValue,
		ambulanceTripProgress,
		bedProgress,
		formattedBedRemaining,
		ambulanceComputedStatus,
		resolvedStatus,
		routeVisualProgress,
		canMarkArrived,
		canCompleteAmbulance,
		canCheckInBed,
		canCompleteBed,
		shouldPromoteTriage,
		onCancelAmbulanceTrip,
		onMarkAmbulanceArrived,
		onCompleteAmbulanceTrip,
		onCancelBedBooking,
		onMarkBedOccupied,
		onCompleteBedBooking,
		...viewState,
	};
}

export default useMapTrackingRuntime;
