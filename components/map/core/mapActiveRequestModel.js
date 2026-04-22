import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";
import {
	formatMapClockArrival,
	formatMapDistanceLabel,
	formatMapRemainingMinutes,
} from "./mapMetricPresentation";
import { formatMapRequestDisplayId } from "./mapRequestPresentation";

export const MAP_ACTIVE_REQUEST_KINDS = Object.freeze({
	IDLE: "idle",
	AMBULANCE: "ambulance",
	BED: "bed",
	PENDING: "pending",
});

const TERMINAL_STATUSES = new Set([
	EmergencyRequestStatus.COMPLETED,
	EmergencyRequestStatus.CANCELLED,
	EmergencyRequestStatus.PAYMENT_DECLINED,
]);

function normalizeStatus(value) {
	const status = String(value ?? "").trim().toLowerCase();
	return status || null;
}

function normalizeEtaSeconds(value) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeMapTimestampMs(value) {
	if (Number.isFinite(value)) return Number(value);
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function getRequestId(record) {
	return record?.requestId ?? record?.bookingId ?? record?.id ?? null;
}

function getPendingKind(pendingApproval) {
	if (!getRequestId(pendingApproval)) return MAP_ACTIVE_REQUEST_KINDS.IDLE;
	return pendingApproval?.serviceType === "bed"
		? MAP_ACTIVE_REQUEST_KINDS.BED
		: MAP_ACTIVE_REQUEST_KINDS.AMBULANCE;
}

function getPrimaryRequestSource({
	activeAmbulanceTrip,
	activeBedBooking,
	pendingApproval,
}) {
	if (getRequestId(activeAmbulanceTrip)) {
		return {
			kind: MAP_ACTIVE_REQUEST_KINDS.AMBULANCE,
			record: activeAmbulanceTrip,
			isPendingApproval: false,
		};
	}
	if (getRequestId(activeBedBooking)) {
		return {
			kind: MAP_ACTIVE_REQUEST_KINDS.BED,
			record: activeBedBooking,
			isPendingApproval: false,
		};
	}
	if (getRequestId(pendingApproval)) {
		return {
			kind: MAP_ACTIVE_REQUEST_KINDS.PENDING,
			record: pendingApproval,
			pendingKind: getPendingKind(pendingApproval),
			isPendingApproval: true,
		};
	}
	return {
		kind: MAP_ACTIVE_REQUEST_KINDS.IDLE,
		record: null,
		isPendingApproval: false,
	};
}

function findHospitalById(hospitals, hospitalId) {
	if (!hospitalId || !Array.isArray(hospitals)) return null;
	return hospitals.find((hospital) => hospital?.id === hospitalId) ?? null;
}

function resolveKnownHospitals({ hospitals, allHospitals }) {
	if (Array.isArray(allHospitals) && allHospitals.length > 0) {
		return allHospitals;
	}
	return Array.isArray(hospitals) ? hospitals : [];
}

function formatHeaderEtaLabel(etaSeconds, startedAt, nowMs = Date.now()) {
	const safeEtaSeconds = normalizeEtaSeconds(etaSeconds);
	if (!Number.isFinite(safeEtaSeconds)) return null;
	const startedAtMs = normalizeMapTimestampMs(startedAt);
	const elapsedSeconds = Number.isFinite(startedAtMs)
		? Math.max(0, Math.round((nowMs - startedAtMs) / 1000))
		: 0;
	const remainingSeconds = Math.max(
		0,
		Math.round(safeEtaSeconds - elapsedSeconds),
	);
	return formatMapRemainingMinutes(remainingSeconds);
}

function formatHeaderArrivalLabel(etaSeconds, startedAt, nowMs = Date.now()) {
	const safeEtaSeconds = normalizeEtaSeconds(etaSeconds);
	if (!Number.isFinite(safeEtaSeconds)) return null;
	const startedAtMs = normalizeMapTimestampMs(startedAt);
	const elapsedSeconds = Number.isFinite(startedAtMs)
		? Math.max(0, Math.round((nowMs - startedAtMs) / 1000))
		: 0;
	const remainingSeconds = Math.max(
		0,
		Math.round(safeEtaSeconds - elapsedSeconds),
	);
	return formatMapClockArrival(remainingSeconds, nowMs);
}

function formatHospitalDistanceLabel(hospital) {
	const directDistance = Number(hospital?.distanceKm);
	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		return hospital.distance.trim();
	}
	if (Number.isFinite(directDistance) && directDistance > 0) {
		return formatMapDistanceLabel(directDistance);
	}
	return null;
}

