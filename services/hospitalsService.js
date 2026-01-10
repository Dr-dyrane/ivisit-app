import { supabase } from "./supabase";

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

			// Map database fields to application domain model
			return (data || []).map((h) => ({
				id: h.id,
				name: h.name,
				address: h.address,
				phone: h.phone,
				rating: h.rating,
				type: h.type,
				image: h.image,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [], // DB column is snake_case
				features: h.features || [],
				emergencyLevel: h.emergency_level, // DB column is snake_case
				availableBeds: h.available_beds, // DB column is snake_case
				ambulances: h.ambulances_count, // DB column is snake_case
				waitTime: h.wait_time, // DB column is snake_case
				price: h.price_range, // DB column name diff
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified,
				status: h.status,
			}));
		} catch (err) {
			console.error("hospitalsService.list error:", err);
			throw err;
		}
	},

    /**
     * Get a single hospital by ID
     * @param {string} id 
     */
    async getById(id) {
        try {
            const { data, error } = await supabase
                .from("hospitals")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Reuse the mapping logic or extract it to a helper if complex
            // For now, inline mapping for single item
            const h = data;
            return {
				id: h.id,
				name: h.name,
				address: h.address,
				phone: h.phone,
				rating: h.rating,
				type: h.type,
				image: h.image,
				specialties: h.specialties || [],
				serviceTypes: h.service_types || [],
				features: h.features || [],
				emergencyLevel: h.emergency_level,
				availableBeds: h.available_beds,
				ambulances: h.ambulances_count,
				waitTime: h.wait_time,
				price: h.price_range,
				coordinates: {
					latitude: h.latitude,
					longitude: h.longitude,
				},
				verified: h.verified,
				status: h.status,
			};
        } catch (err) {
            console.error("hospitalsService.getById error:", err);
            throw err;
        }
    }
};
