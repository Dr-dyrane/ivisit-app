/**
 * locationHelpers.js
 *
 * Pure, stateless helpers for coordinate normalization,
 * reverse-geocode result shaping, and place model construction.
 * Extracted from GlobalLocationContext.jsx.
 */

export const normalizeLocationCoordinates = (location) => {
	const latitude = Number(location?.latitude);
	const longitude = Number(location?.longitude);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return { latitude, longitude };
};

export const buildFallbackPlaceModel = (location) => ({
	primaryText: "Current location",
	secondaryText: "Nearby area",
	formattedAddress: "Current location",
	source: "fallback",
	location: normalizeLocationCoordinates(location),
});

export const buildPlaceModelFromOpenStreetMap = (payload, location) => {
	if (!payload || typeof payload !== "object") {
		return buildFallbackPlaceModel(location);
	}

	const address = payload.address || {};
	const locality =
		address.city || address.town || address.village || address.hamlet || address.county;
	const primaryText =
		[address.house_number, address.road].filter(Boolean).join(" ").trim() ||
		address.neighbourhood ||
		address.suburb ||
		locality ||
		payload.name ||
		"Current location";
	const secondaryText = [address.suburb, locality, address.state]
		.filter(Boolean)
		.filter((value, index, values) => values.indexOf(value) === index)
		.join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress:
			typeof payload.display_name === "string" && payload.display_name.trim()
				? payload.display_name.trim()
				: [primaryText, secondaryText].filter(Boolean).join(", "),
		source: "openstreetmap",
		location: normalizeLocationCoordinates(location),
	};
};

export const reverseGeocodeWithOpenStreetMap = async (location) => {
	const normalizedLocation = normalizeLocationCoordinates(location);
	if (!normalizedLocation) {
		return null;
	}

	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${normalizedLocation.latitude}&lon=${normalizedLocation.longitude}&zoom=18&addressdetails=1`,
			{
				headers: {
					Accept: "application/json",
					"Accept-Language": "en",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`OpenStreetMap reverse geocode failed with ${response.status}`);
		}

		const data = await response.json();
		if (!data?.display_name && !data?.address) {
			return null;
		}

		return buildPlaceModelFromOpenStreetMap(data, normalizedLocation);
	} catch (_openStreetMapError) {
		return null;
	}
};

export const buildPlaceModelFromFormattedAddress = (formattedAddress, location, source = "mapbox") => {
	if (typeof formattedAddress !== "string" || !formattedAddress.trim()) {
		return buildFallbackPlaceModel(location);
	}

	const parts = formattedAddress
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const primaryText = parts[0] || formattedAddress.trim();
	const secondaryText = parts.slice(1).join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress: formattedAddress.trim(),
		source,
		location: normalizeLocationCoordinates(location),
	};
};

export const buildPlaceModelFromNativePlace = (place, location) => {
	if (!place || typeof place !== "object") {
		return buildFallbackPlaceModel(location);
	}

	const primaryText =
		[place.name, place.street]
			.filter(Boolean)
			.join(" ")
			.trim() ||
		place.city ||
		place.region ||
		"Current location";
	const secondaryText = [place.district, place.city, place.region, place.country]
		.filter(Boolean)
		.join(", ");

	return {
		primaryText,
		secondaryText,
		formattedAddress: [primaryText, secondaryText].filter(Boolean).join(", "),
		source: "native",
		location: normalizeLocationCoordinates(location),
	};
};
