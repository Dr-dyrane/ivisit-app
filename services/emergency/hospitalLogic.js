import { supabase } from "../../services/supabase";
import { parsePoint } from "./locationUtils";

// Helper to enrich hospitals with service types.
export const enrichHospitalsWithServiceTypes = (hospitalList) => {
    if (!Array.isArray(hospitalList)) return [];
    return hospitalList.map((hospital, index) => {
        // If already has serviceTypes from DB, rely on them
        if (hospital.serviceTypes && Array.isArray(hospital.serviceTypes) && hospital.serviceTypes.length > 0) {
            return hospital;
        }

        // Determine service types - allow some hospitals to offer both
        let serviceTypes = [];
        if (hospital.type === "premium") {
            serviceTypes = ["premium"];
            // Some premium hospitals also offer standard service (30% of premium)
            if (index % 3 === 0) {
                serviceTypes.push("standard");
            }
        } else {
            serviceTypes = ["standard"];
            // Some standard hospitals also offer premium service (20% of standard)
            if (index % 5 === 0) {
                serviceTypes.push("premium");
            }
        }

        return { ...hospital, serviceTypes };
    });
};

export const normalizeHospitals = (input) => {
    if (!Array.isArray(input)) return [];
    const isValidCoordinate = (coordinate) =>
        Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

    return input
        .filter(Boolean)
        .map((h) => {
            if (!h || !h.id) return null;
            const specialties = Array.isArray(h.specialties)
                ? h.specialties.filter((s) => typeof s === "string")
                : [];
            const availableBeds = Number.isFinite(h.availableBeds)
                ? h.availableBeds
                : typeof h.availableBeds === "string"
                    ? Number(h.availableBeds)
                    : 0;
            const coordinates = isValidCoordinate(h.coordinates) ? h.coordinates : null;

            return {
                ...h,
                specialties,
                availableBeds: Number.isFinite(availableBeds) ? availableBeds : 0,
                coordinates,
            };
        })
        .filter(Boolean);
};

export const filterHospitals = (hospitals, mode, serviceType, selectedSpecialty) => {
    if (!hospitals || hospitals.length === 0) return [];

    return hospitals.filter((hospital) => {
        if (!hospital) return false;

        // Emergency Mode Logic
        if (mode === "emergency") {
            // 🔴 FAILSAFE: If no service type is selected, we MUST return true.
            if (!serviceType || serviceType === "null" || serviceType === null) {
                return true;
            }

            const type = typeof serviceType === 'string' ? serviceType.toLowerCase() : "";
            const hasServiceType = (hospital.serviceTypes || []).some(t => t.toLowerCase() === type);
            const matchesTypeProp = (hospital.type || "").toLowerCase() === type;

            return hasServiceType || matchesTypeProp;
        } else {
            // Booking Mode: Filter by Specialty
            if (!selectedSpecialty) return true; // Show all if no specialty selected

            const hospitalSpecialties = hospital.specialties || [];
            return hospitalSpecialties.some(specialty =>
                specialty &&
                typeof specialty === 'string' &&
                specialty.toLowerCase() === selectedSpecialty.toLowerCase()
            );
        }
    });
};

/**
 * Calculates distances and ETAs for a list of hospitals based on user location.
 * @param {Array} hospitals - List of hospitals from DB
 * @param {Object} userLocation - { latitude, longitude }
 * @returns {Array} - Processed hospitals with distance and eta
 */
export const processHospitalsWithLocation = (hospitals, userLocation) => {
    if (!hospitals || hospitals.length === 0) return [];

    if (!userLocation) {
        const normalized = normalizeHospitals(hospitals);
        return enrichHospitalsWithServiceTypes(normalized);
    }

    const localized = hospitals.map((h) => {
        const dbDistance = h.distance || h.distanceKm;
        const distanceKm = dbDistance ?
            (typeof dbDistance === 'string' ? parseFloat(dbDistance.replace(' km', '')) : dbDistance) :
            (userLocation ?
                Math.sqrt(
                    Math.pow(((h.coordinates?.latitude || h.latitude) - userLocation.latitude) * 111, 2) +
                    Math.pow(((h.coordinates?.longitude || h.longitude) - userLocation.longitude) * 111, 2)
                ) : 0);

        const etaMins = Math.max(2, Math.ceil(distanceKm * 3));

        return {
            ...h,
            coordinates: h.coordinates || { latitude: h.latitude, longitude: h.longitude },
            distance: h.distance || (distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : 'Unknown'),
            distanceKm: h.distanceKm || distanceKm,
            eta: h.eta || (distanceKm > 0 ? `${etaMins} mins` : 'Unknown'),
            specialties: h.specialties || [],
            serviceTypes: h.serviceTypes || [],
            features: h.features || [],
        };
    });

    return enrichHospitalsWithServiceTypes(normalizeHospitals(localized));
};
