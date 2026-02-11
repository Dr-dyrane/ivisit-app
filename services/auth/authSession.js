import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { insuranceService } from "../insuranceService";
import { createAuthError, AuthErrors } from "../../utils/authErrorUtils";
import { formatUser } from "../mappers/userMapper";
import { getUserProfile } from "./authProfile";
import * as oauthService from "./oauthService";

/**
 * Get the currently logged in user
 * @returns {Promise<{ data: Object }>}
 */
export async function getCurrentUser() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        // Try to clear local state if session is invalid
        await database.delete(StorageKeys.AUTH_TOKEN);
        throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No active session");
    }

    const profile = await getUserProfile(session.user.id);

    // Check insurance status
    let hasInsurance = false;
    try {
        const policies = await insuranceService.list();
        hasInsurance = policies && policies.length > 0;
    } catch (e) {
        console.warn("Failed to fetch insurance status:", e);
    }

    const user = formatUser(session.user, session.access_token, profile, hasInsurance);

    await database.write(StorageKeys.CURRENT_USER, user);

    return { data: user };
}

/**
 * Helper to process a successful session: save tokens, fetch profile, enroll insurance.
 */
export async function _processSuccessfulSession(session) {
    await database.write(StorageKeys.AUTH_TOKEN, session.access_token);
    const profile = await getUserProfile(session.user.id);
    const user = formatUser(session.user, session.access_token, profile);
    await database.write(StorageKeys.CURRENT_USER, user);

    try {
        await insuranceService.enrollBasicScheme();
    } catch (insError) {
        console.warn("[authService] Auto-enrollment error during session process:", insError);
    }
    return user;
}

/**
 * Helper to get formatted user from an existing session
 */
export async function _getUserFromSession(session) {
    const profile = await getUserProfile(session.user.id);
    return formatUser(session.user, session.access_token, profile);
}

/**
 * Handle OAuth callback URL from WebBrowser
 * @param {string} url 
 */
export async function handleOAuthCallback(url) {
    const { session, skipped } = await oauthService.handleOAuthCallback(url);
    
    if (skipped && session) {
        // Even if skipped (already used code), we return the user if we have a session
        const user = await _getUserFromSession(session);
        return { skipped: true, data: { session, user } };
    }

    if (session) {
        const user = await _processSuccessfulSession(session);
        return { data: { session, user } };
    }
    
    // Should be handled by oauthService throwing, but just in case
    throw createAuthError(AuthErrors.INVALID_TOKEN, "Session creation failed");
}
