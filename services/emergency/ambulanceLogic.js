import { ambulanceService } from "../ambulanceService";
import { parsePoint, parseEtaToSeconds } from "./locationUtils";

/**
 * Hydrates ambulance data for a trip if the ambulance details are incomplete.
 * @param {string} ambulanceId 
 * @param {object} currentTrip 
 * @returns {Promise<object|null>} The full ambulance object or null if failed.
 */
export const hydrateAmbulanceData = async (ambulanceId, currentTrip) => {
    if (!ambulanceId) return null;
    
    // Check if hydration is actually needed
    const assigned = currentTrip?.assignedAmbulance;
    const needsHydrate =
        !Number.isFinite(assigned?.rating) ||
        !Array.isArray(assigned?.crew) ||
        (!assigned?.vehicleNumber && !assigned?.callSign);

    if (!needsHydrate) return null; // Already complete

    try {
        const full = await ambulanceService.getById(ambulanceId);
        if (!full || typeof full !== "object") return null;

        const merged = { ...full };
        if (assigned && typeof assigned === "object") {
            Object.keys(assigned).forEach((key) => {
                const value = assigned[key];
                if (value !== undefined && value !== null) {
                    merged[key] = value;
                }
            });
        }
        return merged;
    } catch (e) {
        console.warn("Failed to hydrate ambulance:", e);
        return null;
    }
};

/**
 * Constructs an ambulance trip object from an active request.
 */
export const constructAmbulanceTrip = async (activeAmbulance) => {
    let loc = null;
    if (activeAmbulance.responderLocation) {
        if (
            typeof activeAmbulance.responderLocation === "object" &&
            activeAmbulance.responderLocation.coordinates
        ) {
            loc = {
                latitude: activeAmbulance.responderLocation.coordinates[1],
                longitude: activeAmbulance.responderLocation.coordinates[0],
            };
        } else if (typeof activeAmbulance.responderLocation === "string") {
            loc = parsePoint(activeAmbulance.responderLocation);
        }
    }

    let fullAmbulance = null;
    if (activeAmbulance.ambulanceId) {
        try {
            fullAmbulance = await ambulanceService.getById(activeAmbulance.ambulanceId);
        } catch (e) { }
    }

    const startedAt = activeAmbulance.createdAt
        ? Date.parse(activeAmbulance.createdAt)
        : Date.now();
    const etaSeconds = parseEtaToSeconds(activeAmbulance.estimatedArrival);

    return {
        hospitalId: activeAmbulance.hospitalId,
        requestId: activeAmbulance.requestId,
        status: activeAmbulance.status,
        estimatedArrival: activeAmbulance.estimatedArrival ?? null,
        etaSeconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
        startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
        assignedAmbulance: activeAmbulance.responderName
            ? {
                ...fullAmbulance,
                id: activeAmbulance.ambulanceId || "ems_001",
                type:
                    activeAmbulance.responderVehicleType ||
                    fullAmbulance?.type ||
                    "Ambulance",
                plate:
                    activeAmbulance.responderVehiclePlate ||
                    fullAmbulance?.vehicleNumber,
                name: activeAmbulance.responderName,
                phone: activeAmbulance.responderPhone,
                location: loc || fullAmbulance?.location,
                heading: activeAmbulance.responderHeading || 0,
            }
            : null,
        currentResponderLocation: loc,
        currentResponderHeading: activeAmbulance.responderHeading,
    };
};
