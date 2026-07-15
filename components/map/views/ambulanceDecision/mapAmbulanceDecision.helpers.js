import { getAmbulanceVisualProfile } from "../../../emergency/requestModal/ambulanceTierVisuals";
import {
	buildAmbulanceServiceCards,
	buildHospitalDetailSummary,
	formatDistanceMeters,
	formatDurationSeconds,
	normalizeTimeLabel,
} from "../../surfaces/hospitals/mapHospitalDetail.helpers";
import { MAP_AMBULANCE_DECISION_COPY } from "./mapAmbulanceDecision.content";

function extractCrewCountLabel(value) {
	const match = String(value || "").match(/(\d+)\s*(?:-?\s*person|paramedic|crew)/i);
	if (!match) return null;
	const count = Number(match[1]);
	if (!Number.isFinite(count) || count <= 0) return null;
	return `${count} crew`;
}

function buildCrewPillLabel(recommendedService, visualProfile) {
	const explicitCrewLabel = extractCrewCountLabel(recommendedService?.crew);
	if (explicitCrewLabel) return explicitCrewLabel;

	const tierKey = visualProfile?.key || "";
	if (tierKey === "basic") return "2 crew";
	if (tierKey === "advanced") return "2+ crew";
	if (tierKey === "critical") return "2+ crew";
	return "Crew ready";
}

function getEnabledServiceOptions(
	hospital,
	pricingRows,
	isLoadingServices,
	quotedPriceMap,
	serverQuoteMap,
) {
	return buildAmbulanceServiceCards(
		hospital,
		pricingRows,
		isLoadingServices,
		quotedPriceMap,
		serverQuoteMap,
	).filter(
		(entry) => !entry?.isSkeleton && entry?.enabled !== false,
	);
}

function getVisibleServiceOptions(
	hospital,
	pricingRows,
	isLoadingServices,
	quotedPriceMap,
	serverQuoteMap,
) {
	return buildAmbulanceServiceCards(
		hospital,
		pricingRows,
		isLoadingServices,
		quotedPriceMap,
		serverQuoteMap,
	).filter(
		(entry) => !entry?.isSkeleton,
	);
}

function buildFallbackService() {
	return {
		id: "ambulance-basic-fallback",
		title: "Everyday care",
		service_name: "Standard ambulance",
		service_type: "ambulance_basic",
		description: null,
		metaText: "Ready",
		priceText: null,
		source: "fallback",
	};
}

export function getRecommendedAmbulanceService({
	hospital,
	pricingRows = [],
	selectedServiceId = null,
	isLoadingServices = false,
	quotedPriceMap = {},
	serverQuoteMap = {},
}) {
	const serviceOptions = getVisibleServiceOptions(
		hospital,
		pricingRows,
		isLoadingServices,
		quotedPriceMap,
		serverQuoteMap,
	);
	const enabledServiceOptions = serviceOptions.filter(
		(entry) => entry?.enabled !== false,
	);
	const selectedService = selectedServiceId
		? enabledServiceOptions.find(
				(entry) =>
					entry?.id === selectedServiceId ||
					entry?.service_name === selectedServiceId ||
					entry?.title === selectedServiceId,
			)
		: null;
	const recommendedService =
		selectedService || enabledServiceOptions[0] || buildFallbackService();

	return {
		serviceOptions,
		enabledServiceOptions,
		recommendedService,
	};
}

export function getAmbulanceDecisionEtaLabel({
	hospital,
	routeInfo,
	isCalculatingRoute = false,
}) {
	if (isCalculatingRoute) {
		return MAP_AMBULANCE_DECISION_COPY.ROUTE_PENDING;
	}

	return (
		normalizeTimeLabel(hospital?.eta) ||
		formatDurationSeconds(routeInfo?.durationSec) ||
		MAP_AMBULANCE_DECISION_COPY.ETA_FALLBACK
	);
}

