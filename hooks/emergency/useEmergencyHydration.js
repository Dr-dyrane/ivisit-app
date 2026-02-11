import { useEffect, useRef } from "react";
import { supabase } from "../../services/supabase";
import { emergencyRequestsService } from "../../services/emergencyRequestsService";
import { hydrateAmbulanceData, constructAmbulanceTrip } from "../../services/emergency/ambulanceLogic";
import { parseEtaToSeconds } from "../../services/emergency/locationUtils";

export const useEmergencyHydration = ({ setActiveAmbulanceTrip, setActiveBedBooking, activeAmbulanceTrip }) => {
    const lastHydratedAmbulanceIdRef = useRef(null);
    const isHydratingAmbulanceRef = useRef(false);

    // Initial Hydration
    useEffect(() => {
        let isActive = true;
        (async () => {
            let attempt = 0;
            while (isActive && attempt < 10) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) break;
                attempt += 1;
                await new Promise((resolve) => setTimeout(resolve, 400));
            }

            const activeRequests = await emergencyRequestsService.list();
            const isActiveStatus = (status) => status === "in_progress" || status === "accepted" || status === "arrived";
            
            const activeAmbulance = activeRequests.find((r) => r?.serviceType === "ambulance" && isActiveStatus(r?.status));
            const activeBed = activeRequests.find((r) => r?.serviceType === "bed" && isActiveStatus(r?.status));

            if (!isActive) return;

            if (activeAmbulance) {
                const trip = await constructAmbulanceTrip(activeAmbulance);
                setActiveAmbulanceTrip(trip);
            }

            if (activeBed) {
                const startedAt = activeBed.createdAt ? Date.parse(activeBed.createdAt) : Date.now();
                const etaSeconds = parseEtaToSeconds(activeBed.estimatedArrival);
                setActiveBedBooking({
                    hospitalId: activeBed.hospitalId,
                    requestId: activeBed.requestId,
                    status: activeBed.status,
                    hospitalName: activeBed.hospitalName ?? null,
                    specialty: activeBed.specialty ?? null,
                    bedNumber: activeBed.bedNumber ?? null,
                    bedType: activeBed.bedType ?? null,
                    bedCount: activeBed.bedCount ?? null,
                    estimatedWait: activeBed.estimatedArrival ?? null,
                    etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
                    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
                });
            }
        })();
        return () => { isActive = false; };
    }, []);

    // Hydrate Ambulance Data when ID is available
    useEffect(() => {
        const ambulanceId = activeAmbulanceTrip?.assignedAmbulance?.id;
        if (!ambulanceId || lastHydratedAmbulanceIdRef.current === ambulanceId || isHydratingAmbulanceRef.current) return;

        (async () => {
            isHydratingAmbulanceRef.current = true;
            const merged = await hydrateAmbulanceData(ambulanceId, activeAmbulanceTrip);
            if (merged) {
                lastHydratedAmbulanceIdRef.current = ambulanceId;
                setActiveAmbulanceTrip(prev => ({ ...prev, assignedAmbulance: merged }));
            }
            isHydratingAmbulanceRef.current = false;
        })();
    }, [activeAmbulanceTrip?.assignedAmbulance?.id]);
};
