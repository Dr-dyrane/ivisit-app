import {
	buildHospitalDetailSummary,
	buildRoomServiceCards,
	formatDistanceMeters,
	formatDurationSeconds,
	normalizeTimeLabel,
} from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildServiceCopy } from "../serviceDetail/mapServiceDetail.content";
import { MAP_BED_DECISION_COPY } from "./mapBedDecision.content";
import { formatMoney, resolveMoneyCurrency } from "../../../../utils/formatMoney";

function formatPriceLabel(value, fallback = null, currency = "USD") {
	return formatMoney(value, {
		currency: resolveMoneyCurrency(currency),
		fallback,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}

function getVisibleRoomOptions(hospital, roomRows, isLoadingRooms) {
	return buildRoomServiceCards(hospital, roomRows, isLoadingRooms).filter(
		(entry) => !entry?.isSkeleton,
	);
}

function buildFallbackRoomService(hospital) {
	const available = Number(hospital?.availableBeds ?? hospital?.available_beds ?? 0);

	return {
		id: "standard-room-fallback",
		title: "General ward",
		room_type: "standard",
		metaText: Number.isFinite(available) && available > 0 ? `${available} open` : null,
		priceText: formatPriceLabel(
			hospital?.basePrice ?? hospital?.base_price,
			null,
			hospital?.currency,
		),
		source: "fallback",
	};
}

function getRecommendedRoomService({
	hospital,
	roomRows = [],
	selectedRoomServiceId = null,
	isLoadingRooms = false,
}) {
	const roomOptions = getVisibleRoomOptions(hospital, roomRows, isLoadingRooms);
	const enabledRoomOptions = roomOptions.filter((entry) => entry?.enabled !== false);
	const selectedRoom = selectedRoomServiceId
		? enabledRoomOptions.find(
				(entry) =>
					entry?.id === selectedRoomServiceId ||
					entry?.room_type === selectedRoomServiceId ||
					entry?.title === selectedRoomServiceId,
			)
		: null;
	const recommendedRoom =
		selectedRoom || enabledRoomOptions[0] || buildFallbackRoomService(hospital);

	return {
		roomOptions,
		enabledRoomOptions,
		recommendedRoom,
	};
}

function getBedDecisionEtaLabel({
	hospital,
	routeInfo,
	isCalculatingRoute = false,
}) {
	if (isCalculatingRoute) {
		return MAP_BED_DECISION_COPY.ROUTE_PENDING;
	}

	return (
		normalizeTimeLabel(hospital?.eta) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		MAP_BED_DECISION_COPY.ETA_FALLBACK
	);
}

function getBedDecisionDistanceLabel(hospital, routeInfo) {
	const hospitalDistance =
		typeof hospital?.distance === "string" ? hospital.distance.trim() : "";

	return (
		(hospitalDistance && hospitalDistance !== "--" ? hospitalDistance : null) ||
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		null
	);
}

function buildBedDecisionRoutePanel({
	hospitalSummary,
	etaLabel,
	distanceLabel,
	origin = null,
}) {
	const primaryText =
		typeof origin?.primaryText === "string" ? origin.primaryText.trim() : "";
	const secondaryText =
		typeof origin?.secondaryText === "string" ? origin.secondaryText.trim() : "";
	const formattedAddress =
		typeof origin?.formattedAddress === "string" ? origin.formattedAddress.trim() : "";
	const originAddress =
		formattedAddress && !/^current location$/i.test(formattedAddress)
			? formattedAddress
			: primaryText && secondaryText && !/^current location$/i.test(primaryText)
				? `${primaryText}, ${secondaryText}`
				: secondaryText ||
					(primaryText && !/^current location$/i.test(primaryText) ? primaryText : "") ||
					(typeof origin?.address === "string" && origin.address.trim()
						? origin.address.trim()
						: MAP_BED_DECISION_COPY.ROUTE_DESTINATION_SUBTITLE);

	return {
		originTitle: hospitalSummary?.title || "Hospital",
		originSubtitle:
			hospitalSummary?.addressLine ||
			hospitalSummary?.contextLine ||
			MAP_BED_DECISION_COPY.ROUTE_SOURCE_FALLBACK,
		destinationTitle: MAP_BED_DECISION_COPY.ROUTE_DESTINATION_TITLE,
		destinationSubtitle: originAddress,
		primaryMetric: etaLabel || MAP_BED_DECISION_COPY.ETA_FALLBACK,
		secondaryMetric: distanceLabel || null,
	};
}

function buildRoomFeatures(recommendedRoom) {
	const copy = buildServiceCopy(recommendedRoom, "room");
	return Array.isArray(copy?.features) ? copy.features.slice(0, 3) : [];
}

export function buildBedDecisionModel({
	hospital,
	roomRows = [],
	routeInfo = null,
	origin = null,
	careIntent = "bed",
	selectedRoomServiceId = null,
	isLoadingRooms = false,
	isCalculatingRoute = false,
	// PULLBACK NOTE: quotedPriceMap provides country-based quoted prices for room options
	quotedPriceMap = {},
}) {
	if (!hospital) {
		return {
			hospital: null,
			careIntent,
			hospitalSummary: null,
			roomOptions: [],
			enabledRoomOptions: [],
			recommendedRoom: null,
			canConfirm: false,
			availabilityLabel: null,
			priceLabel: null,
			availabilityShowsSkeleton: false,
			priceShowsSkeleton: false,
			roomTitle: "General ward",
			roomSummary: null,
			roomFeatures: [],
			etaLabel: MAP_BED_DECISION_COPY.ETA_FALLBACK,
			distanceLabel: null,
			confidenceLabel: MAP_BED_DECISION_COPY.CONFIDENCE_FALLBACK,
			routePanel: {
				originTitle: "Hospital",
				originSubtitle: MAP_BED_DECISION_COPY.ROUTE_SOURCE_FALLBACK,
				destinationTitle: MAP_BED_DECISION_COPY.ROUTE_DESTINATION_TITLE,
				destinationSubtitle: MAP_BED_DECISION_COPY.ROUTE_DESTINATION_SUBTITLE,
				primaryMetric: MAP_BED_DECISION_COPY.ETA_FALLBACK,
				secondaryMetric: null,
			},
		};
	}

	const { roomOptions, enabledRoomOptions, recommendedRoom } = getRecommendedRoomService({
		hospital,
		roomRows,
		selectedRoomServiceId,
		isLoadingRooms,
	});

	// PULLBACK NOTE: Inject quoted prices into room options for country-based currency display
	// Preserve canonical amounts underneath, only override display label
	const roomOptionsWithQuotes = roomOptions.map((option) => {
		const quotedPrice = quotedPriceMap?.[option?.id];
		if (!quotedPrice?.label) return option;
		return {
			...option,
			// Override priceText with quoted display label
			priceText: quotedPrice.label,
			// Preserve canonical info for reference
			canonicalPriceText: option.priceText,
			quotedPrice,
		};
	});

	const recommendedRoomWithQuote =
		roomOptionsWithQuotes.find((opt) => opt.id === recommendedRoom?.id) ||
		recommendedRoom;

	const roomCopy = buildServiceCopy(recommendedRoomWithQuote, "room");
	const roomSummary = roomCopy?.summary || null;
	const roomFeatures = buildRoomFeatures(recommendedRoom);
	const hospitalSummary = buildHospitalDetailSummary(hospital, routeInfo);
	const etaLabel = getBedDecisionEtaLabel({
		hospital,
		routeInfo,
		isCalculatingRoute,
	});
	const distanceLabel = getBedDecisionDistanceLabel(hospital, routeInfo);
	const availabilityLabel = recommendedRoomWithQuote?.metaText || null;
	// PULLBACK NOTE: Use quoted price label if available, fall back to canonical price
	const priceLabel =
		recommendedRoomWithQuote?.priceText ||
		formatPriceLabel(
			recommendedRoomWithQuote?.price ?? recommendedRoomWithQuote?.base_price,
			null,
			resolveMoneyCurrency(recommendedRoomWithQuote?.currency, hospital?.currency),
		);

	return {
		hospital,
		careIntent,
		hospitalSummary,
		// PULLBACK NOTE: Return quoted room options for country-based currency display
		roomOptions: roomOptionsWithQuotes,
		enabledRoomOptions: roomOptionsWithQuotes.filter((opt) => opt?.enabled !== false),
		recommendedRoom: recommendedRoomWithQuote,
		canConfirm: Boolean(enabledRoomOptions.length > 0 && recommendedRoomWithQuote?.id),
		availabilityLabel,
		priceLabel,
		availabilityShowsSkeleton: Boolean(
			recommendedRoomWithQuote?.showMetaSkeleton && !availabilityLabel,
		),
		priceShowsSkeleton: Boolean(recommendedRoomWithQuote?.showPriceSkeleton && !priceLabel),
		roomTitle: recommendedRoomWithQuote?.title || "General ward",
		roomSummary,
		roomFeatures,
		etaLabel,
		distanceLabel,
		confidenceLabel:
			recommendedRoomWithQuote?.source === "db"
				? MAP_BED_DECISION_COPY.CONFIDENCE_LIVE
				: MAP_BED_DECISION_COPY.CONFIDENCE_FALLBACK,
		routePanel: buildBedDecisionRoutePanel({
			hospitalSummary,
			etaLabel,
			distanceLabel,
			origin,
		}),
	};
}

export default buildBedDecisionModel;
