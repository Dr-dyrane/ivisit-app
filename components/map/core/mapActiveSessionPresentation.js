import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";
import { MAP_ACTIVE_REQUEST_KINDS } from "./mapActiveRequestModel";

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

export function buildMapActiveSessionHeaderSession({
	activeMapRequest = null,
	ambulanceTelemetryHealth = null,
	pendingApproval = null,
} = {}) {
	if (!activeMapRequest?.hasActiveRequest) {
		return null;
	}

	const trackingKind = activeMapRequest.kind;
	const normalizedStatus = normalizeStatus(activeMapRequest.status);
	const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";

	return {
		eyebrow: null,
		title: null,
		subtitle: null,
		metrics: [
			{
				label: "Arrival",
				value:
					trackingKind === MAP_ACTIVE_REQUEST_KINDS.PENDING
						? "--"
						: resolveMetricValue(activeMapRequest.arrivalLabel),
			},
			{
				label: "Min",
				value:
					trackingKind === MAP_ACTIVE_REQUEST_KINDS.PENDING
						? "Pending"
						: resolveMetricValue(activeMapRequest.minuteValue),
			},
			{
				label: "Km",
				value: resolveMetricValue(activeMapRequest.distanceValue),
			},
		],
		statusLabel: resolveSessionStatusLabel({
			activeMapRequest,
			trackingKind,
			normalizedStatus,
			telemetryState,
			pendingApproval,
		}),
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
