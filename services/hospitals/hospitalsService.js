import { supabase } from "../../services/supabase";
import { mapHospitalFromDb } from "./hospitalMapper";

/**
 * Service to handle hospital data operations
 */
export const hospitalsService = {
    /**
     * Fetch all hospitals from Supabase
     * @returns {Promise<Array>} List of hospitals in app format
     */
    async list() {
        try {
            const { data, error } = await supabase
                .from("hospitals")
                .select("*")
                .order("name");

            if (error) throw error;
            return (data || []).map(mapHospitalFromDb);
        } catch (err) {
            console.error("hospitalsService.list error:", err);
            throw err;
        }
    },

    /**
     * Fetch nearby hospitals with distance calculations
     * @param {number} userLat - User latitude
     * @param {number} userLng - User longitude  
     * @param {number} radiusKm - Search radius in kilometers
     * @returns {Promise<Array>} List of nearby hospitals with distance info
     */
    async discoverNearby(userLat, userLng, radiusKm = 50) {
        try {
            const { data, error } = await supabase
                .rpc('nearby_hospitals', {
                    user_lat: userLat,
                    user_lng: userLng,
                    radius_km: radiusKm
                });

            if (error) throw error;
            return (data || []).map(mapHospitalFromDb);
        } catch (err) {
            console.error("hospitalsService.discoverNearby error:", err);
            throw err;
        }
    },

    /**
     * Get a single hospital by ID
     * @param {string} id - Hospital ID
     * @returns {Promise<Object>} Hospital object
     */
    async getById(id) {
        try {
            const { data, error } = await supabase
                .from("hospitals")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return mapHospitalFromDb(data);
        } catch (err) {
            console.error(`hospitalsService.getById error for ${id}:`, err);
            throw err;
        }
    },

    /**
     * Calculate dynamic wait time based on hospital load and distance
     * @param {Object} hospital - Hospital object
     * @param {Object} userLocation - User location object
     * @returns {string} Estimated wait time string (e.g., "15 mins")
     */
    calculateDynamicWaitTime(hospital, userLocation) {
        // Base wait time from hospital data or default to 15
        let baseWait = parseInt(hospital.waitTime) || 15;
        
        // Add time for distance (rough estimate: 2 mins per km)
        if (hospital.distanceKm) {
            baseWait += Math.round(hospital.distanceKm * 2);
        }

        // Adjust for bed availability (fewer beds = longer wait)
        if (hospital.availableBeds !== undefined && hospital.availableBeds < 5) {
            baseWait += 10;
        }

        return `${baseWait} mins`;
    }
};
