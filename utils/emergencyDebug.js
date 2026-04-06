const emergencyDebugEnabled =
	String(process.env.EXPO_PUBLIC_EMERGENCY_DEBUG || "")
		.trim()
		.toLowerCase() === "true";

let emergencyDebugSequence = 0;

export function summarizeHospitalForDebug(hospital) {
	if (!hospital || typeof hospital !== "object") return null;
	return {
		id: hospital.id ?? null,
		name: hospital.name ?? null,
		eta: hospital.eta ?? hospital.estimatedArrival ?? null,
		distance: hospital.distance ?? hospital.distanceKm ?? null,
		city: hospital.city ?? null,
		region: hospital.region ?? null,
		hasImage: typeof hospital.image === "string" && hospital.image.length > 0,
	};
}

export function summarizeLocationForDebug(location) {
	if (!location || typeof location !== "object") return null;
	const latitude = Number(location.latitude);
	const longitude = Number(location.longitude);
	return {
		latitude: Number.isFinite(latitude) ? Number(latitude.toFixed(6)) : null,
		longitude: Number.isFinite(longitude) ? Number(longitude.toFixed(6)) : null,
	};
}

export function logEmergencyDebug(event, payload = null) {
	if (!emergencyDebugEnabled) return;

	emergencyDebugSequence += 1;
	const prefix = `[EmergencyDebug ${String(emergencyDebugSequence).padStart(3, "0")}] ${event}`;

	if (payload == null) {
		console.log(prefix);
		return;
	}

	console.log(prefix, payload);
}

export function isEmergencyDebugEnabled() {
	return emergencyDebugEnabled;
}
