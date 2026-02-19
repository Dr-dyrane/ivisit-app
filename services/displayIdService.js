import { supabase } from './supabase';

/**
 * Fluid Display ID Service (v2.0)
 * Handles lookup and validation of human-readable IDs without a mapping table.
 */

export const ID_PREFIXES = {
    // User Roles
    ADMIN: 'ADM',
    PATIENT: 'PAT',
    DISPATCHER: 'DPC',
    ORG_ADMIN: 'OAD',
    PROVIDER: 'PRO',

    // Provider Types (Granular)
    DOCTOR: 'DOC',
    DRIVER: 'DRV',
    PARAMEDIC: 'PMD',
    AMBULANCE_SERVICE: 'AMS',
    PHARMACY: 'PHR',
    CLINIC: 'CLN',

    // Entities
    ORGANIZATION: 'ORG',
    HOSPITAL: 'HSP',
    AMBULANCE: 'AMB',
    REQUEST: 'REQ',
    VISIT: 'VIST',
    PAYMENT: 'PAY',
    NOTIFICATION: 'NTF',
    WALLET_P: 'WLT',
    WALLET_O: 'OWL'
};

/**
 * Check if a string looks like a valid display ID
 */
export function isDisplayId(value) {
    if (!value || typeof value !== 'string') return false;
    const prefixes = Object.values(ID_PREFIXES).join('|');
    const pattern = new RegExp(`^(${prefixes})-[A-F0-9]{6}$`, 'i');
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

/**
 * Check if a string is a valid UUID (Backwards compatibility with Direct IDs)
 */
export function isValidUUID(id) {
    if (!id || typeof id !== 'string') return false;
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(id);
}
