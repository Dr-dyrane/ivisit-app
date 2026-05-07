export const MAP_SEARCH_SHEET_MODES = Object.freeze({
	SEARCH: "search",
	LOCATION: "location",
});

export function normalizeText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function toStringList(value) {
	return Array.isArray(value)
		? value
				.filter((item) => typeof item === "string" && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
}

export function humanizeQueryLabel(value) {
	const cleaned = String(value || "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!cleaned) return "";

	return cleaned
		.split(" ")
		.map((word) => {
			if (!word) return word;
			return word === word.toUpperCase()
				? word
				: `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
		})
		.join(" ");
}

export function buildHospitalSubtitle(hospital) {
	const locality = [hospital?.city, hospital?.region].filter(Boolean).join(", ").trim();
	if (locality) return locality;

	const address = [hospital?.streetNumber, hospital?.street].filter(Boolean).join(" ").trim();
	if (address) return address;

	return hospital?.address || hospital?.formattedAddress || "Available nearby";
}

export function buildHospitalMeta(hospital) {
	const distance =
		typeof hospital?.distance === "string" && hospital.distance.trim().length > 0
			? hospital.distance.trim()
			: null;
	const eta =
		typeof hospital?.eta === "string" && hospital.eta.trim().length > 0
			? hospital.eta.trim()
			: null;
	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	const bedLabel = Number.isFinite(beds) && beds > 0 ? `${beds} beds open` : null;
	return [distance, eta, bedLabel].filter(Boolean).join(" | ");
}

export function buildTrendingSubtitle(item) {
	const count = Number(item?.count);
	if (Number.isFinite(count) && count > 0) {
		const metric = typeof item?.metric === "string" ? item.metric.trim().toLowerCase() : "search";
		return `${count} ${count === 1 ? metric : `${metric}s`}`;
	}

	const category = typeof item?.category === "string" ? item.category.trim() : "";
	if (category) {
		return category.replace(/[_-]+/g, " ");
	}

	const rank = Number(item?.rank);
	if (Number.isFinite(rank) && rank > 0) {
		return "Trending now";
	}

	return "Popular search";
}

export function buildLocalPopularSearches(hospitals, limit = 5) {
	const counts = new Map();
	const addCandidate = (value, category) => {
		const query = humanizeQueryLabel(value);
		const key = normalizeText(query);
		if (!query || key.length < 3) return;

		const existing = counts.get(key) || {
			query,
			count: 0,
			metric: "hospital",
			category,
		};
		existing.count += 1;
		if (!existing.category && category) {
			existing.category = category;
		}
		counts.set(key, existing);
	};

	(Array.isArray(hospitals) ? hospitals : []).filter(Boolean).forEach((hospital) => {
		toStringList(hospital?.specialties).forEach((item) => addCandidate(item, "Specialty"));
		toStringList(hospital?.serviceTypes || hospital?.service_types).forEach((item) =>
			addCandidate(item, "Service"),
		);
	});

	const ranked = Array.from(counts.values())
		.sort((left, right) => {
			if (right.count !== left.count) return right.count - left.count;
			return left.query.localeCompare(right.query);
		})
		.slice(0, limit);

	if (ranked.length >= limit) return ranked;

	const seen = new Set(ranked.map((item) => normalizeText(item.query)));
	for (const hospital of (Array.isArray(hospitals) ? hospitals : []).filter(Boolean)) {
		if (ranked.length >= limit) break;
		const query = humanizeQueryLabel(hospital?.name);
		const key = normalizeText(query);
		if (!query || seen.has(key)) continue;
		seen.add(key);
		ranked.push({
			query,
			count: 1,
			metric: "hospital",
			category: "Hospital",
		});
	}

	return ranked;
}

export function scoreHospitalMatch(query, hospital) {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery) return 0;

	const tokens = normalizedQuery.split(" ").filter(Boolean);
	if (!tokens.length) return 0;

	const name = normalizeText(hospital?.name);
	const subtitle = normalizeText(buildHospitalSubtitle(hospital));
	const specialties = normalizeText(toStringList(hospital?.specialties).join(" "));
	const features = normalizeText(
		[
			...toStringList(hospital?.features),
			...toStringList(hospital?.serviceTypes || hospital?.service_types),
		].join(" "),
	);

	let score = 0;

	if (name === normalizedQuery) score += 140;
	else if (name.startsWith(normalizedQuery)) score += 100;
	else if (name.includes(normalizedQuery)) score += 72;

	if (specialties.includes(normalizedQuery)) score += 64;
	if (features.includes(normalizedQuery)) score += 36;
	if (subtitle.includes(normalizedQuery)) score += 28;

	for (const token of tokens) {
		if (name.includes(token)) score += 18;
		if (specialties.includes(token)) score += 14;
		if (features.includes(token)) score += 8;
		if (subtitle.includes(token)) score += 6;
	}

	const beds = Number(hospital?.availableBeds ?? hospital?.available_beds);
	if (
		Number.isFinite(beds) &&
		beds > 0 &&
		(tokens.includes("bed") || tokens.includes("beds") || tokens.includes("icu"))
	) {
		score += 18;
	}

	if (hospital?.verified) score += 4;

	return score;
}

export function mapGeocodeResult(result) {
	const location = result?.geometry?.location;
	const components = Array.isArray(result?.address_components) ? result.address_components : [];
	const pick = (type) =>
		components.find((item) => item.types?.includes(type))?.long_name || null;
	const streetNumber = pick("street_number");
	const route = pick("route");
	const locality =
		pick("locality") || pick("sublocality") || pick("administrative_area_level_2");
	const region = pick("administrative_area_level_1");
	const primaryText =
		[streetNumber, route].filter(Boolean).join(" ").trim() ||
		result?.formatted_address ||
		"Selected location";
	const secondaryText =
		[locality, region].filter(Boolean).join(", ").trim() ||
		result?.formatted_address ||
		"";

	return {
		primaryText,
		secondaryText,
		location: location ? { latitude: location.lat, longitude: location.lng } : null,
	};
}

export function mapSuggestionToLocation(suggestion) {
	if (!suggestion) return null;

	if (suggestion.location) {
		return {
			primaryText:
				suggestion.primaryText || suggestion.formattedAddress || "Selected location",
			secondaryText:
				suggestion.secondaryText || suggestion.formattedAddress || "",
			location: suggestion.location,
			formattedAddress: suggestion.formattedAddress || "",
			countryCode:
				typeof suggestion.countryCode === "string" && suggestion.countryCode.trim()
					? suggestion.countryCode.trim().toUpperCase()
					: null,
			source: suggestion.source || "mapbox",
		};
	}

	return null;
}
