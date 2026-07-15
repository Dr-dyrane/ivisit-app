import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";
import {
	MAP_ACTIVE_REQUEST_KINDS,
	normalizeMapTimestampMs,
} from "./mapActiveRequestModel";
import {
	formatMapClockArrival,
	formatMapRemainingMinutes,
} from "./mapMetricPresentation";

function normalizeStatus(value) {
	return String(value ?? "").trim().toLowerCase();
}

function resolveMetricValue(value, fallback = "--") {
	if (typeof value === "string" && value.trim()) {
		return value.trim();
	}
	if (Number.isFinite(value)) {
		return String(value);
	}
	return fallback;
}

function resolveSessionStatusLabel({
	activeMapRequest,
	trackingKind,
	normalizedStatus,
	telemetryState,
	pendingApproval,
}) {
	if (trackingKind === MAP_ACTIVE_REQUEST_KINDS.PENDING) {
		return pendingApproval?.paymentMethod === "cash"
			? "Awaiting approval"
			: "Processing";
	}

	if (trackingKind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
		if (normalizedStatus === EmergencyRequestStatus.COMPLETED) return "Complete";
		if (activeMapRequest?.canCompleteAmbulance) return "Complete";
		if (
			normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			activeMapRequest?.canConfirmArrival
		) {
			return "Arrived";
		}
		if (normalizedStatus === EmergencyRequestStatus.IN_PROGRESS) {
			return "Finding responder";
		}
		if (telemetryState === "lost") return "Tracking lost";
		if (telemetryState === "stale") return "Tracking delayed";
		return "En Route";
	}

	if (trackingKind === MAP_ACTIVE_REQUEST_KINDS.BED) {
		if (normalizedStatus === EmergencyRequestStatus.COMPLETED) return "Complete";
		if (
			normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			activeMapRequest?.canCompleteBed ||
			activeMapRequest?.canCheckInBed
		) {
			return "Ready";
		}
		return "Reserved";
	}

	return null;
}

function resolveSessionStatusTone({
	trackingKind,
	normalizedStatus,
	telemetryState,
	activeMapRequest,
}) {
	if (trackingKind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
		if (telemetryState === "lost") return "critical";
		if (telemetryState === "stale") return "warning";
		if (
			normalizedStatus === EmergencyRequestStatus.COMPLETED ||
			normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			activeMapRequest?.canConfirmArrival ||
			activeMapRequest?.canCompleteAmbulance
		) {
			return "success";
		}
		return "tracking";
	}

	if (trackingKind === MAP_ACTIVE_REQUEST_KINDS.BED) {
		if (
			normalizedStatus === EmergencyRequestStatus.COMPLETED ||
			normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			activeMapRequest?.canCompleteBed ||
			activeMapRequest?.canCheckInBed
		) {
			return "success";
		}
		return "tracking";
	}

	return "default";
}

function resolveDistanceKmMetric(distanceMeters) {
	const resolvedDistanceMeters = Number(distanceMeters);
	if (!Number.isFinite(resolvedDistanceMeters) || resolvedDistanceMeters <= 0) {
		return null;
	}
	const distanceKm = resolvedDistanceMeters / 1000;
	if (distanceKm < 10) return distanceKm.toFixed(1);
	return distanceKm.toFixed(0);
}

