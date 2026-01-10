import { useCallback } from "react";
import { VISIT_STATUS, VISIT_TYPES } from "../../constants/visits";
import { EmergencyRequestStatus } from "../../services/emergencyRequestsService";

export const useRequestFlow = ({
	createRequest,
	addVisit,
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
	currentRoute,
	onRequestComplete,
}) => {
	const handleRequestComplete = useCallback(
		(request) => {
			if (
				request?.serviceType !== "ambulance" &&
				request?.serviceType !== "bed"
			) {
				console.warn("[useRequestFlow] Invalid service type:", request?.serviceType);
				return;
			}

			const hospitalId = requestHospitalId ?? selectedHospital?.id ?? null;
			if (!hospitalId) {
				console.warn("[useRequestFlow] Missing hospitalId");
				return;
			}

			const now = new Date();
			const visitId = request?.requestId
				? String(request.requestId)
				: `local_${Date.now()}`;
			const hospital = hospitals.find((h) => h?.id === hospitalId) ?? null;
			const date = now.toISOString().slice(0, 10);
			const time = now.toLocaleTimeString([], {
				hour: "numeric",
				minute: "2-digit",
			});

			const createRequestAsync = async () => {
				try {
					const shareMedicalProfile =
						preferences?.privacyShareMedicalProfile === true;
					const shareEmergencyContacts =
						preferences?.privacyShareEmergencyContacts === true;

					const shared = {
						medicalProfile: shareMedicalProfile ? medicalProfile : null,
						emergencyContacts: shareEmergencyContacts
							? emergencyContacts
							: null,
					};

					const patient = {
						fullName: user?.fullName ?? null,
						phone: user?.phone ?? null,
						email: user?.email ?? null,
						username: user?.username ?? null,
					};

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

					console.log("[useRequestFlow] Request created:", {
						visitId,
						serviceType: request.serviceType,
					});
				} catch (err) {
					console.error("[useRequestFlow] Request creation failed:", err);
				}
			};

			createRequestAsync();

			if (request?.serviceType === "ambulance") {
				startAmbulanceTrip({
					hospitalId,
					requestId: visitId,
					ambulanceId: request?.ambulanceId ?? null,
					ambulanceType: request?.ambulanceType ?? null,
					estimatedArrival: request?.estimatedArrival ?? null,
					hospitalName: request?.hospitalName ?? null,
					route: currentRoute?.coordinates ?? null,
				});

				addVisit({
					id: visitId,
					visitId,
					requestId: visitId,
					hospitalId: String(hospitalId),
					hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
					doctor: "Ambulance Dispatch",
					specialty: "Emergency Response",
					date,
					time,
					type: VISIT_TYPES.AMBULANCE_RIDE,
					status: VISIT_STATUS.IN_PROGRESS,
					image: hospital?.image ?? null,
					address: hospital?.address ?? null,
					phone: hospital?.phone ?? null,
					notes: "Ambulance requested via iVisit.",
				});
			}

			if (request?.serviceType === "bed") {
				startBedBooking({
					hospitalId,
					requestId: visitId,
					hospitalName: request?.hospitalName ?? null,
					specialty: request?.specialty ?? null,
					bedNumber: request?.bedNumber ?? null,
					bedType: request?.bedType ?? null,
					bedCount: request?.bedCount ?? null,
					estimatedWait: request?.estimatedArrival ?? null,
				});

				addVisit({
					id: visitId,
					visitId,
					requestId: visitId,
					hospitalId: String(hospitalId),
					hospital: request?.hospitalName ?? hospital?.name ?? "Hospital",
					doctor: "Admissions Desk",
					specialty: request?.specialty ?? selectedSpecialty ?? "General Care",
					date,
					time,
					type: VISIT_TYPES.BED_BOOKING,
					status: VISIT_STATUS.IN_PROGRESS,
					image: hospital?.image ?? null,
					address: hospital?.address ?? null,
					phone: hospital?.phone ?? null,
					notes: "Bed reserved via iVisit.",
					roomNumber: request?.bedNumber ?? null,
					estimatedDuration: request?.estimatedArrival ?? null,
				});
			}

			clearSelectedHospital();
			onRequestComplete?.();
		},
		[
			addVisit,
			clearSelectedHospital,
			createRequest,
			currentRoute,
			emergencyContacts,
			hospitals,
			medicalProfile,
			onRequestComplete,
			preferences,
			requestHospitalId,
			selectedHospital?.id,
			selectedSpecialty,
			startAmbulanceTrip,
			startBedBooking,
			user?.email,
			user?.fullName,
			user?.phone,
			user?.username,
		]
	);

	return { handleRequestComplete };
};
