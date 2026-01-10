export const isValidCoordinate = (coordinate) => {
	return (
		Number.isFinite(coordinate?.latitude) &&
		Number.isFinite(coordinate?.longitude)
	);
};

export const decodeGooglePolyline = (encoded) => {
	if (!encoded || typeof encoded !== "string") return [];

	let index = 0;
	let lat = 0;
	let lng = 0;
	const coordinates = [];

	while (index < encoded.length) {
		let b;
		let shift = 0;
		let result = 0;

		do {
			b = encoded.charCodeAt(index++) - 63;
			result |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);

		const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
		lat += dlat;

		shift = 0;
		result = 0;

		do {
			b = encoded.charCodeAt(index++) - 63;
			result |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);

		const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
		lng += dlng;

		coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
	}

	return coordinates;
};

export const calculateBearing = (from, to) => {
	if (!isValidCoordinate(from) || !isValidCoordinate(to)) return 0;

	const toRadians = (deg) => (deg * Math.PI) / 180;
	const toDegrees = (rad) => (rad * 180) / Math.PI;

	const lat1 = toRadians(from.latitude);
	const lat2 = toRadians(to.latitude);
	const dLon = toRadians(to.longitude - from.longitude);

	const y = Math.sin(dLon) * Math.cos(lat2);
	const x =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

	const brng = toDegrees(Math.atan2(y, x));
	return (brng + 360) % 360;
};

export const calculateDistance = (from, to) => {
	if (!isValidCoordinate(from) || !isValidCoordinate(to)) return 0;

	const R = 6371;
	const toRadians = (deg) => (deg * Math.PI) / 180;

	const lat1 = toRadians(from.latitude);
	const lat2 = toRadians(to.latitude);
	const dLat = toRadians(to.latitude - from.latitude);
	const dLon = toRadians(to.longitude - from.longitude);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

export const getCoordinateBounds = (coordinates) => {
	if (!Array.isArray(coordinates) || coordinates.length === 0) {
		return {
			minLat: 0,
			maxLat: 0,
			minLng: 0,
			maxLng: 0,
		};
	}

	let minLat = coordinates[0].latitude;
	let maxLat = coordinates[0].latitude;
	let minLng = coordinates[0].longitude;
	let maxLng = coordinates[0].longitude;

	coordinates.forEach((coord) => {
		if (coord.latitude < minLat) minLat = coord.latitude;
		if (coord.latitude > maxLat) maxLat = coord.latitude;
		if (coord.longitude < minLng) minLng = coord.longitude;
		if (coord.longitude > maxLng) maxLng = coord.longitude;
	});

	return { minLat, maxLat, minLng, maxLng };
};

export const formatDuration = (seconds) => {
	if (!Number.isFinite(seconds)) return "--";

	const hours = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.round(seconds % 60);

	if (hours > 0) {
		return `${hours}h ${mins}m`;
	}
	if (mins > 0) {
		return `${mins}m ${secs}s`;
	}
	return `${secs}s`;
};

export const formatDistance = (meters) => {
	if (!Number.isFinite(meters)) return "--";

	const km = meters / 1000;
	if (km >= 1) {
		return `${km.toFixed(1)} km`;
	}
	return `${Math.round(meters)} m`;
};