export function getAmbulanceDecisionDistanceLabel(hospital, routeInfo) {
	const hospitalDistance =
		typeof hospital?.distance === "string" ? hospital.distance.trim() : "";
	return (
		formatDistanceMeters(routeInfo?.distanceMeters) ||
		(hospitalDistance && hospitalDistance !== "--" ? hospitalDistance : null) ||
		null
	);
}

function getAmbulanceDecisionRouteDistanceKm(routeInfo) {
	const distanceMeters = Number(routeInfo?.distanceMeters);
	if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;
	return Math.round(distanceMeters) / 1000;
}

export function buildAmbulanceDecisionFeatures({
	hospital,
	recommendedService,
	visualProfile,
}) {
	const serviceDescription =
		typeof recommendedService?.description === "string" &&
		recommendedService.description.trim().length > 0
			? recommendedService.description.trim()
			: null;
	const supportFeatures = Array.isArray(visualProfile?.features)
		? visualProfile.features
		: [];
	const hospitalType = buildHospitalDetailSummary(hospital, null)?.typeLabel || null;

	return [
		serviceDescription,
		...supportFeatures,
		hospitalType ? `${hospitalType} destination ready to receive` : null,
	]
		.filter(Boolean)
		.slice(0, 2);
}

function buildAmbulanceDecisionRoutePanel({
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
						: MAP_AMBULANCE_DECISION_COPY.ROUTE_DESTINATION_SUBTITLE);

	return {
		originTitle: hospitalSummary?.title || "Hospital",
		originSubtitle:
			hospitalSummary?.addressLine ||
			hospitalSummary?.contextLine ||
			MAP_AMBULANCE_DECISION_COPY.ROUTE_SOURCE_FALLBACK,
		destinationTitle: MAP_AMBULANCE_DECISION_COPY.ROUTE_DESTINATION_TITLE,
		destinationSubtitle: originAddress,
		primaryMetric: etaLabel || MAP_AMBULANCE_DECISION_COPY.ETA_FALLBACK,
		secondaryMetric: distanceLabel || null,
	};
}

