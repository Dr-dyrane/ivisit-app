export const MAP_SERVICE_DETAIL_COPY = {
	AMBULANCE_LABEL: "Transport",
	ROOM_LABEL: "Room option",
	CHOOSE_TRANSPORT: "Choose transport",
	CHOOSE_ROOM: "Choose room",
	CURRENT_PILL: "Current",
	CONFIRM_TRANSPORT: "Use transport",
	CONFIRM_ROOM: "Use room",
	CONTINUE_TRANSPORT: "Continue with transport",
	CONTINUE_ROOM: "Continue with room",
	PRICE_FALLBACK: "Price shown before booking",
	TRANSPORT_STATUS_FALLBACK: "Ready",
	ROOM_STATUS_FALLBACK: "Available",
};

export function buildServiceCopy(item, type) {
	if (type === "ambulance") {
		const title = item?.title || "Transport";
		if (/everyday/i.test(title)) {
			return {
				summary: "Fast standard transport for stable trips and everyday urgent support.",
				features: [
					"Good fit for most common dispatch needs",
					"Clear hospital handoff on arrival",
					"Prepared for routine monitoring during transfer",
				],
			};
		}
		if (/extra support/i.test(title)) {
			return {
				summary: "A higher-support crew for patients who may need closer attention en route.",
				features: [
					"Extra support during the trip",
					"Designed for more active monitoring",
					"Smooth handoff into emergency intake",
				],
			};
		}
		return {
			summary: "A higher-acuity transport option for complex or hospital-transfer needs.",
			features: [
				"Best for higher-support transfers",
				"Built for more complex clinical handoff",
				"Aligned to critical movement between care sites",
			],
		};
	}

	const title = item?.title || "Room option";
	if (/general/i.test(title)) {
		return {
			summary: "Shared hospital capacity for standard monitoring and admission needs.",
			features: [
				"Good fit for standard inpatient stays",
				"Usually the fastest bed path when available",
				"Supports routine monitoring and observation",
			],
		};
	}
	if (/private/i.test(title)) {
		return {
			summary: "A more private room option for patients who need quieter recovery space.",
			features: [
				"More private stay experience",
				"Useful when calmer recovery matters",
				"Availability varies by hospital load",
			],
		};
	}
	if (/high-support|icu/i.test(title)) {
		return {
			summary: "Higher-support bed capacity for patients who may require more intensive care.",
			features: [
				"Intended for higher-support monitoring",
				"Closest fit for critical-admission needs",
				"Availability is usually more limited",
			],
		};
	}
	return {
		summary: "Current room availability at this hospital for the selected stay type.",
		features: [
			"Availability updates with hospital capacity",
			"Selection helps clarify the care path",
			"Hospital staff finalize exact placement on arrival",
		],
	};
}
