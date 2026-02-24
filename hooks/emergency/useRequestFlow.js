import { useCallback, useRef, useMemo, useEffect } from "react";
import * as Location from "expo-location";
import {
	EMERGENCY_VISIT_LIFECYCLE,
	VISIT_STATUS,
	VISIT_TYPES,
} from "../../constants/visits";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { useHospitals } from "./useHospitals";
import { DispatchService } from "../../services/dispatchService";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";
import { usePaymentFlow } from "./usePaymentFlow";
import { serviceCostService } from "../../services/serviceCostService";
import { notificationDispatcher } from "../../services/notificationDispatcher";

const toFiniteNumber = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

const normalizeRequestCostSnapshot = (raw) => {
	if (!raw || typeof raw !== "object") return null;

	const baseCost = toFiniteNumber(raw.base_cost ?? raw.baseCost);
	const grossTotal = toFiniteNumber(raw.total_cost ?? raw.totalCost ?? raw.total_amount);

	let feeAmount = toFiniteNumber(
		raw.feeAmount ?? raw.fee_amount ?? raw.service_fee ?? raw.ivisit_fee_amount
	);

	if (feeAmount == null && Array.isArray(raw.breakdown)) {
		const breakdownFee = raw.breakdown.reduce((sum, item) => {
			const type = String(item?.type || "").toLowerCase();
			const name = String(item?.name || "").toLowerCase();
			const looksLikeFee = type === "fee" || name.includes("fee");
			if (!looksLikeFee) return sum;
			const itemCost = Number(item?.cost);
			return Number.isFinite(itemCost) ? sum + itemCost : sum;
		}, 0);
		if (breakdownFee > 0) {
			feeAmount = Number(breakdownFee.toFixed(2));
		}
	}

	const totalBeforeFee = (() => {
		if (grossTotal != null && feeAmount != null) {
			return Number(Math.max(0, grossTotal - feeAmount).toFixed(2));
		}
		if (grossTotal != null) return grossTotal;
		if (baseCost != null) return baseCost;
		return null;
	})();

	if (baseCost == null && totalBeforeFee == null) return null;

	return {
		base_cost: baseCost ?? totalBeforeFee,
		distance_surcharge: toFiniteNumber(raw.distance_surcharge),
		urgency_surcharge: toFiniteNumber(raw.urgency_surcharge),
		total_cost: totalBeforeFee ?? baseCost,
		totalCost: totalBeforeFee ?? baseCost,
		breakdown: Array.isArray(raw.breakdown) ? raw.breakdown : undefined,
		feeAmount,
		grossTotal,
		source: "modal_pricing_snapshot",
	};
};

/**
 * 💡 STABILITY NOTE:
 * This hook uses a "Latest Props Ref" pattern (ref-guarded props) to ensure that the returned 
 * action handlers (handleRequestInitiated, handleRequestComplete) are perfectly stable (referentially).
 * 
 * WHY: This prevents infinite re-render loops in components like EmergencyRequestModal that 
 * register effects based on these handlers. Even if the parent passes anonymous functions 
 * as props, this hook won't re-create its internal stability-critical callbacks.
 */
