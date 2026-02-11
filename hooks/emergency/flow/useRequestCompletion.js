import { useCallback } from "react";
import {
    EMERGENCY_VISIT_LIFECYCLE,
} from "../../../constants/visits";
import { EmergencyRequestStatus } from "../../../services/emergencyRequestsService";

export const useRequestCompletion = ({
    propsRef,
    inflightByTypeRef,
    blockResult,
    canStartRequest
}) => {

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
        [blockResult, canStartRequest, propsRef, inflightByTypeRef]
    );

    return { handleRequestComplete };
};