export function resolveMapActiveSessionMetrics({
	activeMapRequest = null,
	trackingRouteInfo = null,
	nowMs = Date.now(),
} = {}) {
	const baseMetrics = {
		arrivalLabel: activeMapRequest?.arrivalLabel ?? null,
		minuteValue: activeMapRequest?.minuteValue ?? null,
		distanceValue: activeMapRequest?.distanceValue ?? null,
	};
	const status = normalizeStatus(activeMapRequest?.status);
	const requestKey =
		activeMapRequest?.requestId != null
			? String(activeMapRequest.requestId)
			: null;
	const routeRequestKey =
		trackingRouteInfo?.requestKey != null
			? String(trackingRouteInfo.requestKey)
			: null;
	if (
		activeMapRequest?.kind !== MAP_ACTIVE_REQUEST_KINDS.AMBULANCE ||
		status !== EmergencyRequestStatus.ACCEPTED ||
		!requestKey ||
		routeRequestKey !== requestKey
	) {
		return baseMetrics;
	}

	const durationSec = Number(trackingRouteInfo?.durationSec);
	const startedAtMs = normalizeMapTimestampMs(activeMapRequest?.startedAt);
	const elapsedSeconds = Number.isFinite(startedAtMs)
		? Math.max(0, Math.round((nowMs - startedAtMs) / 1000))
		: 0;
	const remainingSeconds =
		Number.isFinite(durationSec) && durationSec > 0
			? Math.max(0, Math.round(durationSec - elapsedSeconds))
			: null;

	return {
		arrivalLabel: Number.isFinite(remainingSeconds)
			? formatMapClockArrival(remainingSeconds, nowMs)
			: baseMetrics.arrivalLabel,
		minuteValue: Number.isFinite(remainingSeconds)
			? remainingSeconds === 0
				? "0"
				: formatMapRemainingMinutes(remainingSeconds).replace(/\s*min$/i, "")
			: baseMetrics.minuteValue,
		distanceValue:
			resolveDistanceKmMetric(trackingRouteInfo?.distanceMeters) ??
			baseMetrics.distanceValue,
	};
}

export function buildMapActiveSessionHeaderSession({
	activeMapRequest = null,
	ambulanceTelemetryHealth = null,
	pendingApproval = null,
	trackingRouteInfo = null,
	nowMs = Date.now(),
} = {}) {
	if (!activeMapRequest?.hasActiveRequest) {
		return null;
	}

	const trackingKind = activeMapRequest.kind;
	const normalizedStatus = normalizeStatus(activeMapRequest.status);
	const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
	const sessionMetrics = resolveMapActiveSessionMetrics({
		activeMapRequest,
		trackingRouteInfo,
		nowMs,
	});
	const statusLabel = resolveSessionStatusLabel({
		activeMapRequest,
		trackingKind,
		normalizedStatus,
		telemetryState,
		pendingApproval,
	});
	const hasSettledAmbulanceStatus =
		trackingKind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE &&
		(normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			normalizedStatus === EmergencyRequestStatus.COMPLETED ||
			activeMapRequest?.canCompleteAmbulance);
	const hasSettledBedStatus =
		trackingKind === MAP_ACTIVE_REQUEST_KINDS.BED &&
		(normalizedStatus === EmergencyRequestStatus.ARRIVED ||
			normalizedStatus === EmergencyRequestStatus.COMPLETED ||
			activeMapRequest?.canCompleteBed ||
			activeMapRequest?.canCheckInBed);
	const primaryMetricIsStatus = hasSettledAmbulanceStatus || hasSettledBedStatus;

	return {
		eyebrow: null,
		title: null,
		subtitle: null,
		metrics: [
			{
				label: primaryMetricIsStatus ? "Status" : "Arrival",
				value:
					primaryMetricIsStatus
						? resolveMetricValue(statusLabel)
						: trackingKind === MAP_ACTIVE_REQUEST_KINDS.PENDING
						? "--"
						: resolveMetricValue(sessionMetrics.arrivalLabel),
			},
			{
				label: "Min",
				value:
					trackingKind === MAP_ACTIVE_REQUEST_KINDS.PENDING
						? "Pending"
						: resolveMetricValue(sessionMetrics.minuteValue),
			},
			{
				label: "Km",
				value: resolveMetricValue(sessionMetrics.distanceValue),
			},
		],
		statusLabel,
		statusTone: resolveSessionStatusTone({
			trackingKind,
			normalizedStatus,
			telemetryState,
			activeMapRequest,
		}),
		expanded: false,
		expandable: false,
		onToggleExpand: null,
		showChevron: false,
		hideDetails: true,
		bodyHeight: 0,
		expandedContent: null,
		details: [],
	};
}
