import { useMemo } from "react";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";

const toTimestampMs = (value) => {
	if (Number.isFinite(value)) return Number(value);
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
};

export const useTripProgress = ({
	activeAmbulanceTrip,
	nowMs = Date.now(),
}) => {
	const fallbackEtaSeconds = useMemo(() => {
		const eta = activeAmbulanceTrip?.estimatedArrival;
		if (eta === null || eta === undefined) return null;
		if (typeof eta === "number" && Number.isFinite(eta)) return eta;
		if (typeof eta !== "string") return null;
		const lower = eta.toLowerCase();
		if (lower === "unknown" || lower === "8-12 mins") return 600;
		const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
		if (minutesMatch) return Number(minutesMatch[1]) * 60;
		const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
		if (secondsMatch) return Number(secondsMatch[1]);
		if (/^\d+$/.test(lower)) return Number(lower);
		return null;
	}, [activeAmbulanceTrip?.estimatedArrival]);

	const resolvedEtaSeconds = useMemo(() => {
		if (
			Number.isFinite(activeAmbulanceTrip?.etaSeconds) &&
			activeAmbulanceTrip.etaSeconds > 0
		) {
			return Number(activeAmbulanceTrip.etaSeconds);
		}
		if (Number.isFinite(fallbackEtaSeconds) && fallbackEtaSeconds > 0) {
			return Number(fallbackEtaSeconds);
		}
		return null;
	}, [activeAmbulanceTrip?.etaSeconds, fallbackEtaSeconds]);

	const resolvedStartedAtMs = useMemo(() => {
		const explicitStartedAt = toTimestampMs(activeAmbulanceTrip?.startedAt);
		if (Number.isFinite(explicitStartedAt)) return explicitStartedAt;
		return null;
	}, [activeAmbulanceTrip?.startedAt]);

	const remainingSeconds = useMemo(() => {
		const eta = resolvedEtaSeconds;
		const startedAtMs = resolvedStartedAtMs;
		if (!Number.isFinite(eta) || !Number.isFinite(startedAtMs)) return null;
		const elapsedSec = (nowMs - startedAtMs) / 1000;
		return Math.max(0, Math.round(eta - elapsedSec));
	}, [nowMs, resolvedEtaSeconds, resolvedStartedAtMs]);

	const tripProgress = useMemo(() => {
		const eta = resolvedEtaSeconds;
		const startedAtMs = resolvedStartedAtMs;
		if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAtMs))
			return null;
		const elapsedSec = (nowMs - startedAtMs) / 1000;
		return Math.min(1, Math.max(0, elapsedSec / eta));
	}, [nowMs, resolvedEtaSeconds, resolvedStartedAtMs]);

	const TRIP_ARRIVED_THRESHOLD = 0.95;
	const computedStatus = useMemo(() => {
		const status = String(activeAmbulanceTrip?.status ?? "").toLowerCase();
		if (status === EmergencyRequestStatus.COMPLETED) return "Complete";
		if (status === EmergencyRequestStatus.ARRIVED) return "Arrived";
		if (!Number.isFinite(tripProgress)) return "En Route";
		if (tripProgress >= TRIP_ARRIVED_THRESHOLD) return "Arrived";
		if (tripProgress < 0.2) return "Dispatched";
		if (tripProgress < 0.85) return "En Route";
		return "Arriving";
	}, [activeAmbulanceTrip?.status, tripProgress]);

	const formattedRemaining = useMemo(() => {
		if (!Number.isFinite(remainingSeconds)) {
			if (typeof activeAmbulanceTrip?.estimatedArrival === "string" && activeAmbulanceTrip.estimatedArrival.trim()) {
				return activeAmbulanceTrip.estimatedArrival;
			}
			return "--";
		}
		const mins = Math.floor(remainingSeconds / 60);
		const secs = remainingSeconds % 60;
		if (mins <= 0) return `${secs}s`;
		return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
	}, [remainingSeconds, activeAmbulanceTrip?.estimatedArrival]);

	return {
		resolvedEtaSeconds,
		resolvedStartedAtMs,
		remainingSeconds,
		tripProgress,
		computedStatus,
		formattedRemaining,
	};
};
