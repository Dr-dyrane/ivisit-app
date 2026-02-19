import { supabase } from './supabase';

/**
 * Fluid Display ID Service (v2.0)
 * Handles lookup and validation of human-readable IDs without a mapping table.
 */

export const ID_PREFIXES = {
    USER: 'USR',
    ORGANIZATION: 'ORG',
    HOSPITAL: 'HSP',
    DOCTOR: 'DOC',
    AMBULANCE: 'AMB',
    REQUEST: 'REQ',
    VISIT: 'VIST',
    PAYMENT: 'PAY',
    NOTIFICATION: 'NTF'
};

/**
 * Check if a string looks like a valid display ID
 */
export function isDisplayId(value) {
    if (!value || typeof value !== 'string') return false;
    const pattern = /^(USR|ORG|HSP|DOC|AMB|REQ|VIST|PAY|NTF)-[A-F0-9]{6}$/i;
    return pattern.test(value);
}

/**
 * Resolve a display ID to a UUID via virtual lookup
 */
export async function getEntityId(displayId) {
    if (!displayId || !isDisplayId(displayId)) return null;

    try {
        const { data, error } = await supabase.rpc('get_entity_id', {
            p_display_id: displayId.toUpperCase()
        });

        if (error) {
            console.error('[DisplayID] Resolution Error:', error);
            return null;
        }
        return data;
    } catch (error) {
        return null;
    }
}

/**
 * Passive resolution: Pass UUID through or resolve Display ID
 */
export async function resolveEntityId(idOrDisplayId) {
    if (!idOrDisplayId) return null;
    if (isDisplayId(idOrDisplayId)) {
        return await getEntityId(idOrDisplayId);
    }
    return idOrDisplayId;
}

/**
 * Get Display ID for a profile directly
 */
export async function getProfileDisplayId(userId) {
    const { data } = await supabase
        .from('profiles')
        .select('display_id')
        .eq('id', userId)
        .single();
    return data?.display_id;
}

/**
 * Universal getDisplayId (Alias for getProfileDisplayId to match app usage)
 */
export const getDisplayId = getProfileDisplayId;
