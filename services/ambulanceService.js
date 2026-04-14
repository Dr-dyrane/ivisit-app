import { supabase } from "./supabase";
import { isValidUUID, resolveEntityId } from "./displayIdService";

const TABLE = "ambulances";

const formatSupabaseError = (error) => {
    if (!error) return "Unknown Supabase error";
    return {
        message: error.message || null,
        code: error.code || null,
        details: error.details || null,
        hint: error.hint || null,
    };
};

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
        displayId: row.display_id ?? null,
        type: row.type,
        callSign: row.call_sign,
        status: row.status,
        location,
        eta: row.eta,
        crew: row.crew,
        hospitalId: row.hospital_id ?? null,
        organizationId: row.organization_id ?? null,
        profileId: row.profile_id ?? null,
        licensePlate: row.license_plate ?? null,
        vehicleNumber: row.vehicle_number,
        currentCall: row.current_call,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Compatibility aliases for existing UI adapters.
        hospital: row.hospital_id ?? null,
        lastMaintenance: null,
        rating: null,
    };
};

export const ambulanceService = {
    async list() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*');

        if (error) {
            if (__DEV__) {
                console.warn("[ambulanceService] Ambulance list unavailable:", formatSupabaseError(error));
            }
            return [];
        }

        return (data || []).map(mapFromDb);
    },

    async getById(id) {
        try {
            if (!id) return null;

            // Resolve Display ID (AMB-XXXXXX) to UUID if necessary
            const resolvedId = await resolveEntityId(id);
            if (!resolvedId || !isValidUUID(resolvedId)) {
                return null;
            }

            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', resolvedId)
                .single();

            if (error) return null;
            return mapFromDb(data);
        } catch (error) {
            console.error(`[ambulanceService] Error fetching ambulance ${id}:`, error);
            return null;
        }
    },
};
