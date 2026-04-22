import { useEffect, useMemo, useState } from "react";
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
	currentLocation = null,
	routeInfo = null,
	activeAmbulanceTrip,
	ambulanceTelemetryHealth,
	activeBedBooking,
	pendingApproval,
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

	const {
		remainingSeconds: ambulanceRemainingSeconds,
		tripProgress: ambulanceTripProgress,
		computedStatus: ambulanceComputedStatus,
	} = useTripProgress({
		activeAmbulanceTrip,
		nowMs,
	});
	const { remainingBedSeconds, bedStatus } = useBedBookingProgress({
		activeBedBooking,
		nowMs,
	});

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
				activeAmbulanceTrip,
				activeBedBooking,
				pendingApproval,
				ambulanceTelemetryHealth,
				ambulanceRemainingSeconds,
				remainingBedSeconds,
				ambulanceComputedStatus,
				resolvedStatus,
				nowMs,
				isDarkMode,
			}),
		[
			activeAmbulanceTrip,
			activeBedBooking,
			allHospitals,
			ambulanceComputedStatus,
			ambulanceRemainingSeconds,
			ambulanceTelemetryHealth,
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

	const canMarkArrived =
		viewState.trackingKind === "ambulance" &&
		ambulanceComputedStatus === "Arrived" &&
		activeAmbulanceTrip?.status !== EmergencyRequestStatus.ARRIVED;
	const canCompleteAmbulance =
		viewState.trackingKind === "ambulance" &&
		activeAmbulanceTrip?.status === EmergencyRequestStatus.ARRIVED;
	const canCheckInBed =
		viewState.trackingKind === "bed" &&
		bedStatus === "Ready" &&
		activeBedBooking?.status !== EmergencyRequestStatus.ARRIVED;
	const canCompleteBed =
		viewState.trackingKind === "bed" &&
		activeBedBooking?.status === EmergencyRequestStatus.ARRIVED;
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
