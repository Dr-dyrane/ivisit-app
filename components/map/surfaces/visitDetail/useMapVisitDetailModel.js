import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import buildHistoryThemeTokens from "../../history/history.theme";
import { HISTORY_DETAILS_COPY } from "../../history/history.content";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import { paymentService } from "../../../../services/paymentService";
import { hospitalsService } from "../../../../services/hospitalsService";
import { buildHeroBadges as buildHospitalHeroBadges } from "../hospitals/mapHospitalDetail.helpers";
import {
	resolveClinicianLabel,
	resolveDetailsPrimaryAction,
	resolveFacilityLine,
	resolveHistoryDetailsTitle,
	resolveHistoryRequestIcon,
	resolveHistoryServiceLabel,
	resolveTypeValue,
	resolveWhenValue,
} from "../../history/history.presentation";

const REQUEST_TYPES = Object.freeze({
	AMBULANCE: "ambulance",
	BED: "bed",
	VISIT: "visit",
});

const toText = (value) => (typeof value === "string" ? value.trim() : "");

const toFiniteNumber = (value) => {
	if (typeof value === "string") {
		const normalized = value.replace(/[^0-9.-]/g, "");
		if (!normalized) return null;
		const numeric = Number(normalized);
		return Number.isFinite(numeric) ? numeric : null;
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

const normalizeRatingValue = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric == null) return 0;
	return Math.max(0, Math.min(5, numeric));
};

const formatRatingDisplay = (value) => normalizeRatingValue(value).toFixed(1);

const pickText = (...values) => {
	for (const value of values) {
		const text = toText(value);
		if (text) return text;
	}
	return null;
};

