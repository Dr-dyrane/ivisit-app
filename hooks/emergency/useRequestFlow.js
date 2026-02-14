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
				// Calculate cost for the emergency request
				let costData = null;
				try {
					// Calculate distance for cost calculation
					let distance = 0;
					try {
						const currentLocation = await Location.getCurrentPositionAsync({});
						const userLocation = {
							latitude: currentLocation.coords.latitude,
							longitude: currentLocation.coords.longitude
						};

						// Calculate distance to hospital (simplified)
						if (hospital) {
							distance = DispatchService.calculateDistance(
								userLocation,
								{ latitude: hospital.latitude, longitude: hospital.longitude }
							);
						}
					} catch (locationError) {
						console.warn('[useRequestFlow] Could not calculate distance for cost:', locationError);
					}

					// Calculate cost
					costData = await serviceCostService.calculateEmergencyCost(
						request.serviceType,
						{
							distance,
							isUrgent: request?.isUrgent || false
						}
					);
				} catch (costError) {
					console.warn('[useRequestFlow] Cost calculation failed:', costError);
					// Continue without cost - payment will be handled separately
				}

				// Get user location for patient_location
				let patientLocation = null;
				try {
					const currentLocation = await Location.getCurrentPositionAsync({});
					patientLocation = `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`;
				} catch (locationError) {
					console.warn('[useRequestFlow] Could not get user location:', locationError);
					// Fallback to Hemet coordinates
					patientLocation = 'POINT(-116.9730 33.7475)';
				}

				await createRequest({
					id: visitId,
					requestId: visitId,
					serviceType: request.serviceType,
					hospitalId,
					hospitalName: request?.hospitalName ?? hospital?.name ?? null,
					specialty: request?.specialty ?? selectedSpecialty ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					ambulanceId: request?.ambulanceId ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedArrival: request?.estimatedArrival ?? null,
					status: EmergencyRequestStatus.IN_PROGRESS,
					patient,
					shared,
					patientLocation,
					// Cost and Payment information
					...(costData && {
						base_cost: costData.base_cost,
						distance_surcharge: costData.distance_surcharge,
						urgency_surcharge: costData.urgency_surcharge,
						total_cost: costData.total_cost,
						cost_breakdown: costData.breakdown,
						payment_status: 'pending',
						payment_method_id: request?.paymentMethod?.id || null
					})
				});

				await addVisit({
					id: visitId,
					visitId,
					requestId: visitId,
					hospitalId: String(hospitalId),
					hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
					doctor:
						request.serviceType === "ambulance"
							? "Ambulance Dispatch"
							: "Admissions Desk",
					specialty:
						request.serviceType === "ambulance"
							? "Emergency Response"
							: request?.specialty ?? selectedSpecialty ?? "General Care",
					date,
					time,
					type:
						request.serviceType === "ambulance"
							? VISIT_TYPES.AMBULANCE_RIDE
							: VISIT_TYPES.BED_BOOKING,
					status: VISIT_STATUS.IN_PROGRESS,
					lifecycleState: EMERGENCY_VISIT_LIFECYCLE.INITIATED,
					lifecycleUpdatedAt: nowIso,
					image: hospital?.image ?? null,
					address: hospital?.address ?? null,
					phone: hospital?.phone ?? null,
					notes:
						request.serviceType === "ambulance"
							? "Ambulance requested via iVisit."
							: "Bed reserved via iVisit.",
					roomNumber:
						request?.serviceType === "bed" ? request?.bedNumber ?? null : null,
					estimatedDuration:
						request?.serviceType === "bed"
							? request?.estimatedArrival ?? null
							: null,
				});
				return { ok: true, requestId: visitId, serviceType: request.serviceType };
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
				startAmbulanceTrip({
					hospitalId,
					requestId: visitId,
					status: EmergencyRequestStatus.ACCEPTED,
					ambulanceId: request?.ambulanceId ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					estimatedArrival: request?.estimatedArrival ?? null,
					hospitalName: request?.hospitalName ?? null,
					route: currentRoute?.coordinates ?? null,
				});
			}

			if (request.serviceType === "bed") {
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
					etaSeconds: request?.etaSeconds ?? (currentRoute?.duration || null),
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
