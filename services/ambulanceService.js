import { supabase } from "./supabase";

const TABLE = "ambulances";

const mapFromDb = (row) => {
    // Safely handle location which might be GeoJSON object, string, or null
    let location = null;
    
    try {
        if (row.location && typeof row.location === 'object' && row.location.coordinates) {
             location = {
                latitude: row.location.coordinates[1],
                longitude: row.location.coordinates[0]
            };
        } else if (row.location && typeof row.location === 'string') {
             // Try to parse if it's a string JSON (fallback)
             const parsed = JSON.parse(row.location);
             if (parsed && parsed.coordinates) {
                 location = {
                    latitude: parsed.coordinates[1],
                    longitude: parsed.coordinates[0]
                };
             }
        }
    } catch (e) {
        console.warn('Failed to parse ambulance location:', e);
    }

    return {
        id: row.id,
        type: row.type,
        callSign: row.call_sign,
        status: row.status,
        location,
        eta: row.eta,
        crew: row.crew,
        hospital: row.hospital,
        vehicleNumber: row.vehicle_number,
        lastMaintenance: row.last_maintenance,
        rating: row.rating,
        currentCall: row.current_call,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

export const ambulanceService = {
    async list() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*');

        if (error) {
            console.error("Fetch ambulances error:", error);
            return [];
        }

        return data.map(mapFromDb);
    },

    async getById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return mapFromDb(data);
    },
};
