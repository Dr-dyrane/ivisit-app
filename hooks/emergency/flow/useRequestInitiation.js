import { useCallback } from "react";
import * as Location from "expo-location";
import {
    EMERGENCY_VISIT_LIFECYCLE,
    VISIT_STATUS,
    VISIT_TYPES,
} from "../../../constants/visits";
import { DispatchService } from "../../../services/dispatchService";
import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";

export const useRequestInitiation = ({
    propsRef,
    inflightByTypeRef,
    blockResult,
    canStartRequest
}) => {

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
    }, [propsRef]);

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
        [blockResult, canStartRequest, getSnapshots, propsRef, inflightByTypeRef]
    );

    return { handleRequestInitiated };
};