function resolveInitialDistanceKm(hospital) {
	const directDistanceKm = Number(hospital?.distanceKm);
	if (Number.isFinite(directDistanceKm) && directDistanceKm > 0) {
		return directDistanceKm;
	}

	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		const raw = hospital.distance.trim().toLowerCase();
		const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
		if (!Number.isFinite(value) || value <= 0) return null;
		if (raw.includes("km")) return value;
		if (raw.includes("mi")) return value * 1.60934;
		if (raw.includes("m")) return value / 1000;
	}

	return null;
}

function formatRemainingDistanceLabel(distanceKm, arrived = false) {
	if (arrived) return "0 m";
	if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
	return formatMapDistanceLabel(Math.max(distanceKm >= 1 ? 0.1 : 0.05, distanceKm));
}

function stripHeaderMetricUnit(value, unitPattern) {
	if (typeof value !== "string") return value || "--";
	const trimmed = value.trim();
	if (!trimmed || trimmed === "--") return trimmed || "--";
	return trimmed.replace(unitPattern, "").trim() || trimmed;
}

function toHeaderDistanceKmValue(value) {
	if (typeof value !== "string") return value || "--";
	const raw = value.trim().toLowerCase();
	if (!raw || raw === "--") return "--";

	const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(parsed) || parsed < 0) return "--";

	let km = parsed;
	if (raw.includes("mi")) {
		km = parsed * 1.60934;
	} else if (raw.includes("m") && !raw.includes("km")) {
		km = parsed / 1000;
	}

	if (km < 1) return km.toFixed(1);
	if (km < 10) return km.toFixed(1);
	return km.toFixed(0);
}

function hasEtaElapsed(etaSeconds, startedAt, nowMs = Date.now()) {
	const safeEtaSeconds = normalizeEtaSeconds(etaSeconds);
	if (!Number.isFinite(safeEtaSeconds)) return false;
	const startedAtMs = normalizeMapTimestampMs(startedAt);
	if (!Number.isFinite(startedAtMs)) return false;
	const elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
	return elapsedSeconds >= Math.max(0, Math.round(safeEtaSeconds));
}

function resolveHeaderDistanceLabel({
	hospital,
	etaSeconds,
	startedAt,
	status,
	etaElapsed,
	nowMs,
}) {
	const isArrivedOrComplete =
		status === EmergencyRequestStatus.ARRIVED ||
		status === EmergencyRequestStatus.COMPLETED ||
		etaElapsed;
	if (isArrivedOrComplete) {
		return "0 m";
	}

	const initialDistanceKm = resolveInitialDistanceKm(hospital);
	if (!Number.isFinite(initialDistanceKm) || initialDistanceKm <= 0) {
		return formatHospitalDistanceLabel(hospital);
	}

	const currentStartedAtMs = normalizeMapTimestampMs(startedAt);
	if (!Number.isFinite(etaSeconds) || !Number.isFinite(currentStartedAtMs)) {
		return formatRemainingDistanceLabel(initialDistanceKm);
	}

	const elapsedSeconds = Math.max(
		0,
		Math.round((nowMs - currentStartedAtMs) / 1000),
	);
	const progress = Math.max(
		0,
		Math.min(1, elapsedSeconds / Math.max(1, etaSeconds)),
	);
	const remainingDistanceKm = Math.max(
		initialDistanceKm >= 1 ? 0.1 : 0.05,
		initialDistanceKm * (1 - progress),
	);
	return formatRemainingDistanceLabel(remainingDistanceKm);
}

