import { useMemo } from "react";

export const useTripProgress = ({
	activeAmbulanceTrip,
	nowMs = Date.now(),
}) => {
	const remainingSeconds = useMemo(() => {
		const eta = activeAmbulanceTrip?.etaSeconds;
		const startedAt = activeAmbulanceTrip?.startedAt;
		if (!Number.isFinite(eta) || !Number.isFinite(startedAt)) return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.max(0, Math.round(eta - elapsedSec));
	}, [activeAmbulanceTrip?.etaSeconds, activeAmbulanceTrip?.startedAt, nowMs]);

	const tripProgress = useMemo(() => {
		const eta = activeAmbulanceTrip?.etaSeconds;
		const startedAt = activeAmbulanceTrip?.startedAt;
		if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAt))
			return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.min(1, Math.max(0, elapsedSec / eta));
	}, [activeAmbulanceTrip?.etaSeconds, activeAmbulanceTrip?.startedAt, nowMs]);

	const computedStatus = useMemo(() => {
		if (!Number.isFinite(tripProgress)) return "En Route";
		if (tripProgress >= 1) return "Arrived";
		if (tripProgress < 0.2) return "Dispatched";
		if (tripProgress < 0.85) return "En Route";
		return "Arriving";
	}, [tripProgress]);

	const formattedRemaining = useMemo(() => {
		if (!Number.isFinite(remainingSeconds)) return null;
		const mins = Math.floor(remainingSeconds / 60);
		const secs = remainingSeconds % 60;
		if (mins <= 0) return `${secs}s`;
		return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
	}, [remainingSeconds]);

	return {
		remainingSeconds,
		tripProgress,
		computedStatus,
		formattedRemaining,
	};
};
