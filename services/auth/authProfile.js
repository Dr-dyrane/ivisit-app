import { supabase } from "../supabase";
import { notificationDispatcher } from "../notificationDispatcher";
import { handleSupabaseError, createAuthError, AuthErrors } from "../../utils/authErrorUtils";

/**
 * Get profile from 'profiles' table
 */
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.warn("Could not fetch user profile:", error);
        return {};
    }

    // Normalize snake_case to camelCase for the app
    return {
        username: data.username,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        phone: data.phone,
        imageUri: data.image_uri,
        address: data.address,
        gender: data.gender,
        dateOfBirth: data.date_of_birth,
        role: data.role || 'patient', // Default to patient
        providerType: data.provider_type,
        bvnVerified: data.bvn_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

/**
 * Update current user's data
 * @param {Object} newData - Data to update
 * @returns {Promise<{ data: Object }>}
 */
export async function updateUser(newData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");

    const updates = {};
    if (newData.firstName !== undefined) updates.first_name = newData.firstName;
    if (newData.lastName !== undefined) updates.last_name = newData.lastName;
    if (newData.username !== undefined) updates.username = newData.username;
    if (newData.phone !== undefined) updates.phone = newData.phone;
    if (newData.imageUri !== undefined) updates.image_uri = newData.imageUri;
    if (newData.fullName !== undefined) updates.full_name = newData.fullName;

    // We only attempt to update these if they are present in the table
    if (newData.address !== undefined) updates.address = newData.address;
    if (newData.gender !== undefined) updates.gender = newData.gender;
    if (newData.dateOfBirth !== undefined) updates.date_of_birth = newData.dateOfBirth;

    // If empty updates, just return current
    if (Object.keys(updates).length === 0) return { data: newData };

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (error) {
        // Graceful fallback: If columns don't exist yet, retry without them
        if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
            console.warn("Schema mismatch: New columns not found in 'profiles'. Retry without extra fields.");
            // Remove problematic fields
            delete updates.address;
            delete updates.gender;
            delete updates.date_of_birth;

            if (Object.keys(updates).length > 1) { // >1 because updated_at is always there
                const { error: retryError } = await supabase.from('profiles').update(updates).eq('id', user.id);
                if (retryError) throw handleSupabaseError(retryError);
                return { data: { ...newData, warning: "Some fields could not be saved (Schema outdated)" } };
            }
        }
        throw handleSupabaseError(error);
    }

    // Create notification for profile update
    try {
        await notificationDispatcher.dispatchAuthEvent('profile_update', newData);
    } catch (error) {
        console.warn("[authService] Failed to create profile update notification:", error);
    }

    // Merge updates for return
    return { data: { ...newData } };
}