function resolveStatusLabel({
	kind,
	pendingKind,
	status,
	etaSeconds,
	startedAt,
	etaElapsed,
	telemetryState,
	nowMs,
}) {
	if (kind === MAP_ACTIVE_REQUEST_KINDS.PENDING) return "Pending";
	if (kind === MAP_ACTIVE_REQUEST_KINDS.IDLE) return "";

	if (kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
		if (status === EmergencyRequestStatus.COMPLETED) return "Complete";
		if (status === EmergencyRequestStatus.ARRIVED) return "Complete";
		if (etaElapsed) return "Arrived";
		if (telemetryState === "lost") return "Tracking lost";
		if (telemetryState === "stale") return "Tracking delayed";
		return formatHeaderEtaLabel(etaSeconds, startedAt, nowMs) || "Live";
	}

	if (kind === MAP_ACTIVE_REQUEST_KINDS.BED || pendingKind === MAP_ACTIVE_REQUEST_KINDS.BED) {
		if (status === EmergencyRequestStatus.COMPLETED) return "Complete";
		if (status === EmergencyRequestStatus.ARRIVED) return "Arrived";
		if (etaElapsed) return "Ready";
		return formatHeaderEtaLabel(etaSeconds, startedAt, nowMs) || "Active";
	}

	return "";
}

function resolveServiceLabel({ kind, pendingKind, record }) {
	const resolveBedLabel = (value) => {
		const raw = String(value || "").trim();
		if (!raw) return "Admission";
		const normalized = raw.toLowerCase();
		if (
			normalized === "standard" ||
			normalized.includes("general") ||
			normalized.includes("ward")
		) {
			return "General ward";
		}
		if (normalized.includes("private")) return "Private room";
		if (
			normalized.includes("icu") ||
			normalized.includes("critical") ||
			normalized.includes("high-support") ||
			normalized.includes("high support")
		) {
			return "High-support care";
		}
		if (normalized.includes("maternity")) return "Maternity room";
		if (
			normalized.includes("child") ||
			normalized.includes("paediatric") ||
			normalized.includes("pediatric")
		) {
			return "Children's care";
		}
		return raw;
	};

	if (kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE) {
		return record?.ambulanceType || record?.assignedAmbulance?.type || "Transport";
	}
	if (kind === MAP_ACTIVE_REQUEST_KINDS.BED) {
		return resolveBedLabel(record?.bedLabel || record?.roomTitle || record?.bedType);
	}
	if (kind === MAP_ACTIVE_REQUEST_KINDS.PENDING) {
		if (pendingKind === MAP_ACTIVE_REQUEST_KINDS.BED) {
			return resolveBedLabel(record?.bedLabel || record?.roomTitle || record?.bedType);
		}
		return record?.ambulanceType || "Transport";
	}
	return "";
}

