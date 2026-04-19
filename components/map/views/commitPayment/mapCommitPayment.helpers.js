import { DispatchService } from "../../../../services/dispatchService";
import { getDestinationCoordinate } from "../../surfaces/hospitals/mapHospitalDetail.helpers";

function toFiniteNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function parseCommitPaymentAmount(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return null;
	const match = value.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)/);
	if (!match) return null;
	return toFiniteNumber(match[1]);
}

export function buildCommitPaymentPickupCoordinate(currentLocation) {
	if (!currentLocation || typeof currentLocation !== "object") return null;

	const directLatitude = toFiniteNumber(
		currentLocation.latitude ?? currentLocation.coords?.latitude,
	);
	const directLongitude = toFiniteNumber(
		currentLocation.longitude ?? currentLocation.coords?.longitude,
	);
	if (directLatitude != null && directLongitude != null) {
		return { latitude: directLatitude, longitude: directLongitude };
	}

	const nestedLatitude = toFiniteNumber(currentLocation.location?.latitude);
	const nestedLongitude = toFiniteNumber(currentLocation.location?.longitude);
	if (nestedLatitude != null && nestedLongitude != null) {
		return { latitude: nestedLatitude, longitude: nestedLongitude };
	}

	return null;
}

export function buildCommitPaymentPickupLabel(currentLocation) {
	const formattedAddress =
		typeof currentLocation?.formattedAddress === "string"
			? currentLocation.formattedAddress.trim()
			: "";
	if (formattedAddress) return formattedAddress;

	const primaryText =
		typeof currentLocation?.primaryText === "string"
			? currentLocation.primaryText.trim()
			: "";
	const secondaryText =
		typeof currentLocation?.secondaryText === "string"
			? currentLocation.secondaryText.trim()
			: "";
	const address =
		typeof currentLocation?.address === "string"
			? currentLocation.address.trim()
			: "";

	return [primaryText, secondaryText].filter(Boolean).join(", ") || address || "My location";
}

export function buildCommitPaymentDistanceKm(hospital, currentLocation) {
	const pickupCoordinate = buildCommitPaymentPickupCoordinate(currentLocation);
	const destinationCoordinate = getDestinationCoordinate(hospital);
	if (!pickupCoordinate || !destinationCoordinate) return 0;

	try {
		return Number(DispatchService.calculateDistance(pickupCoordinate, destinationCoordinate) || 0);
	} catch (error) {
		return 0;
	}
}

export function normalizeCommitPaymentCost(rawCost, transport) {
	if (rawCost && typeof rawCost === "object") {
		const totalCost = toFiniteNumber(
			rawCost.totalCost ?? rawCost.total_cost ?? rawCost.total_amount,
		);
		const feeAmount = toFiniteNumber(rawCost.feeAmount ?? rawCost.fee_amount);
		const breakdown = Array.isArray(rawCost.breakdown)
			? rawCost.breakdown
					.map((item) => {
						const cost = toFiniteNumber(item?.cost);
						if (cost == null) return null;
						return {
							name: item?.name || "Charge",
							type: item?.type || "service",
							cost,
						};
					})
					.filter(Boolean)
			: [];

		if (totalCost != null) {
			return {
				totalCost,
				total_cost: totalCost,
				feeAmount,
				breakdown,
				source: rawCost.source || "service_cost",
			};
		}
	}

	const fallbackAmount =
		parseCommitPaymentAmount(transport?.priceText) ??
		parseCommitPaymentAmount(transport?.price) ??
		null;

	if (fallbackAmount == null) return null;

	return {
		totalCost: fallbackAmount,
		total_cost: fallbackAmount,
		feeAmount: null,
		breakdown: [
			{
				name: transport?.title || transport?.service_name || "Transport",
				type: "service",
				cost: fallbackAmount,
			},
		],
		source: "transport_price_text",
	};
}

export function buildCommitPaymentCtaLabel(totalCost, fallbackLabel) {
	if (!Number.isFinite(totalCost)) return fallbackLabel;
	return `${fallbackLabel} ($${Number(totalCost).toFixed(2)})`;
}

export function buildAmbulanceCommitRequest({
	hospital,
	transport,
	paymentMethod,
	pricingSnapshot,
	currentLocation,
}) {
	return {
		requestId: `AMB-${Math.floor(Math.random() * 900000) + 100000}`,
		hospitalId: hospital?.id || null,
		hospitalName:
			hospital?.name || hospital?.title || hospital?.service_name || "Hospital",
		ambulanceType:
			transport?.service_type || transport?.serviceType || transport?.tierKey || null,
		serviceType: "ambulance",
		specialty: null,
		paymentMethod,
		pricingSnapshot,
		patientLocation: buildCommitPaymentPickupCoordinate(currentLocation),
		locationLabel: buildCommitPaymentPickupLabel(currentLocation),
		locationConfirmedAt: new Date().toISOString(),
	};
}

export function buildCommitPaymentCompletionPayload({
	initiatedRequest,
	result,
	hospital,
}) {
	return {
		success: true,
		requestId: result?.requestId || initiatedRequest?._realId || initiatedRequest?.requestId,
		displayId:
			result?.displayId || initiatedRequest?._displayId || initiatedRequest?.requestId,
		hospitalId: initiatedRequest?.hospitalId || hospital?.id || null,
		hospitalName:
			initiatedRequest?.hospitalName ||
			hospital?.name ||
			hospital?.title ||
			"Hospital",
		ambulanceType: initiatedRequest?.ambulanceType || null,
		serviceType: "ambulance",
		estimatedArrival: result?.estimatedArrival || hospital?.eta || "8 mins",
		etaSeconds: Number.isFinite(result?.etaSeconds) ? result.etaSeconds : null,
		triageCheckin: initiatedRequest?.triageCheckin ?? null,
	};
}

export function buildPendingApprovalState({
	initiatedRequest,
	result,
	hospital,
}) {
	return {
		id: result?.requestId || initiatedRequest?._realId || initiatedRequest?.requestId,
		requestId: result?.requestId || initiatedRequest?._realId || initiatedRequest?.requestId,
		displayId:
			result?.displayId || initiatedRequest?._displayId || initiatedRequest?.requestId,
		paymentId: result?.paymentId || null,
		demoAutoApprove: result?.demoAutoApproveEligible === true,
		hospitalId: initiatedRequest?.hospitalId || hospital?.id || null,
		hospitalName:
			initiatedRequest?.hospitalName ||
			hospital?.name ||
			hospital?.title ||
			"Hospital",
		serviceType: "ambulance",
		ambulanceType: initiatedRequest?.ambulanceType || null,
		specialty: initiatedRequest?.specialty || null,
		estimatedArrival: result?.estimatedArrival ?? hospital?.eta ?? null,
		etaSeconds: Number.isFinite(result?.etaSeconds) ? result.etaSeconds : null,
		initiatedData: initiatedRequest,
	};
}
