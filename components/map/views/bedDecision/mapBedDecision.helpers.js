import {
	buildHospitalDetailSummary,
	buildRoomServiceCards,
	formatDistanceMeters,
	formatDurationSeconds,
	normalizeTimeLabel,
} from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { buildServiceCopy } from "../serviceDetail/mapServiceDetail.content";
import { MAP_BED_DECISION_COPY } from "./mapBedDecision.content";

function formatPriceLabel(value, fallback = null) {
	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return fallback;
	}

	return `$${Math.round(numeric).toLocaleString()}`;
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
		priceText: formatPriceLabel(hospital?.basePrice ?? hospital?.base_price, null),
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
	const roomCopy = buildServiceCopy(recommendedRoom, "room");
	const roomSummary = roomCopy?.summary || null;
	const roomFeatures = buildRoomFeatures(recommendedRoom);
	const hospitalSummary = buildHospitalDetailSummary(hospital, routeInfo);
	const etaLabel = getBedDecisionEtaLabel({
		hospital,
		routeInfo,
		isCalculatingRoute,
	});
	const distanceLabel = getBedDecisionDistanceLabel(hospital, routeInfo);
	const availabilityLabel = recommendedRoom?.metaText || null;
	const priceLabel =
		recommendedRoom?.priceText ||
		formatPriceLabel(recommendedRoom?.price ?? recommendedRoom?.base_price, null);

	return {
		hospital,
		careIntent,
		hospitalSummary,
		roomOptions,
		enabledRoomOptions,
		recommendedRoom,
		canConfirm: Boolean(enabledRoomOptions.length > 0 && recommendedRoom?.id),
		availabilityLabel,
		priceLabel,
		availabilityShowsSkeleton: Boolean(
			recommendedRoom?.showMetaSkeleton && !availabilityLabel,
		),
		priceShowsSkeleton: Boolean(recommendedRoom?.showPriceSkeleton && !priceLabel),
		roomTitle: recommendedRoom?.title || "General ward",
		roomSummary,
		roomFeatures,
		etaLabel,
		distanceLabel,
		confidenceLabel:
			recommendedRoom?.source === "db"
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
