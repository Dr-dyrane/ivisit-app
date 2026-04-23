import { useMemo } from "react";
import { useTheme } from "../../../../contexts/ThemeContext";
import buildHistoryThemeTokens from "../../history/history.theme";
import { HISTORY_DETAILS_COPY } from "../../history/history.content";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import {
	resolveClinicianLabel,
	resolveDetailsPrimaryAction,
	resolveFacilityLine,
	resolveHistoryDetailsTitle,
	resolveHistoryRequestIcon,
	resolveHistoryServiceLabel,
	resolveRatingLabel,
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

const resolveMediaSource = (...values) => {
	for (const value of values) {
		if (typeof value === "number") return value;
		if (value && typeof value === "object" && value.uri) return value;
		const text = toText(value);
		if (text) return { uri: text };
	}
	return null;
};

const readRawField = (raw, ...keys) => {
	for (const key of keys) {
		if (raw && raw[key] != null) return raw[key];
	}
	return null;
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
	rows.filter((row) => row && row.value != null && String(row.value).trim());

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

		const badgeCandidates = uniqueTextList([
			historyItem.requestType === REQUEST_TYPES.VISIT
				? historyItem.roomNumber
				: historyItem.requestType === REQUEST_TYPES.BED
					? pickText(readRawField(raw, "bedNumber", "bed_number"))
					: pickText(
							readRawField(raw, "responderVehiclePlate", "responder_vehicle_plate"),
							readRawField(raw, "ambulanceId", "ambulance_id"),
						),
		]);

		const heroHospital = {
			name: facilityName,
			image: historyItem.heroImageUrl || readRawField(raw, "hospitalImage", "hospital_image"),
			imageUri: historyItem.heroImageUrl || readRawField(raw, "hospitalImage", "hospital_image"),
			googlePhotos: [],
			google_photos: [],
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
			badges: badgeCandidates.slice(0, 3),
		};
	}, [
		actorName,
		bedLabel,
		clinicianLabel,
		facilityLine,
		historyItem,
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
		const ratingLabel = resolveRatingLabel(historyItem?.existingRating);
		const ratingValue = toFiniteNumber(historyItem?.existingRating);
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
				label: HISTORY_DETAILS_COPY.detailLabels.rating,
				value: ratingLabel,
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

	const paymentRows = useMemo(() => {
		if (!historyItem) return [];
		const totalLabel = resolvePaymentTotalLabel(historyItem, raw);
		const paymentStatus = toTitleCase(
			readRawField(raw, "paymentStatus", "payment_status"),
		);
		const paymentMethod = resolvePaymentMethodLabel(raw);
		return filterMeaningfulRows([
			{
				key: "payment",
				label:
					totalLabel && paymentStatus
						? HISTORY_DETAILS_COPY.detailLabels.total
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
	}, [historyItem, raw]);

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
		canCancel,
	};
}
