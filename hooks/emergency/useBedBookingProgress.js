import { useMemo } from "react";

const DEFAULT_BED_HOLD_SECONDS = 15 * 60;
const ACTIVE_BED_TIMER_STATUSES = new Set([
	"pending_approval",
	"in_progress",
	"accepted",
	"arrived",
]);

export const useBedBookingProgress = ({
	activeBedBooking,
	nowMs = Date.now(),
}) => {
	const fallbackEtaSeconds = useMemo(() => {
		const eta = activeBedBooking?.estimatedWait ?? activeBedBooking?.estimatedArrival ?? null;
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
	}, [activeBedBooking?.estimatedArrival, activeBedBooking?.estimatedWait]);

	const resolvedHoldSeconds = useMemo(() => {
		if (Number.isFinite(activeBedBooking?.etaSeconds)) {
			return activeBedBooking.etaSeconds;
		}
		if (Number.isFinite(fallbackEtaSeconds)) {
			return fallbackEtaSeconds;
		}
		const status = String(activeBedBooking?.status ?? "").toLowerCase();
		const shouldUseHoldDefault =
			ACTIVE_BED_TIMER_STATUSES.has(status) || !!activeBedBooking?.requestId;
		return shouldUseHoldDefault ? DEFAULT_BED_HOLD_SECONDS : null;
	}, [activeBedBooking?.etaSeconds, activeBedBooking?.requestId, activeBedBooking?.status, fallbackEtaSeconds]);

	const remainingBedSeconds = useMemo(() => {
		const eta = resolvedHoldSeconds;
		const startedAt = activeBedBooking?.startedAt;
		if (!Number.isFinite(eta) || !Number.isFinite(startedAt)) return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.max(0, Math.round(eta - elapsedSec));
	}, [activeBedBooking?.startedAt, nowMs, resolvedHoldSeconds]);

	const bedProgress = useMemo(() => {
		const eta = resolvedHoldSeconds;
		const startedAt = activeBedBooking?.startedAt;
		if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAt))
			return null;
		const elapsedSec = (nowMs - startedAt) / 1000;
		return Math.min(1, Math.max(0, elapsedSec / eta));
	}, [activeBedBooking?.startedAt, nowMs, resolvedHoldSeconds]);

	const bedStatus = useMemo(() => {
		if (!Number.isFinite(bedProgress)) return "Waiting";
		if (bedProgress >= 1) return "Ready";
		if (bedProgress < 0.15) return "Reserved";
		return "Waiting";
	}, [bedProgress]);

	const formattedBedRemaining = useMemo(() => {
		if (!Number.isFinite(remainingBedSeconds)) return "--";
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
