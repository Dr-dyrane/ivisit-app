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
        const { data, error } = await supabase
            .rpc('get_display_id', { p_entity_id: userId });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching patient display ID:', error);
        return null;
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