export function buildAmbulanceDecisionModel({
	hospital,
	pricingRows = [],
	routeInfo = null,
	origin = null,
	selectedServiceId = null,
	isLoadingServices = false,
	isCalculatingRoute = false,
	// PULLBACK NOTE: quotedPriceMap provides country-based quoted prices for service options
	quotedPriceMap = {},
	serverQuoteMap = {},
}) {
	if (!hospital) {
		return {
			hospital: null,
			hospitalSummary: null,
			serviceOptions: [],
			enabledServiceOptions: [],
			recommendedService: null,
			canConfirm: false,
			visualProfile: getAmbulanceVisualProfile(),
			etaLabel: MAP_AMBULANCE_DECISION_COPY.ETA_FALLBACK,
			distanceLabel: null,
			crewPillLabel: "Crew ready",
			priceLabel: MAP_AMBULANCE_DECISION_COPY.PRICE_FALLBACK,
			priceShowsSkeleton: false,
			confidenceLabel: MAP_AMBULANCE_DECISION_COPY.CONFIDENCE_FALLBACK,
			serviceTitle: "Standard ambulance",
			serviceSummary: MAP_AMBULANCE_DECISION_COPY.SUMMARY,
			features: [],
			routePanel: {
				originTitle: "Hospital",
				originSubtitle: MAP_AMBULANCE_DECISION_COPY.ROUTE_SOURCE_FALLBACK,
				destinationTitle: MAP_AMBULANCE_DECISION_COPY.ROUTE_DESTINATION_TITLE,
				destinationSubtitle:
					MAP_AMBULANCE_DECISION_COPY.ROUTE_DESTINATION_SUBTITLE,
				primaryMetric: MAP_AMBULANCE_DECISION_COPY.ETA_FALLBACK,
				secondaryMetric: null,
			},
		};
	}

	const { serviceOptions, enabledServiceOptions, recommendedService } =
		getRecommendedAmbulanceService({
			hospital,
			pricingRows,
			selectedServiceId,
			isLoadingServices,
			quotedPriceMap,
			serverQuoteMap,
		});
	const routeDistanceKm = getAmbulanceDecisionRouteDistanceKm(routeInfo);

	// PULLBACK NOTE: Inject quoted prices into service options for country-based currency display
	// Preserve canonical amounts underneath, only override display label
	const serviceOptionsWithQuotes = serviceOptions.map((option) => {
		const quotedPrice =
			quotedPriceMap?.[option?.tierKey] || quotedPriceMap?.[option?.id];
		if (!quotedPrice?.label) {
			return {
				...option,
				routeDistanceKm,
			};
		}
		return {
			...option,
			routeDistanceKm,
			// Override priceText with quoted display label
			priceText: quotedPrice.label,
			// Preserve canonical info for reference
			canonicalPriceText: option.priceText,
			quotedPrice,
		};
	});

	const recommendedServiceWithQuote =
		serviceOptionsWithQuotes.find((opt) => opt.id === recommendedService?.id) ||
		(recommendedService
			? {
					...recommendedService,
					routeDistanceKm,
				}
			: null);
	const quoteContinuityReady = Boolean(
		recommendedServiceWithQuote?.serverQuoteReady === true &&
			routeDistanceKm != null,
	);

	const visualProfile = getAmbulanceVisualProfile(recommendedServiceWithQuote);
	const hospitalSummary = buildHospitalDetailSummary(hospital, routeInfo);
	const etaLabel = getAmbulanceDecisionEtaLabel({
		hospital,
		routeInfo,
		isCalculatingRoute,
	});
	const distanceLabel = getAmbulanceDecisionDistanceLabel(hospital, routeInfo);
	// PULLBACK NOTE: Use quoted price label if available, fall back to canonical price
	const priceLabel =
		(quoteContinuityReady ||
		recommendedServiceWithQuote?.priceText === "Price unavailable"
			? recommendedServiceWithQuote?.priceText
			: null) ||
		MAP_AMBULANCE_DECISION_COPY.PRICE_FALLBACK;
	const features = buildAmbulanceDecisionFeatures({
		hospital,
		recommendedService,
		visualProfile,
	});

	return {
		hospital,
		hospitalSummary,
		// PULLBACK NOTE: Return quoted service options for country-based currency display
		serviceOptions: serviceOptionsWithQuotes,
		enabledServiceOptions: serviceOptionsWithQuotes.filter((opt) => opt?.enabled !== false),
		recommendedService: recommendedServiceWithQuote,
		canConfirm: Boolean(
			enabledServiceOptions.length > 0 &&
				recommendedServiceWithQuote?.id &&
				quoteContinuityReady,
		),
		visualProfile,
		etaLabel,
		distanceLabel,
		crewPillLabel: buildCrewPillLabel(recommendedServiceWithQuote, visualProfile),
		priceLabel,
		// PULLBACK NOTE: UX-A — priceShowsSkeleton: true when loading services and no real priceText yet
		// OLD: no skeleton guard — PRICE_FALLBACK string always shown in pill
		// NEW: skeleton shown while loading; pill hidden entirely when not loading and no real price
		priceShowsSkeleton: Boolean(
			!quoteContinuityReady &&
				(isCalculatingRoute ||
					isLoadingServices ||
					recommendedServiceWithQuote?.showPriceSkeleton === true),
		),
		confidenceLabel:
			recommendedService?.source === "db"
				? MAP_AMBULANCE_DECISION_COPY.CONFIDENCE_LIVE
				: MAP_AMBULANCE_DECISION_COPY.CONFIDENCE_FALLBACK,
		serviceTitle:
			recommendedService?.title ||
			visualProfile?.shortLabel ||
			recommendedService?.service_name ||
			visualProfile?.label ||
			"Everyday care",
		serviceSummary:
			(typeof recommendedService?.description === "string" &&
				recommendedService.description.trim().length > 0 &&
				recommendedService.description.trim()) ||
			visualProfile?.marketingLine ||
			MAP_AMBULANCE_DECISION_COPY.SUMMARY,
		features,
		routePanel: buildAmbulanceDecisionRoutePanel({
			hospitalSummary,
			etaLabel,
			distanceLabel,
			origin,
		}),
	};
}
