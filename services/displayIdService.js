import { supabase } from './supabase';

/**
 * Display ID Service (Patient App)
 * Handles lookup and validation of human-readable patient IDs (IVP)
 */

/**
 * Entity type prefixes
 */
export const ID_PREFIXES = {
    PATIENT: 'IVP',
    PROVIDER: 'PRV',
    ADMIN: 'ADM',
    DISPATCHER: 'DSP',
    ORGANIZATION: 'ORG',
    AMBULANCE: 'AMB', // Uses call_sign field directly
};

/**
 * Get the display ID for a patient/user
 * @param {string} userId - UUID of the user
 * @returns {Promise<string|null>} - Human-readable ID (e.g., IVP-000123)
 */
export async function getDisplayId(userId) {
    try {
        // [SYNC-PARITY] Primary lookup via RPC which queries id_mappings
        const { data, error } = await supabase
            .rpc('get_display_id', { p_entity_id: userId });

        if (error) throw error;

        // [BUG-FIX] Robustly handle different return formats (scalar vs array of objects)
        if (data) {
            if (Array.isArray(data) && data.length > 0) {
                return data[0].display_id || data[0];
            }
            if (typeof data === 'object' && data.display_id) {
                return data.display_id;
            }
            return data;
        }

        // [FALLBACK] Check profiles table direct column if RPC returns nothing
        return await getDisplayIdFromProfile(userId);
    } catch (error) {
        console.error('Error fetching patient display ID:', error);
        // Last resort fallback
        return await getDisplayIdFromProfile(userId);
    }
}

/**
 * Parse display ID to determine entity type
 */
export function parseDisplayIdType(displayId) {
    if (!displayId) return null;
    const prefix = displayId.split('-')[0]?.toUpperCase();
    switch (prefix) {
        case 'IVP': return 'patient';
        case 'PRV': return 'provider';
        case 'ADM': return 'admin';
        case 'DSP': return 'dispatcher';
        case 'ORG': return 'hospital';
        case 'AMB': return 'ambulance';
        default: return null;
    }
}

/**
 * Check if a string looks like a valid display ID
 */
export function isDisplayId(value) {
    if (!value) return false;
    const pattern = /^(IVP|PRV|ORG|AMB|ADM|DSP)-\d{3,6}$/i;
    return pattern.test(value);
}

/**
 * Get entity UUID from display ID
 * @param {string} displayId - Human-readable ID (e.g., IVP-000001)
 * @returns {Promise<string|null>} Entity UUID or null if not found
 */
export async function getEntityId(displayId) {
    if (!displayId) return null;

    try {
        const { data, error } = await supabase.rpc('get_entity_id', {
            p_display_id: displayId.toUpperCase()
        });

        if (error) {
            console.error('[DisplayID] Error getting entity ID:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('[DisplayID] Exception getting entity ID:', error);
        return null;
    }
}

/**
 * Get entity ID from either a display ID or pass through a UUID
 * Useful when input could be either format
 * @param {string} idOrDisplayId - UUID or display ID
 * @returns {Promise<string|null>} Entity UUID
 */
export async function resolveEntityId(idOrDisplayId) {
    if (!idOrDisplayId) return null;

    // Check if it's a display ID format
    if (isDisplayId(idOrDisplayId)) {
        return await getEntityId(idOrDisplayId);
    }

    // Assume it's already a UUID
    return idOrDisplayId;
}

/**
 * Backwards compatibility helper to get ID from profiles table direct column
 */
export async function getDisplayIdFromProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('display_id')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.display_id;
    } catch (error) {
        console.error('Error fetching display_id from profile:', error);
        return null;
    }
}
