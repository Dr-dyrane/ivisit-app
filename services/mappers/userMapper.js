/**
 * User Mapper
 * Handles formatting and normalization of user data
 */

/**
 * Format user object consistently from session and profile data
 * 
 * @param {Object} sessionUser - Supabase user object from session
 * @param {string} sessionToken - Access token
 * @param {Object} profile - User profile data from database
 * @param {boolean} hasInsurance - Whether user has active insurance
 * @param {boolean|null} hasPasswordOverride - Override for password existence check
 * @returns {Object} Formatted user object
 */
export const formatUser = (sessionUser, sessionToken, profile, hasInsurance = false, hasPasswordOverride = null) => {
    // Try to determine if user has a password
    // 1. Use override if provided (e.g. from loginWithPassword)
    // 2. Check user_metadata.has_password (our custom flag)
    // 3. Check encrypted_password (often present in user object but not always documented)
    // 4. Check app_metadata.providers for "email"

    let hasPassword = hasPasswordOverride;

    if (hasPassword === null) {
        // 1. Check custom metadata flag (The most reliable source for OAuth users who added password)
        if (sessionUser?.user_metadata?.has_password === true) {
            hasPassword = true;
        }
        // 2. Check encrypted_password
        else if (sessionUser?.encrypted_password) {
            hasPassword = true;
        } else {
            // 3. Fallback to provider check
            const providers = sessionUser?.app_metadata?.providers || [];
            const hasEmailProvider = providers.includes('email');
            hasPassword = hasEmailProvider;
        }
    }

    return {
        ...profile,
        id: sessionUser.id,
        email: sessionUser.email,
        phone: sessionUser.phone,
        emailVerified: !!sessionUser.email_confirmed_at,
        phoneVerified: !!sessionUser.phone_confirmed_at,
        token: sessionToken,
        isAuthenticated: true,
        hasInsurance,
        hasPassword,
    };
};
