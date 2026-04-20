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

export function normalizeCommitPaymentCost(
	rawCost,
	selection,
	fallbackSelectionName = "Selected service",
) {
	if (rawCost && typeof rawCost === "object") {
		const totalCost = toFiniteNumber(
			rawCost.totalCost ?? rawCost.total_cost ?? rawCost.total_amount,
		);
		const feeAmount = toFiniteNumber(rawCost.feeAmount ?? rawCost.fee_amount);
		const grossTotal = toFiniteNumber(rawCost.grossTotal);
		const subtotal = toFiniteNumber(rawCost.subtotal);
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
				fee_amount: feeAmount,
				service_fee: feeAmount,
				breakdown,
				grossTotal: grossTotal ?? totalCost,
				subtotal: subtotal ?? (feeAmount != null ? Math.max(0, totalCost - feeAmount) : totalCost),
				orgFee: rawCost.orgFee || null,
				source: rawCost.source || "service_cost",
			};
		}
	}

	const fallbackAmount =
		parseCommitPaymentAmount(selection?.priceText) ??
		parseCommitPaymentAmount(selection?.price) ??
		null;

	if (fallbackAmount == null) return null;

	return {
		totalCost: fallbackAmount,
		total_cost: fallbackAmount,
		feeAmount: null,
		fee_amount: null,
		service_fee: null,
		breakdown: [
			{
				name:
					selection?.title ||
					selection?.service_name ||
					selection?.room_type ||
					fallbackSelectionName,
				type: "service",
				cost: fallbackAmount,
			},
		],
		grossTotal: fallbackAmount,
		subtotal: fallbackAmount,
		orgFee: null,
		source: "selection_price_text",
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
	triageCheckin,
	triageSnapshot,
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
		triageCheckin: triageCheckin || null,
		triageSnapshot: triageSnapshot || null,
	};
}

export function buildBedCommitRequest({
	hospital,
	room,
	paymentMethod,
	pricingSnapshot,
	currentLocation,
	triageCheckin,
	triageSnapshot,
}) {
	return {
		requestId: `BED-${Math.floor(Math.random() * 900000) + 100000}`,
		hospitalId: hospital?.id || null,
		hospitalName:
			hospital?.name || hospital?.title || hospital?.service_name || "Hospital",
		serviceType: "bed",
		specialty: null,
		paymentMethod,
		pricingSnapshot,
		bedType: room?.room_type || room?.title || null,
		bedNumber: room?.id || null,
		bedCount: 1,
		patientLocation: buildCommitPaymentPickupCoordinate(currentLocation),
		locationLabel: buildCommitPaymentPickupLabel(currentLocation),
		locationConfirmedAt: new Date().toISOString(),
		triageCheckin: triageCheckin || null,
		triageSnapshot: triageSnapshot || null,
	};
}

export function buildCommitPaymentCompletionPayload({
	initiatedRequest,
	result,
	hospital,
}) {
	const serviceType = initiatedRequest?.serviceType || "ambulance";
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
		bedType: initiatedRequest?.bedType || null,
		bedNumber: initiatedRequest?.bedNumber || null,
		serviceType,
		estimatedArrival: result?.estimatedArrival || hospital?.eta || "8 mins",
		etaSeconds: Number.isFinite(result?.etaSeconds) ? result.etaSeconds : null,
		hospitalCoordinate: getDestinationCoordinate(hospital),
		patientLocation: initiatedRequest?.patientLocation || null,
		triageCheckin: initiatedRequest?.triageCheckin ?? null,
		triageSnapshot:
			initiatedRequest?.triageSnapshot ??
			(initiatedRequest?.triageCheckin
				? { signals: { userCheckin: initiatedRequest.triageCheckin } }
				: null),
	};
}

export function buildPendingApprovalState({
	initiatedRequest,
	result,
	hospital,
}) {
	const serviceType = initiatedRequest?.serviceType || "ambulance";
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
		serviceType,
		ambulanceType: initiatedRequest?.ambulanceType || null,
		bedType: initiatedRequest?.bedType || null,
		bedNumber: initiatedRequest?.bedNumber || null,
		specialty: initiatedRequest?.specialty || null,
		estimatedArrival: result?.estimatedArrival ?? hospital?.eta ?? null,
		etaSeconds: Number.isFinite(result?.etaSeconds) ? result.etaSeconds : null,
		initiatedData: initiatedRequest,
		triageSnapshot:
			initiatedRequest?.triageSnapshot ??
			(initiatedRequest?.triageCheckin
				? { signals: { userCheckin: initiatedRequest.triageCheckin } }
				: null),
	};
}
