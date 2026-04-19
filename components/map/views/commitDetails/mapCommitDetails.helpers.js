export function sanitizeCommitEmail(value) {
	return String(value || "").trim().toLowerCase();
}

export function isCommitEmailValid(value) {
	const email = sanitizeCommitEmail(value);
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeCommitOtp(value) {
	return String(value || "")
		.replace(/\D/g, "")
		.slice(0, 6);
}

export function sanitizeCommitPhone(value) {
	const sanitized = String(value || "").replace(/[^\d+()\-\s]/g, "").trim();
	const hasLeadingPlus = sanitized.startsWith("+");
	const digitsAndPunctuation = sanitized.replace(/\+/g, "");
	return `${hasLeadingPlus ? "+" : ""}${digitsAndPunctuation}`.trim();
}

export function isCommitPhoneValid(value) {
	const digits = String(value || "").replace(/\D/g, "");
	const plusMatches = String(value || "").match(/\+/g) || [];
	const startsWithPlus = String(value || "").trim().startsWith("+");
	return digits.length >= 7 && digits.length <= 15 && plusMatches.length <= 1 && (plusMatches.length === 0 || startsWithPlus);
}

export function getInitialCommitDetailsStep(user) {
	if (!user?.email) return "email";
	return "phone";
}

export function buildCommitLocationLabel(locationModel) {
	if (!locationModel || typeof locationModel !== "object") {
		return "";
	}

	const formattedAddress =
		typeof locationModel.formattedAddress === "string"
			? locationModel.formattedAddress.trim()
			: "";
	if (formattedAddress) return formattedAddress;

	const joined = [locationModel.primaryText, locationModel.secondaryText]
		.filter((part) => typeof part === "string" && part.trim().length > 0)
		.join(", ")
		.trim();
	return joined;
}

export function buildMapCommitSeedDraft({
	transport,
	location,
	locationLabel,
}) {
	const confirmedAt = new Date().toISOString();

	return {
		source: "map_commit_details",
		skipSelection: true,
		ambulanceType: transport
			? {
					id: transport.id || null,
					title: transport.title || transport.service_name || "Transport",
					service_name: transport.service_name || transport.title || "Transport",
					service_type: transport.service_type || transport.serviceType || null,
					base_price:
						typeof transport.base_price === "number"
							? transport.base_price
							: null,
					price: transport.priceText || transport.price || null,
					description: transport.description || transport.summary || null,
					crew: transport.crew || null,
				}
			: null,
		location: location || null,
		locationLabel: locationLabel || null,
		locationConfirmedAt: confirmedAt,
	};
}