export const useRequestFlow = (props) => {
	const propsRef = useRef(props);
	useEffect(() => {
		propsRef.current = props;
	}, [props]);

	// Initialize payment flow
	const paymentFlow = usePaymentFlow();

	// Extract stable refs for use in callbacks
	const {
		createRequest,
		updateRequest,
		addVisit,
		updateVisit,
		setRequestStatus,
		startAmbulanceTrip,
		startBedBooking,
		clearSelectedHospital,
		hospitals,
		onRequestComplete,
	} = props;

	const inflightByTypeRef = useRef({ ambulance: false, bed: false });

	const blockResult = useCallback((reason, extra) => {
		return { ok: false, reason, ...extra };
	}, []);

	const successResult = useCallback((reason, extra) => {
		return { ok: true, reason, ...extra };
	}, []);

	const getSnapshots = useCallback(() => {
		const { preferences, medicalProfile, emergencyContacts, user } = propsRef.current;
		const shareMedicalProfile = preferences?.privacyShareMedicalProfile === true;
		const shareEmergencyContacts =
			preferences?.privacyShareEmergencyContacts === true;

		const shared = {
			medicalProfile: shareMedicalProfile ? medicalProfile : null,
			emergencyContacts: shareEmergencyContacts ? emergencyContacts : null,
		};

		const patient = {
			fullName: user?.fullName ?? null,
			phone: user?.phone ?? null,
			email: user?.email ?? null,
			username: user?.username ?? null,
		};

		return { patient, shared };
	}, []);

	const canStartRequest = useCallback(
		(serviceType) => {
			const { activeAmbulanceTrip, activeBedBooking } = propsRef.current;
			if (serviceType === "ambulance") return !activeAmbulanceTrip?.requestId;
			if (serviceType === "bed") return !activeBedBooking?.requestId;
			return false;
		},
		[]
	);

	const handleRequestInitiated = useCallback(
		async (request) => {
			const {
				hospitals,
				requestHospitalId,
				selectedHospital,
				createRequest,
				addVisit,
				selectedSpecialty
			} = propsRef.current;

			if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") {
				return blockResult("INVALID_SERVICE_TYPE", { serviceType: request?.serviceType ?? null });
			}

			if (!canStartRequest(request.serviceType)) {
				return blockResult("ALREADY_ACTIVE", { serviceType: request.serviceType });
			}

			if (inflightByTypeRef.current[request.serviceType] === true) {
				return blockResult("IN_FLIGHT", { serviceType: request.serviceType });
			}

			let hospitalId =
				request?.hospitalId ?? requestHospitalId ?? selectedHospital?.id ?? null;

			// 🤖 AUTO-DISPATCH: Select best hospital if none provided
			if (!hospitalId && hospitals && hospitals.length > 0) {
				try {
					// Get user location for dispatch calculation
					const currentLocation = await Location.getCurrentPositionAsync({});
					const userLocation = {
						latitude: currentLocation.coords.latitude,
						longitude: currentLocation.coords.longitude
					};

					const bestHospital = DispatchService.selectBestHospital(hospitals, userLocation);
					if (bestHospital) {
						hospitalId = bestHospital.id;
						console.log('[useRequestFlow] Auto-dispatch selected hospital:', bestHospital.name);
					}
				} catch (locationError) {
					console.warn('[useRequestFlow] Auto-dispatch failed, using fallback:', locationError);
					// Fallback to first available hospital
					hospitalId = hospitals[0]?.id;
				}
			}

			if (!hospitalId) {
				return blockResult("MISSING_HOSPITAL", { serviceType: request.serviceType });
			}

			const now = new Date();
			const nowIso = now.toISOString();
			const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
			const hospital = hospitals?.find((h) => h?.id === hospitalId) ?? null;
			const date = nowIso.slice(0, 10);
			const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
			const { patient, shared } = getSnapshots();

			inflightByTypeRef.current[request.serviceType] = true;
			try {
				let liveUserLocation = null;
				let patientLocation = null;
				try {
					const currentLocation = await Location.getCurrentPositionAsync({});
					liveUserLocation = {
						latitude: currentLocation.coords.latitude,
						longitude: currentLocation.coords.longitude
					};
					patientLocation = `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`;
				} catch (locationError) {
					console.warn('[useRequestFlow] Could not get user location:', locationError);
					// Fallback to Hemet coordinates
					patientLocation = 'POINT(-116.9730 33.7475)';
				}

				const hospitalCoords = hospital?.coordinates && Number.isFinite(hospital.coordinates.latitude) && Number.isFinite(hospital.coordinates.longitude)
					? hospital.coordinates
					: (Number.isFinite(hospital?.latitude) && Number.isFinite(hospital?.longitude)
						? { latitude: hospital.latitude, longitude: hospital.longitude }
						: null);

				let computedDistanceKm = 0;
				if (liveUserLocation && hospitalCoords) {
					try {
						// Ambulance origin is assumed to be the selected hospital.
						computedDistanceKm = DispatchService.calculateDistance(liveUserLocation, hospitalCoords) || 0;
					} catch (e) {
						console.warn('[useRequestFlow] Distance calculation failed:', e);
					}
				}

				const computedEtaSeconds = Number.isFinite(computedDistanceKm) && computedDistanceKm > 0
					? Math.max(120, Math.round(computedDistanceKm * 60 * 3)) // ~3 min/km, min 2 mins
					: null;
				const computedEtaLabel = computedEtaSeconds == null
					? null
					: (computedEtaSeconds < 60
						? `${computedEtaSeconds}s`
						: (computedEtaSeconds % 60 === 0
							? `${Math.floor(computedEtaSeconds / 60)} min`
							: `${Math.floor(computedEtaSeconds / 60)}m ${computedEtaSeconds % 60}s`));

				const derivedEstimatedArrival =
					request?.estimatedArrival ??
					(request?.serviceType === 'ambulance' ? (hospital?.eta || computedEtaLabel) : (hospital?.waitTime || computedEtaLabel)) ??
					null;

				// Calculate cost for the emergency request.
				// Prefer the modal-calculated pricing snapshot so bed booking uses the selected room price.
				let costData = normalizeRequestCostSnapshot(request?.pricingSnapshot);
				try {
					if (!costData) {
						costData = await serviceCostService.calculateEmergencyCost(
							request.serviceType,
							{
								distance: computedDistanceKm,
								isUrgent: request?.isUrgent || false
							}
						);
					}
				} catch (costError) {
					console.warn('[useRequestFlow] Cost calculation failed:', costError);
					// Continue without cost - payment will be handled separately
				}

				// Determine payment method for atomic RPC
				const paymentMethodId = request?.paymentMethod?.id ||
					(request?.paymentMethod?.is_cash ? 'cash' : null);

				console.log('[useRequestFlow] 📋 Creating Emergency Request:', {
					displayId: visitId,
					hospitalId,
					serviceType: request.serviceType,
					paymentMethod: paymentMethodId,
					totalCost: costData?.total_cost || costData?.totalCost,
					baseCost: costData?.base_cost,
					feeAmount: costData?.feeAmount ?? null,
					grossTotal: costData?.grossTotal ?? null,
					costSource: costData?.source || "serviceCostService",
					hasCostData: !!costData,
				});

				const createdRequest = await createRequest({
					requestId: visitId, // Display ID (AMB-xxx)
					serviceType: request.serviceType,
					hospitalId,
					hospitalName: request?.hospitalName ?? hospital?.name ?? null,
					specialty: request?.specialty ?? selectedSpecialty ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					ambulanceId: request?.ambulanceId ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedArrival: derivedEstimatedArrival,
					status: EmergencyRequestStatus.IN_PROGRESS,
					patient,
					shared,
					patientLocation,
					// Cost and Payment information (used by atomic RPC)
					...(costData && {
						base_cost: costData.base_cost,
						distance_surcharge: costData.distance_surcharge,
						urgency_surcharge: costData.urgency_surcharge,
						total_cost: costData.total_cost ?? costData.totalCost,
						totalCost: costData.totalCost ?? costData.total_cost,
						cost_breakdown: costData.breakdown,
						feeAmount: costData.feeAmount,
						payment_status: 'pending',
					}),
					// Payment method — triggers atomic RPC path in emergencyRequestsService
					payment_method_id: paymentMethodId,
					paymentMethodId: paymentMethodId,
				});

				// 🔑 CRITICAL: Use the REAL UUID from the DB, not the display ID
				const realId = createdRequest?.id || visitId;
				const displayId = createdRequest?.requestId || visitId;
				const requiresApproval = createdRequest?.requiresApproval || false;

				console.log('[useRequestFlow] ✅ Request Created:', {
					realId,
					displayId,
					paymentStatus: createdRequest?.paymentStatus,
					requiresApproval,
					isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(realId),
				});

				// 🏥 Visit is NOW created by backend trigger (sync_emergency_to_history)
				// No frontend addVisit() needed — eliminates RLS and UUID errors.

				// 💰 CASH APPROVAL: Notify org_admin if payment needs approval
				if (requiresApproval) {
					try {
						// Resolve org ID for notification targeting
						const orgId = hospital?.organization_id || hospital?.organizationId;
						await notificationDispatcher.dispatchCashApprovalToOrgAdmins({
							organizationId: orgId,
							paymentId: createdRequest.paymentId,
							requestId: realId,
							totalAmount: costData?.total_cost || costData?.totalCost || 0,
							feeAmount: createdRequest.feeAmount || 0,
							hospitalName: request?.hospitalName || hospital?.name || 'Hospital',
							serviceType: request.serviceType,
							displayId,
						});

						// Notify the patient that they're waiting
						await notificationDispatcher.dispatchEmergencyUpdate(
							{ id: realId },
							'pending_approval'
						);

						console.log('[useRequestFlow] 📨 Cash approval notifications sent');
					} catch (notifError) {
						// Non-blocking: request was still created successfully
						console.warn('[useRequestFlow] Cash approval notification failed (non-blocking):', notifError);
					}
				}

				return {
					ok: true,
					requestId: realId,
					displayId,
					serviceType: request.serviceType,
					estimatedArrival: derivedEstimatedArrival,
					etaSeconds: computedEtaSeconds,
					requiresApproval,
					paymentId: createdRequest?.paymentId || null,
					paymentStatus: createdRequest?.paymentStatus || 'completed',
				};
			} catch (err) {
				inflightByTypeRef.current[request.serviceType] = false;
				const code = err?.code ?? null;
				const message = typeof err?.message === "string" ? err.message : "";
				const details = typeof err?.details === "string" ? err.details : "";
				const hint = typeof err?.hint === "string" ? err.hint : "";
				const raw = `${message} ${details} ${hint}`.toLowerCase();
				if (code === "23505" || raw.includes("uniq_active_bed_per_user") || raw.includes("uniq_active_ambulance_per_user")) {
					return blockResult("CONCURRENCY_DB", { serviceType: request.serviceType });
				}
				throw err;
			}
		},
		[blockResult, canStartRequest, getSnapshots]
	);

	const handleRequestComplete = useCallback(
		async (request) => {
			const {
				hospitals,
				requestHospitalId,
				selectedHospital,
				updateRequest,
				setRequestStatus,
				updateVisit,
				startAmbulanceTrip,
				startBedBooking,
				clearSelectedHospital,
				onRequestComplete,
				selectedSpecialty,
				currentRoute
			} = propsRef.current;

			if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") {
				return blockResult("INVALID_SERVICE_TYPE", { serviceType: request?.serviceType ?? null });
			}

			if (!canStartRequest(request.serviceType)) {
				return blockResult("ALREADY_ACTIVE", { serviceType: request.serviceType });
			}

			const hospitalId =
				request?.hospitalId ?? requestHospitalId ?? selectedHospital?.id ?? null;
			if (!hospitalId) {
				return blockResult("MISSING_HOSPITAL", { serviceType: request.serviceType });
			}

			const nowIso = new Date().toISOString();
			const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
			const hospital = hospitals?.find((h) => h?.id === hospitalId) ?? null;

			try {
				await updateRequest?.(visitId, {
					status: EmergencyRequestStatus.ACCEPTED,
					hospitalId,
					hospitalName: request?.hospitalName ?? hospital?.name ?? null,
					specialty: request?.specialty ?? selectedSpecialty ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					ambulanceId: request?.ambulanceId ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedArrival: request?.estimatedArrival ?? null,
				});
			} catch (err) {
				try {
					await setRequestStatus?.(visitId, EmergencyRequestStatus.ACCEPTED);
				} catch (e) {
				}
			}

			try {
				await updateVisit?.(visitId, {
					lifecycleState: EMERGENCY_VISIT_LIFECYCLE.CONFIRMED,
					lifecycleUpdatedAt: nowIso,
				});
				await updateVisit?.(visitId, {
					lifecycleState: EMERGENCY_VISIT_LIFECYCLE.MONITORING,
					lifecycleUpdatedAt: nowIso,
				});
			} catch (e) {
			}

			if (request.serviceType === "ambulance") {
				const routeEtaSeconds = request?.etaSeconds ?? currentRoute?.durationSec ?? currentRoute?.duration ?? null;
				const fallbackEtaLabel =
					request?.estimatedArrival ??
					(Number.isFinite(routeEtaSeconds)
						? (routeEtaSeconds < 60
							? `${Math.max(1, Math.round(routeEtaSeconds))}s`
							: `${Math.max(1, Math.round(routeEtaSeconds / 60))} min`)
						: null);
				startAmbulanceTrip({
					hospitalId,
					requestId: visitId,
					status: EmergencyRequestStatus.ACCEPTED,
					ambulanceId: request?.ambulanceId ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					assignedAmbulance: request?.assignedAmbulance ?? null,
					currentResponderLocation: request?.currentResponderLocation ?? null,
					currentResponderHeading: request?.currentResponderHeading ?? null,
					estimatedArrival: fallbackEtaLabel,
					etaSeconds: routeEtaSeconds,
					hospitalName: request?.hospitalName ?? null,
					route: currentRoute?.coordinates ?? null,
				});
			}

			if (request.serviceType === "bed") {
				const routeEtaSeconds = request?.etaSeconds ?? currentRoute?.durationSec ?? currentRoute?.duration ?? null;
				startBedBooking({
					hospitalId,
					requestId: visitId,
					status: EmergencyRequestStatus.ACCEPTED,
					hospitalName: request?.hospitalName ?? null,
					specialty: request?.specialty ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedWait: request?.estimatedArrival ?? null,
					etaSeconds: routeEtaSeconds,
				});
			}

			inflightByTypeRef.current[request.serviceType] = false;
			clearSelectedHospital();
			onRequestComplete?.();
			return { ok: true, requestId: visitId, serviceType: request.serviceType };
		},
		[blockResult, canStartRequest]
	);

	// 🚨 QUICK EMERGENCY: Auto-dispatch without hospital selection
	const handleQuickEmergency = useCallback(async (serviceType = "ambulance") => {
		const { hospitals } = propsRef.current;

		if (!canStartRequest(serviceType)) {
			return blockResult("ALREADY_ACTIVE", { serviceType });
		}

		if (inflightByTypeRef.current[serviceType] === true) {
			return blockResult("IN_FLIGHT", { serviceType });
		}

		inflightByTypeRef.current[serviceType] = true;

		try {
			// Get user location first
			let userLocation = null;
			try {
				const currentLocation = await Location.getCurrentPositionAsync({});
				userLocation = {
					latitude: currentLocation.coords.latitude,
					longitude: currentLocation.coords.longitude
				};
			} catch (locationError) {
				console.warn('[useRequestFlow] Quick emergency location failed:', locationError);
				return blockResult("LOCATION_ERROR", { serviceType });
			}

			// Auto-select best hospital
			const bestHospital = DispatchService.selectBestHospital(hospitals || [], userLocation);
			if (!bestHospital) {
				return blockResult("NO_HOSPITALS", { serviceType });
			}

			// Create visitId for the request
			const visitId = `quick_${Date.now()}`;

			// Create emergency request with auto-selected hospital
			const result = await handleRequestInitiated({
				serviceType,
				hospitalId: bestHospital.id,
				requestId: visitId,
				autoDispatched: true,
				dispatchScore: bestHospital.dispatchScore
			});

			return successResult("REQUEST_CREATED", {
				requestId: result.requestId || visitId,
				hospital: bestHospital.name,
				hospitalId: bestHospital.id,
				autoDispatched: true,
				dispatchScore: bestHospital.dispatchScore
			});

		} catch (error) {
			console.error('[useRequestFlow] Quick emergency failed:', error);
			return blockResult("REQUEST_FAILED", { serviceType, error: error.message });
		} finally {
			inflightByTypeRef.current[serviceType] = false;
		}
	}, [blockResult, canStartRequest, handleRequestInitiated, successResult]);

	return useMemo(() => ({
		handleRequestInitiated,
		handleRequestComplete,
		handleQuickEmergency
	}), [handleRequestInitiated, handleRequestComplete, handleQuickEmergency]);
};
