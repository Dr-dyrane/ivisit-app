import { useMemo } from "react";
import {
	resolveBedHoldSeconds,
	toBedRuntimeTimestampMs,
} from "./bedBookingRuntime";

export const useBedBookingProgress = ({
	activeBedBooking,
	nowMs = Date.now(),
}) => {
	const resolvedHoldSeconds = useMemo(
		() => resolveBedHoldSeconds(activeBedBooking),
		[
			activeBedBooking?.etaSeconds,
			activeBedBooking?.estimatedArrival,
			activeBedBooking?.estimatedWait,
			activeBedBooking?.requestId,
			activeBedBooking?.status,
		],
	);

	const remainingBedSeconds = useMemo(() => {
		const eta = resolvedHoldSeconds;
		const startedAt = activeBedBooking?.startedAt;
		const startedAtMs = toBedRuntimeTimestampMs(startedAt);
		if (!Number.isFinite(eta) || !Number.isFinite(startedAtMs)) return null;
		const elapsedSec = (nowMs - startedAtMs) / 1000;
		return Math.max(0, Math.round(eta - elapsedSec));
	}, [activeBedBooking?.startedAt, nowMs, resolvedHoldSeconds]);

	const bedProgress = useMemo(() => {
		const eta = resolvedHoldSeconds;
		const startedAt = activeBedBooking?.startedAt;
		const startedAtMs = toBedRuntimeTimestampMs(startedAt);
		if (!Number.isFinite(eta) || eta <= 0 || !Number.isFinite(startedAtMs))
			return null;
		const elapsedSec = (nowMs - startedAtMs) / 1000;
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