export function buildActiveMapRequestModel({
	activeAmbulanceTrip = null,
	activeBedBooking = null,
	pendingApproval = null,
	ambulanceTelemetryHealth = null,
	hospitals = [],
	allHospitals = [],
	payload = null,
	preferredHospital = null,
	fallbackHospital = null,
	nearestHospital = null,
	currentLocationDetails = null,
	nowMs = Date.now(),
} = {}) {
	const primary = getPrimaryRequestSource({
		activeAmbulanceTrip,
		activeBedBooking,
		pendingApproval,
	});
	const record = primary.record;
	const kind = primary.kind;
	const pendingKind = primary.pendingKind ?? null;
	const requestId = getRequestId(record);
	const status = normalizeStatus(record?.status);
	const etaSeconds = normalizeEtaSeconds(
		record?.etaSeconds ?? record?.estimatedWaitSeconds ?? null,
	);
	const startedAt = record?.startedAt ?? record?.createdAt ?? null;
	const etaElapsed = hasEtaElapsed(etaSeconds, startedAt, nowMs);
	const knownHospitals = resolveKnownHospitals({ hospitals, allHospitals });
	const hospitalId =
		record?.hospitalId ||
		payload?.hospital?.id ||
		preferredHospital?.id ||
		fallbackHospital?.id ||
		nearestHospital?.id ||
		null;
	const hospital =
		preferredHospital ||
		payload?.hospital ||
		findHospitalById(knownHospitals, hospitalId) ||
		fallbackHospital ||
		nearestHospital ||
		null;
	const hospitalName = hospital?.name || record?.hospitalName || "Hospital";
	const serviceLabel = resolveServiceLabel({ kind, pendingKind, record });
	const telemetryState = ambulanceTelemetryHealth?.state ?? "inactive";
	const statusLabel = resolveStatusLabel({
		kind,
		pendingKind,
		status,
		etaSeconds,
		startedAt,
		etaElapsed,
		telemetryState,
		nowMs,
	});
	const arrivalLabel =
		kind === MAP_ACTIVE_REQUEST_KINDS.PENDING
			? null
			: formatHeaderArrivalLabel(etaSeconds, startedAt, nowMs);
	const distanceLabel = resolveHeaderDistanceLabel({
		hospital,
		etaSeconds,
		startedAt,
		status,
		etaElapsed,
		nowMs,
	});
	const currentStatusForMetrics = status || "";
	const minuteValue =
		currentStatusForMetrics === EmergencyRequestStatus.ARRIVED ||
		currentStatusForMetrics === EmergencyRequestStatus.COMPLETED ||
		statusLabel === "Arrived" ||
		statusLabel === "Complete" ||
		statusLabel === "Ready"
			? "0"
			: stripHeaderMetricUnit(statusLabel, /\s*(min|mins|minute|minutes)$/i);
	const progressValue = (() => {
		if (
			currentStatusForMetrics === EmergencyRequestStatus.ARRIVED ||
			currentStatusForMetrics === EmergencyRequestStatus.COMPLETED
		) {
			return 1;
		}
		const startedAtMs = normalizeMapTimestampMs(startedAt);
		if (!Number.isFinite(etaSeconds) || !Number.isFinite(startedAtMs)) {
			return null;
		}
		const elapsedSeconds = Math.max(
			0,
			Math.round((nowMs - startedAtMs) / 1000),
		);
		return Math.max(0, Math.min(1, elapsedSeconds / Math.max(1, etaSeconds)));
	})();

	return {
		kind,
		pendingKind,
		hasActiveRequest: Boolean(requestId),
		isIdle: kind === MAP_ACTIVE_REQUEST_KINDS.IDLE,
		isPendingApproval: primary.isPendingApproval,
		isAmbulance: kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE,
		isBed: kind === MAP_ACTIVE_REQUEST_KINDS.BED,
		hasCompanionBed: Boolean(getRequestId(activeAmbulanceTrip) && getRequestId(activeBedBooking)),
		requestId,
		id: record?.id ?? null,
		displayId: formatMapRequestDisplayId(record?.displayId ?? requestId),
		record,
		raw: {
			activeAmbulanceTrip,
			activeBedBooking,
			pendingApproval,
		},
		status,
		isTerminal: TERMINAL_STATUSES.has(status),
		hospitalId,
		hospital,
		hospitalName,
		serviceLabel,
		etaSeconds,
		startedAt,
		etaElapsed,
		statusLabel,
		arrivalLabel,
		distanceLabel,
		distanceValue: toHeaderDistanceKmValue(distanceLabel),
		minuteValue,
		progressValue,
		pickupLabel: currentLocationDetails?.primaryText || "Pickup",
		pickupDetail: currentLocationDetails?.secondaryText || "",
		telemetryState,
		canConfirmArrival:
			kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE &&
			etaElapsed &&
			status !== EmergencyRequestStatus.ARRIVED &&
			status !== EmergencyRequestStatus.COMPLETED,
		canCompleteAmbulance:
			kind === MAP_ACTIVE_REQUEST_KINDS.AMBULANCE &&
			status === EmergencyRequestStatus.ARRIVED,
		canCompleteBed:
			kind === MAP_ACTIVE_REQUEST_KINDS.BED &&
			status === EmergencyRequestStatus.ARRIVED,
		canCheckInBed:
			kind === MAP_ACTIVE_REQUEST_KINDS.BED &&
			etaElapsed &&
			status !== EmergencyRequestStatus.ARRIVED &&
			status !== EmergencyRequestStatus.COMPLETED,
	};
}

export function getActiveMapRequestKey(activeRequest) {
	return activeRequest?.requestId ?? null;
}
