import { useMemo } from "react";

export const useBedBookingProgress = ({
	activeBedBooking,
	nowMs = Date.now(),
}) => {
	const remainingBedSeconds = useMemo(() => {
		const eta = activeBedBooking?.etaSeconds;
		const startedAt = activeBedBooking?.startedAt;
		if (!Number.isFinite(eta) || !Number.isFinite(startedAt)) return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.max(0, Math.round(eta - elapsedSec));
	}, [activeBedBooking?.etaSeconds, activeBedBooking?.startedAt, nowMs]);

	const bedProgress = useMemo(() => {
		const eta = activeBedBooking?.etaSeconds;
		const startedAt = activeBedBooking?.startedAt;
		if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAt))
			return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.min(1, Math.max(0, elapsedSec / eta));
	}, [activeBedBooking?.etaSeconds, activeBedBooking?.startedAt, nowMs]);

	const bedStatus = useMemo(() => {
		if (!Number.isFinite(bedProgress)) return "Waiting";
		if (bedProgress >= 1) return "Ready";
		if (bedProgress < 0.15) return "Reserved";
		return "Waiting";
	}, [bedProgress]);

	const formattedBedRemaining = useMemo(() => {
		if (!Number.isFinite(remainingBedSeconds)) return null;
		const mins = Math.floor(remainingBedSeconds / 60);
		const secs = remainingBedSeconds % 60;
		if (mins <= 0) return `${secs}s`;
		return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
	}, [remainingBedSeconds]);

	return {
		remainingBedSeconds,
		bedProgress,
		bedStatus,
		formattedBedRemaining,
	};
};
