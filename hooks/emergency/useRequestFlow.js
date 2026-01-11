import { useCallback, useRef } from "react";
import {
	EMERGENCY_VISIT_LIFECYCLE,
	VISIT_STATUS,
	VISIT_TYPES,
} from "../../constants/visits";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";

export const useRequestFlow = ({
	createRequest,
	updateRequest,
	addVisit,
	updateVisit,
	setRequestStatus,
	startAmbulanceTrip,
	startBedBooking,
	clearSelectedHospital,
	user,
	preferences,
	medicalProfile,
	emergencyContacts,
	hospitals,
	selectedSpecialty,
	requestHospitalId,
	selectedHospital,
	activeAmbulanceTrip,
	activeBedBooking,
	currentRoute,
	onRequestComplete,
}) => {
	const inflightByTypeRef = useRef({ ambulance: false, bed: false });

	const getSnapshots = useCallback(() => {
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
	}, [
		emergencyContacts,
		medicalProfile,
		preferences?.privacyShareEmergencyContacts,
		preferences?.privacyShareMedicalProfile,
		user?.email,
		user?.fullName,
		user?.phone,
		user?.username,
	]);

	const canStartRequest = useCallback(
		(serviceType) => {
			if (serviceType === "ambulance") return !activeAmbulanceTrip?.requestId;
			if (serviceType === "bed") return !activeBedBooking?.requestId;
			return false;
		},
		[activeAmbulanceTrip?.requestId, activeBedBooking?.requestId]
	);

	const handleRequestInitiated = useCallback(
		async (request) => {
			if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") {
				console.warn(
					"[useRequestFlow] Invalid service type (initiated):",
					request?.serviceType
				);
				return;
			}

			if (!canStartRequest(request.serviceType)) {
				console.warn(
					"[useRequestFlow] Concurrency block (initiated):",
					request.serviceType
				);
				return;
			}

			if (inflightByTypeRef.current[request.serviceType] === true) {
				return;
			}

			const hospitalId =
				request?.hospitalId ?? requestHospitalId ?? selectedHospital?.id ?? null;
			if (!hospitalId) {
				console.warn("[useRequestFlow] Missing hospitalId (initiated)");
				return;
			}

			const now = new Date();
			const nowIso = now.toISOString();
			const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
			const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;
			const date = nowIso.slice(0, 10);
			const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
			const { patient, shared } = getSnapshots();

			inflightByTypeRef.current[request.serviceType] = true;
			try {
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
			} catch (err) {
				inflightByTypeRef.current[request.serviceType] = false;
				throw err;
			}
		},
		[
			addVisit,
			canStartRequest,
			createRequest,
			getSnapshots,
			hospitals,
			requestHospitalId,
			selectedHospital?.id,
			selectedSpecialty,
		]
	);

	const handleRequestComplete = useCallback(
		async (request) => {
			if (request?.serviceType !== "ambulance" && request?.serviceType !== "bed") {
				console.warn(
					"[useRequestFlow] Invalid service type (confirmed):",
					request?.serviceType
				);
				return;
			}

			if (!canStartRequest(request.serviceType)) {
				console.warn(
					"[useRequestFlow] Concurrency block (confirmed):",
					request.serviceType
				);
				return;
			}

			const hospitalId =
				request?.hospitalId ?? requestHospitalId ?? selectedHospital?.id ?? null;
			if (!hospitalId) {
				console.warn("[useRequestFlow] Missing hospitalId (confirmed)");
				return;
			}

			const nowIso = new Date().toISOString();
			const visitId = request?.requestId ? String(request.requestId) : `local_${Date.now()}`;
			const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;

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
				});
			}

			inflightByTypeRef.current[request.serviceType] = false;
			clearSelectedHospital();
			onRequestComplete?.();
		},
		[
			canStartRequest,
			clearSelectedHospital,
			currentRoute,
			hospitals,
			onRequestComplete,
			requestHospitalId,
			selectedHospital?.id,
			selectedSpecialty,
			setRequestStatus,
			startAmbulanceTrip,
			startBedBooking,
			updateRequest,
			updateVisit,
		]
	);

	return { handleRequestInitiated, handleRequestComplete };
};
