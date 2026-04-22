export const DEFAULT_BED_HOLD_SECONDS = 15 * 60;

export const ACTIVE_BED_TIMER_STATUSES = new Set([
	"pending_approval",
	"in_progress",
	"accepted",
	"arrived",
]);

export function toBedRuntimeTimestampMs(value) {
	if (Number.isFinite(value)) return Number(value);
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

export function parseBedEtaSeconds(value) {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return value >= 0 ? value : null;
	}
	if (typeof value !== "string") return null;

	const lower = value.trim().toLowerCase();
	if (!lower) return null;
	if (lower === "unknown" || lower === "8-12 mins") return 600;

	const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
	if (minutesMatch) return Number(minutesMatch[1]) * 60;

	const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
	if (secondsMatch) return Number(secondsMatch[1]);

	if (/^\d+$/.test(lower)) return Number(lower);
	return null;
}

const resolveBedRuntimeKey = (booking) =>
	booking?.requestId ?? booking?.bookingId ?? booking?.id ?? null;

export function resolveBedHoldSeconds(booking = null) {
	if (Number.isFinite(booking?.etaSeconds)) {
		return Number(booking.etaSeconds);
	}

	const parsedEtaSeconds = parseBedEtaSeconds(
		booking?.estimatedWait ?? booking?.estimatedArrival ?? null,
	);
	if (Number.isFinite(parsedEtaSeconds)) {
		return parsedEtaSeconds;
	}

	const status = String(booking?.status ?? "").toLowerCase();
	const shouldUseHoldDefault =
		ACTIVE_BED_TIMER_STATUSES.has(status) || !!resolveBedRuntimeKey(booking);
	return shouldUseHoldDefault ? DEFAULT_BED_HOLD_SECONDS : null;
}

export function normalizeBedBookingRuntimeState(booking, previousBooking = null) {
	if (!booking?.hospitalId) return null;

	const nextRequestKey = resolveBedRuntimeKey(booking);
	const previousRequestKey = resolveBedRuntimeKey(previousBooking);
	const isSameBooking = !!(
		nextRequestKey &&
		previousRequestKey &&
		String(nextRequestKey) === String(previousRequestKey)
	);

	const triageSnapshot =
		booking?.triageSnapshot ??
		booking?.triage ??
		(booking?.triageCheckin ? { signals: { userCheckin: booking.triageCheckin } } : null);
	const triageCheckin =
		booking?.triageCheckin ?? triageSnapshot?.signals?.userCheckin ?? null;

	const parsedHoldSeconds = resolveBedHoldSeconds(booking);
	const preservedHoldSeconds =
		isSameBooking && Number.isFinite(previousBooking?.etaSeconds)
			? Number(previousBooking.etaSeconds)
			: null;
	const etaSeconds =
		Number.isFinite(parsedHoldSeconds) ? parsedHoldSeconds : preservedHoldSeconds;

	const explicitStartedAtMs = toBedRuntimeTimestampMs(booking?.startedAt);
	const preservedStartedAtMs =
		isSameBooking ? toBedRuntimeTimestampMs(previousBooking?.startedAt) : null;
	const startedAt =
		explicitStartedAtMs ??
		preservedStartedAtMs ??
		(Number.isFinite(etaSeconds) ? Date.now() : null);

	return {
		id: booking.id ?? null,
		hospitalId: booking.hospitalId,
		bookingId: booking.bookingId ?? booking.requestId ?? null,
		requestId: booking.requestId ?? booking.bookingId ?? null,
		status: booking.status ?? null,
		bedNumber: booking.bedNumber ?? null,
		bedType: booking.bedType ?? null,
		bedCount: booking.bedCount ?? null,
		specialty: booking.specialty ?? null,
		hospitalName: booking.hospitalName ?? null,
		estimatedWait: booking.estimatedWait ?? booking.estimatedArrival ?? null,
		etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
		triage: triageSnapshot,
		triageSnapshot,
		triageCheckin,
		triageProgress: booking?.triageProgress ?? triageSnapshot?.progress ?? null,
		startedAt,
	};
}

export default {
	ACTIVE_BED_TIMER_STATUSES,
	DEFAULT_BED_HOLD_SECONDS,
	normalizeBedBookingRuntimeState,
	parseBedEtaSeconds,
	resolveBedHoldSeconds,
	toBedRuntimeTimestampMs,
};
