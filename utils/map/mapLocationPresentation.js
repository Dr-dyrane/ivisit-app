const COUNTRY_SEGMENTS = new Set([
	"united states",
	"united states of america",
	"usa",
	"nigeria",
	"canada",
	"united kingdom",
	"uk",
]);

const ZIP_FRAGMENT_REGEX = /\b\d{4,6}(?:-\d{3,4})?\b/g;

export function toEmergencyLocation(location) {
	if (!location) return null;
	const latitude = Number(location.latitude);
	const longitude = Number(location.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return {
		latitude,
		longitude,
		latitudeDelta: 0.04,
		longitudeDelta: 0.04,
	};
}

export function formatHospitalDistance(hospital) {
	const distanceKm = Number(hospital?.distanceKm);
	if (Number.isFinite(distanceKm) && distanceKm > 0) {
		if (distanceKm < 1) {
			return `${Math.round(distanceKm * 1000)} m away`;
		}
		return `${distanceKm.toFixed(1)} km away`;
	}
	if (typeof hospital?.distance === "string" && hospital.distance.trim()) {
		return hospital.distance.trim();
	}
	return "Nearby";
}

export function cleanAddressPiece(value) {
	if (typeof value !== "string") return "";
	return value
		.replace(ZIP_FRAGMENT_REGEX, "")
		.replace(/\s{2,}/g, " ")
		.replace(/\s+,/g, ",")
		.trim()
		.replace(/,$/, "")
		.trim();
}

export function buildHeaderLocationModel(locationModel) {
	if (!locationModel) {
		return {
			primaryText: "Current location",
			secondaryText: "",
		};
	}

	const primaryText = cleanAddressPiece(locationModel.primaryText) || "Current location";
	const secondaryParts = String(locationModel.secondaryText || "")
		.split(",")
		.map((part) => cleanAddressPiece(part))
		.filter(Boolean)
		.filter((part) => !COUNTRY_SEGMENTS.has(part.toLowerCase()));

	return {
		...locationModel,
		primaryText,
		secondaryText: secondaryParts.join(", "),
	};
}
