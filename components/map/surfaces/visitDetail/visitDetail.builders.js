// components/map/surfaces/visitDetail/visitDetail.builders.js
//
// PULLBACK NOTE: VD-D (VD-8) — extracted from useMapVisitDetailModel.js.
// Domain builders: pure functions that compose helpers into visit detail data structures.

import { HISTORY_DETAILS_COPY } from "../../history/history.content";
import {
	resolveHistoryServiceLabel,
	resolveTypeValue,
	resolveFacilityLine,
} from "../../history/history.presentation";
import {
	REQUEST_TYPES,
	toText,
	toFiniteNumber,
	toTitleCase,
	toCurrencyLabel,
	pickText,
	joinParts,
	withoutDuplicates,
	readRawField,
	resolveJourneyProgress,
	filterMeaningfulRows,
} from "./visitDetail.helpers";

export const resolveVehicleLabel = (_historyItem, raw) => {
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

export const resolveBedLabel = (raw) => {
	return resolveHistoryServiceLabel({
		requestType: REQUEST_TYPES.BED,
		value: readRawField(raw, "bedType", "bed_type"),
		fallbackLabel: null,
	});
};

// PULLBACK NOTE: Fix collapsed action to always show primary CTA (never null)
// OLD: Return null if no action available (hides left button)
// NEW: Always return directions as fallback (matches mid-snap behavior)
export const buildVisitCollapsedAction = ({
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

	void isCancelled; // unused branch preserved for future use

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

export const buildVisitCollapsedDistanceLabel = ({ whenValue, status }) => {
	if (status === "active") return "Active now";
	if (status === "pending") return "Pending";
	if (status === "confirmed") return "Upcoming";
	if (whenValue) return whenValue;
	return "Visit";
};

export const resolvePaymentMethodLabel = (raw) => {
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

export const resolvePaymentTotalLabel = (historyItem, raw) => {
	const resolvedCurrency =
		readRawField(raw, "currency", "payment_currency", "paymentCurrency") ||
		historyItem?.visit?.currency ||
		"USD";
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
		return toCurrencyLabel(positiveCandidate, resolvedCurrency);
	}

	const textCandidate = numericCandidates.find((value) => {
		const text = toText(value).replace(/,/g, "");
		if (!text) return false;
		return !/^\$?0(?:\.0+)?$/.test(text);
	});
	if (textCandidate != null) {
		return toCurrencyLabel(textCandidate, resolvedCurrency);
	}

	const hasLinkedPayment =
		Boolean(historyItem?.paymentId) ||
		Boolean(readRawField(raw, "paymentStatus", "payment_status"));
	if (hasLinkedPayment) return null;

	const hasZeroCandidate = numericCandidates.some((value) => toFiniteNumber(value) === 0);
	return hasZeroCandidate ? toCurrencyLabel(0, resolvedCurrency) : null;
};

export const buildJourney = (historyItem, raw, whenValue) => {
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

export const buildTriageRows = (raw) => {
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

export { filterMeaningfulRows };