const uniqueTextList = (values) => {
	const seen = new Set();
	return (Array.isArray(values) ? values : []).filter((value) => {
		const text = toText(value);
		if (!text) return false;
		const key = text.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const joinParts = (parts, separator = " / ") => {
	const resolved = (Array.isArray(parts) ? parts : [])
		.map((part) => toText(part))
		.filter(Boolean);
	return resolved.length ? resolved.join(separator) : null;
};

const withoutDuplicates = (...values) => uniqueTextList(values);

const toTitleCase = (value) => {
	const normalized = toText(value).replace(/[_-]+/g, " ");
	if (!normalized) return null;
	return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
};

const toCurrencyLabel = (value) => {
	const numeric = toFiniteNumber(value);
	if (numeric != null) return `$${numeric.toFixed(2)}`;
	const text = toText(value);
	return text || null;
};

// PULLBACK NOTE: Add URL validation to prevent network errors
// OLD: Return { uri: text } for any non-empty string
// NEW: Only return { uri: ... } for valid URLs
const isValidUrl = (string) => {
	if (typeof string !== "string" || string.trim().length === 0) return false;
	try {
		const url = new URL(string.trim());
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

const resolveMediaSource = (...values) => {
	for (const value of values) {
		if (typeof value === "number") return value;
		if (value && typeof value === "object" && value.uri) return value;
		const text = toText(value);
		if (text && isValidUrl(text)) return { uri: text };
	}
	return null;
};

const readRawField = (raw, ...keys) => {
	for (const key of keys) {
		if (raw && raw[key] != null) return raw[key];
	}
	return null;
};

// Render a timestamp as a friendly, glanceable label for the mid-snap stats
// row. Same-day buckets read as "Today / Yesterday / Tomorrow, 10:30 AM";
// near-term days collapse to "in 3 days" / "3 days ago"; everything else
// drops back to a short locale date with time.
const formatHumanWhen = (ms) => {
	const numeric = Number(ms);
	if (!Number.isFinite(numeric)) return null;
	const date = new Date(numeric);
	if (Number.isNaN(date.getTime())) return null;
	const now = new Date();
	const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const dayMs = 24 * 60 * 60 * 1000;
	const todayStart = startOf(now);
	const targetStart = startOf(date);
	const dayDiff = Math.round((targetStart - todayStart) / dayMs);
	let timePart = null;
	try {
		timePart = new Intl.DateTimeFormat(undefined, {
			hour: "numeric",
			minute: "2-digit",
		}).format(date);
	} catch (_error) {
		timePart = null;
	}
	if (dayDiff === 0) return timePart ? `Today, ${timePart}` : "Today";
	if (dayDiff === -1) return timePart ? `Yesterday, ${timePart}` : "Yesterday";
	if (dayDiff === 1) return timePart ? `Tomorrow, ${timePart}` : "Tomorrow";
	if (dayDiff < 0 && dayDiff >= -6) return `${Math.abs(dayDiff)} days ago`;
	if (dayDiff > 0 && dayDiff <= 6) return `In ${dayDiff} days`;
	try {
		const sameYear = date.getFullYear() === now.getFullYear();
		const datePart = new Intl.DateTimeFormat(undefined, {
			weekday: "short",
			day: "numeric",
			month: "short",
			...(sameYear ? {} : { year: "numeric" }),
		}).format(date);
		return timePart ? `${datePart}, ${timePart}` : datePart;
	} catch (_error) {
		return date.toLocaleString();
	}
};

const resolveVehicleLabel = (_historyItem, raw) => {
	const vehicleType = resolveHistoryServiceLabel({
		requestType: REQUEST_TYPES.AMBULANCE,
		value:
			readRawField(raw, "responderVehicleType", "responder_vehicle_type") ||
			readRawField(raw, "ambulanceType", "ambulance_type"),
		fallbackLabel: null,
	});
	const plate = pickText(
		readRawField(raw, "responderVehiclePlate", "responder_vehicle_plate"),
		readRawField(raw, "ambulanceId", "ambulance_id"),
	);
	return joinParts([vehicleType, plate]);
};

const resolveJourneyProgress = (status) => {
	switch (String(status || "").toLowerCase()) {
		case "completed":
		case "rating_pending":
			return 1;
		case "active":
			return 0.72;
		case "confirmed":
			return 0.38;
		case "pending":
			return 0.2;
		default:
			return 0.56;
	}
};

const resolveBedLabel = (raw) => {
	return resolveHistoryServiceLabel({
		requestType: REQUEST_TYPES.BED,
		value: readRawField(raw, "bedType", "bed_type"),
		fallbackLabel: null,
	});
};

// PULLBACK NOTE: Fix collapsed action to always show primary CTA (never null)
// OLD: Return null if no action available (hides left button)
// NEW: Always return directions as fallback (matches mid-snap behavior)
const buildVisitCollapsedAction = ({
	canResume,
	onResume,
	canRate,
	onRateVisit,
	canDirections,
	onGetDirections,
	canRevisit,
	onBookAgain,
	status,
	requestType,
}) => {
	const isCancelled = status === "cancelled";
	const isRatingPending = status === "rating_pending";
	const showTrack = canResume;

	// Primary action priority matches placeActions
	if (showTrack) {
		return {
			onPress: onResume,
			icon: requestType === REQUEST_TYPES.BED ? "bed-outline" : "navigate-outline",
			iconType: "ion",
			primary: true,
			accessibilityLabel: "Resume tracking",
		};
	}
	if (isRatingPending && canRate) {
		return {
			onPress: onRateVisit,
			icon: "star-outline",
			iconType: "ion",
			primary: true,
			accessibilityLabel: "Rate visit",
		};
	}
	if (canDirections) {
		return {
			onPress: onGetDirections,
			icon: "navigate-outline",
			iconType: "ion",
			primary: false,
			accessibilityLabel: "Get directions",
		};
	}
	if (canRevisit) {
		return {
			onPress: onBookAgain,
			icon: "calendar-plus",
			iconType: "ion",
			primary: false,
			accessibilityLabel: "Book again",
		};
	}
	// Fallback to directions even if cancelled (matches mid-snap behavior)
	if (onGetDirections) {
		return {
			onPress: onGetDirections,
			icon: "navigate-outline",
			iconType: "ion",
			primary: false,
			accessibilityLabel: "Get directions",
		};
	}
	return null;
};

const buildVisitCollapsedDistanceLabel = ({ whenValue, status }) => {
	if (status === "active") return "Active now";
	if (status === "pending") return "Pending";
	if (status === "confirmed") return "Upcoming";
	if (whenValue) return whenValue;
	return "Visit";
};

const resolvePaymentMethodLabel = (raw) => {
	const directLabel = pickText(
		readRawField(raw, "paymentMethodLabel"),
		readRawField(raw, "paymentMethod", "payment_method"),
	);
	if (directLabel) {
		const normalized = directLabel.toLowerCase();
		if (normalized.includes("cash")) return "Cash";
		if (normalized.includes("wallet")) return "iVisit balance";
		if (normalized.includes("card")) return "Card on file";
		return toTitleCase(directLabel);
	}

	const paymentMethodId = pickText(
		readRawField(raw, "paymentMethodId", "payment_method_id"),
	);
	if (!paymentMethodId) return null;
	if (paymentMethodId.toLowerCase().includes("cash")) return "Cash";
	if (paymentMethodId.toLowerCase().includes("wallet")) return "iVisit balance";
	return "Method on file";
};

const resolvePaymentTotalLabel = (historyItem, raw) => {
	const numericCandidates = [
		readRawField(raw, "userAmount", "user_amount"),
		readRawField(raw, "totalAmount", "total_amount"),
		readRawField(raw, "amount"),
		readRawField(raw, "totalCost", "total_cost"),
		historyItem?.paymentSummary,
	];
	const positiveCandidate = numericCandidates.find((value) => {
		const numeric = toFiniteNumber(value);
		return numeric != null && Math.abs(numeric) > 0;
	});
	if (positiveCandidate != null) {
		return toCurrencyLabel(positiveCandidate);
	}

	const textCandidate = numericCandidates.find((value) => {
		const text = toText(value).replace(/,/g, "");
		if (!text) return false;
		return !/^\$?0(?:\.0+)?$/.test(text);
	});
	if (textCandidate != null) {
		return toCurrencyLabel(textCandidate);
	}

	const hasLinkedPayment =
		Boolean(historyItem?.paymentId) ||
		Boolean(readRawField(raw, "paymentStatus", "payment_status"));
	if (hasLinkedPayment) return null;

	const hasZeroCandidate = numericCandidates.some((value) => toFiniteNumber(value) === 0);
	return hasZeroCandidate ? "$0.00" : null;
};

const buildJourney = (historyItem, raw, whenValue) => {
	if (historyItem?.requestType !== REQUEST_TYPES.AMBULANCE) return null;
	if (!historyItem?.facilityName) return null;
	const destinationTitle =
		pickText(
			readRawField(
				raw,
				"pickupLabel",
				"pickup_label",
				"pickupAddress",
				"pickup_address",
				"patientAddress",
				"patient_address",
			),
		) || "Your location";
	return {
		whenLabel:
			pickText(readRawField(raw, "estimatedArrival", "estimated_arrival")) || whenValue,
		statusLabel: historyItem?.statusLabel || null,
		serviceLabel: resolveTypeValue(historyItem),
		requestLabel: historyItem?.displayId || historyItem?.requestId || null,
		progressValue: resolveJourneyProgress(historyItem?.status),
		trackingKind: historyItem?.requestType,
		originLabel: "Hospital",
		originTitle: historyItem.facilityName,
		originSubtitle: resolveFacilityLine(historyItem),
		destinationLabel: "Pickup",
		destinationTitle,
		destinationSubtitle:
			destinationTitle === "Your location" ? "Pickup destination" : "Patient destination",
	};
};

const buildTriageRows = (raw) => {
	const rows = [];
	const triageProgress = readRawField(raw, "triageProgress", "triage_progress", "progress");
	const answeredCount = toFiniteNumber(
		triageProgress?.answeredSteps ??
			triageProgress?.answeredCount ??
			triageProgress?.completedSteps,
	);
	const totalSteps = toFiniteNumber(triageProgress?.totalSteps);
	if (answeredCount != null && totalSteps != null && totalSteps > 0) {
		rows.push({
			key: "triageProgress",
			label: HISTORY_DETAILS_COPY.detailLabels.triageProgress,
			value: `${answeredCount}/${totalSteps}`,
			icon: "pulse-outline",
		});
	}

	const urgency = pickText(
		triageProgress?.severityBand,
		triageProgress?.urgency,
		readRawField(raw, "triageSnapshot", "triage_snapshot", "triage")?.severityBand,
	);
	if (urgency) {
		rows.push({
			key: "triageUrgency",
			label: HISTORY_DETAILS_COPY.detailLabels.triageUrgency,
			value: toTitleCase(urgency),
			icon: "alert-circle-outline",
		});
	}

	return rows;
};

const filterMeaningfulRows = (rows) =>
	rows.filter((row) => {
		if (!row) return false;
		if (row.kind === "rating") {
			return true;
		}
		return row.value != null && String(row.value).trim();
	});

export default function useMapVisitDetailModel({
	historyItem,
	onResume,
	onRateVisit,
	onCallClinic,
	onJoinVideo,
	onBookAgain,
	onOpenPaymentDetails,
	onGetDirections,
}) {
	const { isDarkMode } = useTheme();

	const theme = useMemo(
		() =>
			buildHistoryThemeTokens({
				isDarkMode,
				toneKey: historyItem?.statusTone ?? null,
				requestType: historyItem?.requestType ?? null,
				surface: "hero",
			}),
		[isDarkMode, historyItem?.statusTone, historyItem?.requestType],
	);

	const raw = useMemo(() => historyItem?.visit ?? {}, [historyItem]);
	const modalTitle = useMemo(
		() => resolveHistoryDetailsTitle(historyItem?.requestType),
		[historyItem?.requestType],
	);
	const iconDescriptor = useMemo(
		() => resolveHistoryRequestIcon(historyItem?.requestType),
		[historyItem?.requestType],
	);

	const whenValue = useMemo(() => resolveWhenValue(historyItem), [historyItem]);
	// Glance-friendly variant for the mid-snap stats row. Falls back to the
	// raw date/time string when no canonical timestamp is available.
	const humanWhenLabel = useMemo(() => {
		const ms =
			historyItem?.sortTimestampMs ??
			(historyItem?.sortTimestamp ? Date.parse(historyItem.sortTimestamp) : null) ??
			(historyItem?.scheduledFor ? Date.parse(historyItem.scheduledFor) : null) ??
			(historyItem?.completedAt ? Date.parse(historyItem.completedAt) : null) ??
			(historyItem?.createdAt ? Date.parse(historyItem.createdAt) : null);
		return formatHumanWhen(ms) || whenValue;
	}, [
		historyItem?.sortTimestampMs,
		historyItem?.sortTimestamp,
		historyItem?.scheduledFor,
		historyItem?.completedAt,
		historyItem?.createdAt,
		whenValue,
	]);
	const facilityLine = useMemo(() => resolveFacilityLine(historyItem), [historyItem]);
	const actorName = useMemo(
		() =>
			pickText(
				historyItem?.doctorName,
				historyItem?.actorName,
				readRawField(raw, "responderName", "responder_name"),
			),
		[historyItem?.actorName, historyItem?.doctorName, raw],
	);
	const clinicianLabel = useMemo(
		() => resolveClinicianLabel(historyItem),
		[historyItem],
	);
	const specialtyLabel = useMemo(
		() =>
			resolveHistoryServiceLabel({
				requestType: REQUEST_TYPES.VISIT,
				value: historyItem?.specialty,
				fallbackLabel: null,
			}),
		[historyItem?.specialty],
	);
	const vehicleLabel = useMemo(
		() => resolveVehicleLabel(historyItem, raw),
		[historyItem, raw],
	);
	const bedLabel = useMemo(() => resolveBedLabel(raw), [raw]);
	const etaLabel = useMemo(
		() => pickText(readRawField(raw, "estimatedArrival", "estimated_arrival")),
		[raw],
	);

	const topSlot = useMemo(() => {
		if (!historyItem) return null;
		const title =
			historyItem.facilityName ||
			historyItem.hospitalName ||
			historyItem.title ||
			modalTitle;
		const subtitle = historyItem.statusLabel || resolveTypeValue(historyItem) || null;
		return {
			title,
			subtitle,
		};
	}, [historyItem, modalTitle]);

	// Hydrate the hospital row that backs this visit so the hero can render
	// facility-level pills (Verified / Emergency level / service type) the same
	// way MapHospitalDetailBody does. Cached per hospitalId; cleared on switch.
	const hospitalId = historyItem?.hospitalId || null;
	const [hospitalDetails, setHospitalDetails] = useState(null);
	const hospitalLookupKeyRef = useRef(null);
	useEffect(() => {
		if (hospitalLookupKeyRef.current !== hospitalId) {
			hospitalLookupKeyRef.current = hospitalId;
			setHospitalDetails(null);
		}
		if (!hospitalId) return undefined;
		let cancelled = false;
		(async () => {
			try {
				const record = await hospitalsService.getById(hospitalId);
				if (cancelled) return;
				if (hospitalLookupKeyRef.current !== hospitalId) return;
				if (record) setHospitalDetails(record);
			} catch (_error) {
				// Silent — hero falls back to visit-derived badges only.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [hospitalId]);

	const hero = useMemo(() => {
		if (!historyItem) return null;
		const facilityName =
			historyItem.facilityName ||
			historyItem.hospitalName ||
			historyItem.title ||
			"Care request";
		const typeTitle = resolveTypeValue(historyItem) || modalTitle;
		let supportLine = null;
		if (historyItem.requestType === REQUEST_TYPES.VISIT) {
			supportLine = joinParts(
				withoutDuplicates(actorName, specialtyLabel).filter(
					(value) => toText(value).toLowerCase() !== toText(typeTitle).toLowerCase(),
				),
			);
		} else if (historyItem.requestType === REQUEST_TYPES.AMBULANCE) {
			supportLine = joinParts(
				withoutDuplicates(actorName, vehicleLabel).filter(
					(value) => toText(value).toLowerCase() !== toText(typeTitle).toLowerCase(),
				),
			);
		} else if (historyItem.requestType === REQUEST_TYPES.BED) {
			supportLine =
				toText(bedLabel).toLowerCase() === toText(typeTitle).toLowerCase()
					? null
					: bedLabel;
		}

		// Visit-specific identifier badge (room # / bed # / vehicle plate). Kept
		// as the leading pill so the hero immediately surfaces the booked detail.
		const visitIdentifier = uniqueTextList([
			historyItem.requestType === REQUEST_TYPES.VISIT
				? historyItem.roomNumber
				: historyItem.requestType === REQUEST_TYPES.BED
					? pickText(readRawField(raw, "bedNumber", "bed_number"))
					: pickText(
							readRawField(raw, "responderVehiclePlate", "responder_vehicle_plate"),
							readRawField(raw, "ambulanceId", "ambulance_id"),
						),
		])[0];
		const visitBadge = visitIdentifier
			? {
					label: visitIdentifier,
					icon:
						historyItem.requestType === REQUEST_TYPES.AMBULANCE
							? "car-outline"
							: historyItem.requestType === REQUEST_TYPES.BED
								? "bed-outline"
								: "business-outline",
					iconType: "ion",
					tone: "neutral",
				}
			: null;

		// Facility pills hydrated from the hospital DB row (verified / emergency
		// level / service type). Fall back to any inline visit fields when the
		// hospital row hasn't loaded yet so the hero never renders bare.
		const hospitalSource = hospitalDetails || {
			verified: historyItem?.facilityVerified,
			emergencyLevel: readRawField(raw, "emergencyLevel", "emergency_level"),
			serviceTypes: readRawField(raw, "serviceTypes", "service_types"),
		};
		const hospitalBadges = buildHospitalHeroBadges(hospitalSource) || [];

		// Dedupe by case-insensitive label and cap at 3 total pills.
		const seenLabels = new Set();
		const badges = [];
		[visitBadge, ...hospitalBadges].forEach((item) => {
			if (!item || !item.label) return;
			const key = String(item.label).trim().toLowerCase();
			if (!key || seenLabels.has(key)) return;
			seenLabels.add(key);
			badges.push(item);
		});

		const heroHospital = {
			name: facilityName,
			image:
				hospitalDetails?.image ||
				historyItem.heroImageUrl ||
				readRawField(raw, "hospitalImage", "hospital_image"),
			imageUri:
				hospitalDetails?.image ||
				historyItem.heroImageUrl ||
				readRawField(raw, "hospitalImage", "hospital_image"),
			googlePhotos: hospitalDetails?.googlePhotos || [],
			google_photos: hospitalDetails?.google_photos || [],
		};

		return {
			iconDescriptor,
			title: facilityName,
			subtitle: typeTitle,
			supportLine,
			facilityLine,
			statusLabel: historyItem.statusLabel || null,
			statusTone: historyItem.statusTone || null,
			imageSource:
				getHospitalHeroSource(heroHospital) ||
				resolveMediaSource(
					historyItem.heroImageUrl,
					readRawField(raw, "hospitalImage", "hospital_image"),
					readRawField(raw, "doctorImage", "doctor_image"),
				),
			badges: badges.slice(0, 3),
		};
	}, [
		actorName,
		bedLabel,
		clinicianLabel,
		facilityLine,
		historyItem,
		hospitalDetails,
		iconDescriptor,
		modalTitle,
		raw,
		specialtyLabel,
		vehicleLabel,
	]);

	const compactDetails = useMemo(() => {
		if (!historyItem) return [];
		if (historyItem.requestType === REQUEST_TYPES.AMBULANCE) {
			const isLiveRequest =
				historyItem.status === "active" ||
				historyItem.status === "pending" ||
				historyItem.status === "confirmed";
			return filterMeaningfulRows([
				{
					key: isLiveRequest ? "eta" : "when",
					label: isLiveRequest
						? HISTORY_DETAILS_COPY.detailLabels.eta
						: HISTORY_DETAILS_COPY.detailLabels.when,
					value: isLiveRequest ? etaLabel || whenValue : whenValue,
					icon: "time-outline",
				},
				{
					key: "responder",
					label: HISTORY_DETAILS_COPY.detailLabels.responder,
					value: actorName,
					icon: "person-outline",
				},
				{
					key: "vehicle",
					label: HISTORY_DETAILS_COPY.detailLabels.vehicle,
					value: vehicleLabel,
					icon: "car-outline",
				},
			]);
		}
		if (historyItem.requestType === REQUEST_TYPES.BED) {
			const isLiveReservation =
				historyItem.status === "active" ||
				historyItem.status === "pending" ||
				historyItem.status === "confirmed";
			return filterMeaningfulRows([
				{
					key: isLiveReservation ? "eta" : "when",
					label: isLiveReservation
						? HISTORY_DETAILS_COPY.detailLabels.eta
						: HISTORY_DETAILS_COPY.detailLabels.when,
					value: isLiveReservation ? etaLabel || whenValue : whenValue,
					icon: "time-outline",
				},
				{
					key: "bedType",
					label: HISTORY_DETAILS_COPY.detailLabels.bedType,
					value: bedLabel,
					icon: "bed-outline",
				},
				{
					key: "bedNumber",
					label: HISTORY_DETAILS_COPY.detailLabels.bedNumber,
					value: pickText(readRawField(raw, "bedNumber", "bed_number")),
					icon: "bed-outline",
				},
			]);
		}
		return filterMeaningfulRows([
			{
				key: "when",
				label: HISTORY_DETAILS_COPY.detailLabels.when,
				value: whenValue,
				icon: "calendar-outline",
			},
			{
				key: "specialty",
				label: HISTORY_DETAILS_COPY.detailLabels.specialty,
				value: specialtyLabel,
				icon: "medkit-outline",
			},
			{
				key: "clinician",
				label: clinicianLabel,
				value: actorName,
				icon: "person-outline",
			},
			{
				key: "room",
				label: HISTORY_DETAILS_COPY.detailLabels.room,
				value: historyItem.roomNumber,
				icon: "business-outline",
			},
		]);
	}, [actorName, bedLabel, clinicianLabel, etaLabel, historyItem, raw, specialtyLabel, vehicleLabel, whenValue]);

	const expandedDetails = useMemo(() => {
		if (!historyItem) return [];
		const ratingValue = normalizeRatingValue(historyItem?.existingRating);
		return filterMeaningfulRows([
			{
				key: "type",
				label: HISTORY_DETAILS_COPY.detailLabels.type,
				value: resolveTypeValue(historyItem),
				icon: "list-outline",
			},
			{
				key: "specialty",
				label: HISTORY_DETAILS_COPY.detailLabels.specialty,
				value: specialtyLabel,
				icon: "medkit-outline",
			},
			{
				key: "clinician",
				label: clinicianLabel,
				value: actorName,
				icon: "person-outline",
			},
			{
				key: "room",
				label: HISTORY_DETAILS_COPY.detailLabels.room,
				value: historyItem.roomNumber,
				icon: "business-outline",
			},
			{
				key: "nextVisit",
				label: HISTORY_DETAILS_COPY.detailLabels.nextVisit,
				value: historyItem.nextVisitLabel,
				icon: "calendar-outline",
			},
			{
				key: "rating",
				label: HISTORY_DETAILS_COPY.detailLabels.myRating || "My rating",
				value: null,
				ratingValue,
				kind: "rating",
				icon: "star-outline",
			},
			{
				key: "feedback",
				label: HISTORY_DETAILS_COPY.detailLabels.feedback,
				value: historyItem.ratingComment,
				icon: "chatbubble-outline",
			},
			{
				key: "notes",
				label: HISTORY_DETAILS_COPY.detailLabels.notes,
				value: historyItem.notes,
				icon: "document-text-outline",
			},
			{
				key: "reference",
				label: HISTORY_DETAILS_COPY.detailLabels.reference,
				value: historyItem.displayId || historyItem.requestId || historyItem.id,
				icon: "receipt-outline",
			},
		]);
	}, [actorName, clinicianLabel, historyItem, specialtyLabel]);

	// Local total resolved from the history record/raw blob. This is the
	// authoritative source when present; otherwise we fall back to the
	// background payment-history lookup below.
	const localPaymentTotalLabel = useMemo(() => {
		if (!historyItem) return null;
		return resolvePaymentTotalLabel(historyItem, raw);
	}, [historyItem, raw]);

	// When the locally-resolved total is missing or reads as $0.00, fall back
	// to the same lookup the payment-details modal makes
	// (paymentService.getPaymentHistoryEntry) so both the stat row and the
	// payment-details section carry the authoritative amount.
	const paymentLookupKey = useMemo(
		() => historyItem?.paymentId || historyItem?.requestId || null,
		[historyItem?.paymentId, historyItem?.requestId],
	);
	const [fetchedPriceLabel, setFetchedPriceLabel] = useState(null);
	const fetchedPriceKeyRef = useRef(null);
	useEffect(() => {
		if (paymentLookupKey !== fetchedPriceKeyRef.current) {
			fetchedPriceKeyRef.current = paymentLookupKey;
			setFetchedPriceLabel(null);
		}
		if (!paymentLookupKey) return undefined;
		const localAmount = toFiniteNumber(localPaymentTotalLabel);
		const hasUsableLocal = localAmount != null && Math.abs(localAmount) > 0;
		if (hasUsableLocal) return undefined;
		let cancelled = false;
		(async () => {
			try {
				const entry = await paymentService.getPaymentHistoryEntry({
					transactionId: historyItem?.paymentId || null,
					requestId: historyItem?.requestId || null,
				});
				if (cancelled) return;
				if (fetchedPriceKeyRef.current !== paymentLookupKey) return;
				const label = toCurrencyLabel(entry?.amount);
				const numeric = toFiniteNumber(label);
				if (label && numeric != null && Math.abs(numeric) > 0) {
					setFetchedPriceLabel(label);
				}
			} catch (_error) {
				// Silent — payment row simply keeps the placeholder.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [
		paymentLookupKey,
		localPaymentTotalLabel,
		historyItem?.paymentId,
		historyItem?.requestId,
	]);

	// Effective total: local first, fetched fallback when local is empty/$0.00.
	const effectivePaymentTotalLabel = useMemo(() => {
		const localAmount = toFiniteNumber(localPaymentTotalLabel);
		const localUsable = localAmount != null && Math.abs(localAmount) > 0;
		if (localUsable) return localPaymentTotalLabel;
		return fetchedPriceLabel || localPaymentTotalLabel || null;
	}, [localPaymentTotalLabel, fetchedPriceLabel]);

	const paymentRows = useMemo(() => {
		if (!historyItem) return [];
		const totalLabel = effectivePaymentTotalLabel;
		const paymentStatus = toTitleCase(
			readRawField(raw, "paymentStatus", "payment_status"),
		);
		const paymentTotalLabel =
			totalLabel &&
			(historyItem.status === "completed" || historyItem.status === "rating_pending")
				? HISTORY_DETAILS_COPY.detailLabels.paid || "Paid"
				: HISTORY_DETAILS_COPY.detailLabels.total || "Total";
		const paymentMethod = resolvePaymentMethodLabel(raw);
		return filterMeaningfulRows([
			{
				key: "payment",
				label:
					totalLabel
						? paymentTotalLabel
						: HISTORY_DETAILS_COPY.detailLabels.payment,
				value: totalLabel,
				icon: "cash-outline",
			},
			{
				key: "paymentStatus",
				label: HISTORY_DETAILS_COPY.detailLabels.paymentStatus,
				value: paymentStatus,
				icon: "card-outline",
			},
			{
				key: "paymentMethod",
				label: HISTORY_DETAILS_COPY.detailLabels.paymentMethod,
				value: paymentMethod,
				icon: "wallet-outline",
			},
		]);
	}, [historyItem, raw, effectivePaymentTotalLabel]);

	const paymentSummary = useMemo(() => {
		if (!paymentRows.length) return null;
		return (
			paymentRows.find((row) => row.key === "payment")?.value ||
			paymentRows.find((row) => row.key === "paymentStatus")?.value ||
			paymentRows[0]?.value ||
			null
		);
	}, [paymentRows]);

	const journey = useMemo(
		() => buildJourney(historyItem, raw, whenValue),
		[historyItem, raw, whenValue],
	);

	const triageRows = useMemo(() => buildTriageRows(raw), [raw]);

	const triageSummary = useMemo(() => {
		if (!triageRows.length) return null;
		return (
			triageRows.find((row) => row.key === "triageProgress")?.value ||
			triageRows.find((row) => row.key === "triageUrgency")?.value ||
			triageRows[0]?.value ||
			null
		);
	}, [triageRows]);

	const preparation = useMemo(() => {
		const list = historyItem?.preparation;
		return Array.isArray(list) && list.length > 0 ? list : null;
	}, [historyItem]);

	const primaryAction = useMemo(
		() => resolveDetailsPrimaryAction({ historyItem, onRateVisit, onResume }),
		[historyItem, onRateVisit, onResume],
	);

	const actions = useMemo(() => {
		if (!historyItem) return [];
		const list = [];
		const hasPaymentDetails =
			paymentRows.length > 0 &&
			(typeof historyItem?.paymentId === "string" ||
				(historyItem?.sourceKind === "emergency" &&
					typeof historyItem?.requestId === "string"));
		if (historyItem.canCallClinic && typeof onCallClinic === "function") {
			list.push({
				key: "call",
				label: HISTORY_DETAILS_COPY.actionLabels.callClinic,
				iconName: "call-outline",
				iconColor: theme.actionCallColor,
				onPress: onCallClinic,
			});
		}
		if (historyItem.canJoinVideo && typeof onJoinVideo === "function") {
			list.push({
				key: "video",
				label: HISTORY_DETAILS_COPY.actionLabels.joinVideo,
				iconName: "videocam-outline",
				iconColor: theme.actionVideoColor,
				onPress: onJoinVideo,
			});
		}
		if (historyItem.canBookAgain && typeof onBookAgain === "function") {
			list.push({
				key: "bookAgain",
				label: HISTORY_DETAILS_COPY.actionLabels.bookAgain,
				iconName: "repeat-outline",
				iconColor: theme.actionBookColor,
				onPress: onBookAgain,
			});
		}
		if (hasPaymentDetails && typeof onOpenPaymentDetails === "function") {
			list.push({
				key: "paymentDetails",
				label: HISTORY_DETAILS_COPY.actionLabels.paymentDetails,
				iconName: "receipt-outline",
				iconColor: theme.actionDirectionsColor,
				onPress: onOpenPaymentDetails,
			});
		}
		if (
			(historyItem.facilityCoordinate || historyItem.hospitalCoordinate) &&
			typeof onGetDirections === "function"
		) {
			list.push({
				key: "directions",
				label: HISTORY_DETAILS_COPY.actionLabels.directions,
				iconName: "navigate-outline",
				iconColor: theme.actionDirectionsColor,
				onPress: onGetDirections,
			});
		}
		return list;
	}, [
		historyItem,
		onBookAgain,
		onCallClinic,
		onGetDirections,
		onJoinVideo,
		onOpenPaymentDetails,
		paymentRows.length,
		theme,
	]);

	const canCancel = Boolean(historyItem?.canCancel);

	// Derive action capabilities
	const hasCoordinates = Boolean(
		historyItem?.facilityCoordinate || historyItem?.hospitalCoordinate,
	);
	const canResume = Boolean(historyItem?.canResume && typeof onResume === "function");
	// VD-A: log canResume at model build — detect stale visit status vs live trip
	if (__DEV__) {
		console.log("[VD-A][useMapVisitDetailModel] canResume", {
			canResume,
			historyItemCanResume: historyItem?.canResume,
			status: historyItem?.status,
			lifecycleState: historyItem?.lifecycleState,
			requestId: historyItem?.requestId,
			hasOnResume: typeof onResume === "function",
		});
	}
	const canRate = Boolean(historyItem?.canRate && typeof onRateVisit === "function");
	const canCall = Boolean(historyItem?.canCallClinic && typeof onCallClinic === "function");
	const canDirections = Boolean(hasCoordinates && typeof onGetDirections === "function");
	const canRevisit = Boolean(historyItem?.canBookAgain && typeof onBookAgain === "function");

	const collapsedAction = useMemo(
		() =>
			buildVisitCollapsedAction({
				canResume,
				onResume,
				canRate,
				onRateVisit,
				canDirections,
				onGetDirections,
				canRevisit,
				onBookAgain,
				status: historyItem?.status,
				requestType: historyItem?.requestType,
			}),
		[canResume, onResume, canRate, onRateVisit, canDirections, onGetDirections, canRevisit, onBookAgain, historyItem?.status, historyItem?.requestType],
	);

	const collapsedDistanceLabel = useMemo(
		() =>
			buildVisitCollapsedDistanceLabel({
				whenValue,
				status: historyItem?.status,
			}),
		[whenValue, historyItem?.status],
	);

	// Reference ID for display
	const referenceId = useMemo(() => {
		const displayId = historyItem?.displayId;
		const requestId = historyItem?.requestId;
		if (displayId) return displayId;
		if (requestId && requestId.length > 8) {
			return `REQ-${requestId.slice(-6).toUpperCase()}`;
		}
		return null;
	}, [historyItem?.displayId, historyItem?.requestId]);

	// Lifecycle-aware "headline" stat surfaced in the mid-snap stats card.
	// Replaces the reference id (which already lives in the route card when an
	// ambulance journey is rendered, and in the expanded details card always)
	// with a single piece of high-signal context tuned to the visit's status.
	// Returns null when no useful headline is available, so the stats builder
	// can fall back to the reference id.
	const headlineStat = useMemo(() => {
		if (!historyItem) return null;
		const status = historyItem.status;

		if (status === "cancelled") {
			return {
				key: "lifecycleCancelled",
				label: HISTORY_DETAILS_COPY.detailLabels.paymentStatus || "Status",
				value: "Cancelled",
				icon: "close-circle-outline",
				iconType: "ion",
			};
		}

		if (status === "rating_pending") {
			return {
				key: "lifecycleRate",
				label: HISTORY_DETAILS_COPY.detailLabels.rating || "Rating",
				value: "Tap to rate",
				icon: "star-outline",
				iconType: "ion",
			};
		}

		if (status === "completed") {
			const ratingValue = normalizeRatingValue(historyItem?.existingRating);
			return {
				key: "lifecycleRating",
				label: HISTORY_DETAILS_COPY.detailLabels.myRating || "My rating",
				value: formatRatingDisplay(historyItem?.existingRating),
				ratingValue,
				kind: "rating",
				icon: ratingValue > 0 ? "star" : "star-outline",
				iconType: "ion",
			};
		}

		// Upcoming / active clinic visits — room number is high-value wayfinding.
		if (
			(status === "pending" || status === "confirmed" || status === "active") &&
			historyItem.requestType !== REQUEST_TYPES.AMBULANCE &&
			historyItem.roomNumber
		) {
			return {
				key: "lifecycleRoom",
				label: HISTORY_DETAILS_COPY.detailLabels.room || "Room",
				value: historyItem.roomNumber,
				icon: "business-outline",
				iconType: "ion",
			};
		}

		return null;
	}, [historyItem]);

	// Dedicated price stat for the mid-snap stats card. When payment data is
	// present this displaces the requestType-specific slot-3 detail (vehicle /
	// bed# / clinician) so the at-a-glance row carries the dollar amount.
	// paymentSummary already incorporates the background-fetched label via
	// effectivePaymentTotalLabel, so no extra fetch needed here.
	const priceStat = useMemo(() => {
		if (!paymentSummary) return null;
		return {
			key: "price",
			label:
				historyItem?.status === "completed" || historyItem?.status === "rating_pending"
					? HISTORY_DETAILS_COPY.detailLabels.paid || "Paid"
					: HISTORY_DETAILS_COPY.detailLabels.total || "Total",
			value: paymentSummary,
			icon: "cash-outline",
			iconType: "ion",
		};
	}, [historyItem?.status, paymentSummary]);

	// Build place actions - 4 buttons whose primary slot tracks visit lifecycle.
	// Primary priority: Track (active/upcoming with resume) > Rate (rating pending)
	//                   > Directions (completed). Cancelled = none.
	// Slot 3 is Directions when tracking is live, otherwise Revisit (Book again).
	// Video stays in the deep CTA group (only valid in narrow joinable windows).
	const placeActions = useMemo(() => {
		if (!historyItem) return [];

		const status = historyItem.status;
		const isCancelled = status === "cancelled";
		const isRatingPending = status === "rating_pending";
		const showTrack = canResume;

		let primaryKey = null;
		if (showTrack) primaryKey = "track";
		else if (isRatingPending && canRate) primaryKey = "rate";
		else if (canDirections && !isCancelled) primaryKey = "directions";
		else if (canRevisit) primaryKey = "revisit";

		const slot1 = showTrack
			? {
					key: "track",
					label: historyItem.requestType === REQUEST_TYPES.BED ? "Resume" : "Track",
					icon:
						historyItem.requestType === REQUEST_TYPES.BED
							? "bed-outline"
							: "navigate-circle-outline",
					activeIcon:
						historyItem.requestType === REQUEST_TYPES.BED ? "bed" : "navigate-circle",
					iconType: "ion",
					activeIconType: "ion",
					primary: primaryKey === "track",
					onPress: onResume,
					disabled: false,
					accessibilityLabel: "Resume tracking",
				}
			: {
					key: "directions",
					label: "Directions",
					icon: "navigate-outline",
					activeIcon: "navigate",
					iconType: "ion",
					activeIconType: "ion",
					primary: primaryKey === "directions",
					onPress: canDirections && !isCancelled ? onGetDirections : undefined,
					disabled: !canDirections || isCancelled,
					accessibilityLabel: HISTORY_DETAILS_COPY.actionLabels.directions,
				};

		const slot2 = {
			key: "call",
			label: "Call",
			icon: "call-outline",
			activeIcon: "call",
			iconType: "ion",
			activeIconType: "ion",
			primary: false,
			onPress: canCall && !isCancelled ? onCallClinic : undefined,
			disabled: !canCall || isCancelled,
			accessibilityLabel: HISTORY_DETAILS_COPY.actionLabels.callClinic,
		};

		const slot3 = showTrack
			? {
					key: "directions",
					label: "Directions",
					icon: "navigate-outline",
					activeIcon: "navigate",
					iconType: "ion",
					activeIconType: "ion",
					primary: false,
					onPress: canDirections ? onGetDirections : undefined,
					disabled: !canDirections,
					accessibilityLabel: HISTORY_DETAILS_COPY.actionLabels.directions,
				}
			: {
					key: "revisit",
					label: HISTORY_DETAILS_COPY.actionLabels.bookAgain || "Book again",
					icon: "repeat-outline",
					activeIcon: "repeat",
					iconType: "ion",
					activeIconType: "ion",
					primary: primaryKey === "revisit",
					onPress: canRevisit ? onBookAgain : undefined,
					disabled: !canRevisit,
					accessibilityLabel:
						HISTORY_DETAILS_COPY.actionLabels.bookAgain || "Book again",
				};

		const slot4 = {
			key: "rate",
			label: "Rate",
			icon: "star-outline",
			activeIcon: "star",
			iconType: "ion",
			activeIconType: "ion",
			primary: primaryKey === "rate",
			onPress: canRate ? onRateVisit : undefined,
			disabled: !canRate,
			accessibilityLabel: HISTORY_DETAILS_COPY.actionLabels.rate || "Rate visit",
		};

		return [slot1, slot2, slot3, slot4];
	}, [historyItem, canResume, canRate, canCall, canDirections, canRevisit, onResume, onRateVisit, onCallClinic, onGetDirections, onBookAgain]);

	// Build place stats - request-type-specific per contract.
	// Status is intentionally NOT included here: it lives on the compact hero chip
	// so the stats row carries fresh detail instead of repeating the chip.
	//   Ambulance: ETA/When, Responder, Vehicle,  Reference
	//   Bed:       ETA/When, Bed type,  Bed #,    Reference
	//   Visit:     When,     Specialty, Clinician, Reference
	const placeStats = useMemo(() => {
		if (!historyItem) return [];

		const requestType = historyItem.requestType;
		// ETA stays as the live delta string (e.g. "8 min"); non-live falls back
		// to the human-friendly when label so the row reads "Today, 10:30 AM"
		// instead of a raw "12/05/2024 / 10:30" string.
		const whenOrEta = etaLabel || humanWhenLabel || whenValue;
		const stats = [];

		const pushWhen = (etaLabelText) => {
			if (!whenOrEta) return;
			stats.push({
				key: "when",
				label: etaLabel ? etaLabelText : "When",
				value: whenOrEta,
				icon: etaLabel ? "time-outline" : "calendar-outline",
				iconType: "ion",
			});
		};

		// Slot 3 of the row is the price stat when payment data is available;
		// otherwise it falls back to the request-type-specific detail (vehicle
		// for ambulance, bed# for bed, clinician for clinic visits).
		if (requestType === REQUEST_TYPES.AMBULANCE) {
			pushWhen("ETA");
			if (actorName) {
				stats.push({
					key: "responder",
					label: "Responder",
					value: actorName,
					icon: "person-outline",
					iconType: "ion",
				});
			}
			if (priceStat) {
				stats.push(priceStat);
			} else if (vehicleLabel) {
				stats.push({
					key: "vehicle",
					label: "Vehicle",
					value: vehicleLabel,
					icon: "ambulance",
					iconType: "material",
				});
			}
		} else if (requestType === REQUEST_TYPES.BED) {
			pushWhen("ETA");
			if (bedLabel) {
				stats.push({
					key: "bedType",
					label: "Bed",
					value: bedLabel,
					icon: "bed-outline",
					iconType: "ion",
				});
			}
			if (priceStat) {
				stats.push(priceStat);
			} else {
				const bedNumber = pickText(readRawField(raw, "bedNumber", "bed_number"));
				if (bedNumber) {
					stats.push({
						key: "bedNumber",
						label: "Bed #",
						value: bedNumber,
						icon: "grid-outline",
						iconType: "ion",
					});
				}
			}
		} else {
			pushWhen("When");
			if (specialtyLabel) {
				stats.push({
					key: "specialty",
					label: "Specialty",
					value: specialtyLabel,
					icon: "medkit-outline",
					iconType: "ion",
				});
			}
			if (priceStat) {
				stats.push(priceStat);
			} else if (actorName) {
				stats.push({
					key: "clinician",
					label: clinicianLabel || "Clinician",
					value: actorName,
					icon: "person-outline",
					iconType: "ion",
				});
			}
		}

		// Trailing slot: prefer the lifecycle headline (payment / rating / next
		// visit / room / cancelled). Fall back to the reference id when no
		// headline applies, so the stat row is never short.
		if (headlineStat) {
			stats.push(headlineStat);
		} else if (referenceId) {
			stats.push({
				key: "reference",
				label: "Ref",
				value: referenceId,
				icon: "document-text-outline",
				iconType: "ion",
			});
		}

		return stats;
	}, [
		historyItem,
		etaLabel,
		whenValue,
		humanWhenLabel,
		actorName,
		vehicleLabel,
		bedLabel,
		raw,
		specialtyLabel,
		clinicianLabel,
		referenceId,
		headlineStat,
		priceStat,
	]);

	return {
		recordKey: historyItem?.requestId || historyItem?.id || null,
		theme,
		modalTitle,
		topSlot,
		hero,
		compactDetails,
		journey,
		expandedDetails,
		paymentRows,
		paymentSummary,
		triageRows,
		triageSummary,
		preparation,
		primaryAction,
		actions,
		placeActions,
		placeStats,
		canCancel,
		collapsedAction,
		collapsedDistanceLabel,
	};
}
