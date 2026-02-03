import { supabase } from '../lib/supabase';

/**
 * Display ID Service (Patient App)
 * Handles lookup and validation of human-readable patient IDs (IVP)
 */

/**
 * Get the display ID for a patient/user
 * @param {string} userId - UUID of the user
 * @returns {Promise<string|null>} - Human-readable ID (e.g., IVP-000123)
 */
export async function getPatientDisplayId(userId) {
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
 * Backwards compatibility helper to get ID from profiles table direct column
 * @param {string} userId - UUID of the user
 * @returns {Promise<string|null>}
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
