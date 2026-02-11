import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { notificationDispatcher } from "../notificationDispatcher";
import { insuranceService } from "../insuranceService";
import { handleSupabaseError, createAuthError, AuthErrors } from "../../utils/authErrorUtils";
import { formatUser } from "../mappers/userMapper";
import { getUserProfile } from "./authProfile";

/**
 * Login with email and password
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{ data: Object }>}
 */
export async function login({ email, password }) {
    if (!email || !password) {
        throw createAuthError(AuthErrors.INVALID_INPUT, "Email and password are required");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw handleSupabaseError(error);

    // Fetch detailed profile from public.profiles
    const profile = await getUserProfile(data.user.id);

    // Check insurance status
    let hasInsurance = false;
    try {
        const policies = await insuranceService.list();
        hasInsurance = policies && policies.length > 0;
    } catch (e) {
        console.warn("Failed to fetch insurance status during login:", e);
    }

    // HEURISTIC: Check if user has a password.
    const hasPassword = true;

    const user = formatUser(data.user, data.session?.access_token, profile, hasInsurance, hasPassword);

    // Cache locally for offline support
    await database.write(StorageKeys.CURRENT_USER, user);
    await database.write(StorageKeys.AUTH_TOKEN, data.session?.access_token);

    // Create notification for successful login
    try {
        await notificationDispatcher.dispatchAuthEvent('login', user);
    } catch (error) {
        console.warn("[authService] Failed to create login notification:", error);
    }

    return { data: user };
}

/**
 * Login with password (wrapper with standard response format)
 * @param {Object} credentials - { email?, phone?, password }
 */
export async function loginWithPassword(credentials) {
    try {
        const result = await login(credentials);
        return {
            success: true,
            data: {
                user: result.data,
                token: result.data.token,
            },
        };
    } catch (error) {
        const errorMessage = (error.message?.includes("|") ? error.message.split("|")[1] : error.message) || "Login failed";
        return {
            success: false,
            error: errorMessage,
        };
    }
}
