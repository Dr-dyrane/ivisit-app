const toFiniteNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export function formatMapClockArrival(remainingSeconds, nowMs = Date.now()) {
	const safeRemainingSeconds = toFiniteNumber(remainingSeconds);
	if (!Number.isFinite(safeRemainingSeconds)) return "--";
	const arrivalDate = new Date(nowMs + safeRemainingSeconds * 1000);
	return arrivalDate.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatMapRemainingMinutes(remainingSeconds) {
	const safeRemainingSeconds = toFiniteNumber(remainingSeconds);
	if (!Number.isFinite(safeRemainingSeconds)) return "--";
	const minutes = Math.max(1, Math.ceil(safeRemainingSeconds / 60));
	return `${minutes} min`;
}

export function formatMapDistanceLabel(distanceKm) {
	const safeDistanceKm = toFiniteNumber(distanceKm);
	if (!Number.isFinite(safeDistanceKm) || safeDistanceKm <= 0) return "--";
	return safeDistanceKm < 1
		? `${Math.round(safeDistanceKm * 1000)} m`
		: `${safeDistanceKm.toFixed(safeDistanceKm < 10 ? 1 : 0)} km`;
}

export default {
	formatMapClockArrival,
	formatMapRemainingMinutes,
	formatMapDistanceLabel,
};
