import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { notificationDispatcher } from "../notificationDispatcher";
import { insuranceService } from "../insuranceService";
import { handleSupabaseError, createAuthError, AuthErrors } from "../../utils/authErrorUtils";
import { formatUser } from "../mappers/userMapper";

/**
 * Sign up a new user
 * @param {Object} credentials
 * @returns {Promise<{ data: Object }>}
 */
export async function signUp(credentials) {
    const { email, password, username, firstName, lastName, phone } = credentials;

    if (!email || !password) {
        throw createAuthError(AuthErrors.INVALID_INPUT, "Email and password are required");
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                first_name: firstName,
                last_name: lastName,
                phone,
                full_name: `${firstName || ''} ${lastName || ''}`.trim()
            },
        },
    });

    if (error) throw handleSupabaseError(error);

    const user = {
        id: data.user?.id,
        email: data.user?.email,
        username,
        firstName,
        lastName,
        token: data.session?.access_token,
        emailVerified: !!data.user?.email_confirmed_at,
        phoneVerified: !!data.user?.phone_confirmed_at,
        hasPassword: true,
    };

    if (data.session) {
        // If we have a session, format it properly
        const fullUser = formatUser(data.user, data.session.access_token, {
            username, firstName, lastName
        }, false, true); // hasPassword = true

        await database.write(StorageKeys.CURRENT_USER, fullUser);
        await database.write(StorageKeys.AUTH_TOKEN, data.session.access_token);

        // Auto-enroll in insurance scheme
        try {
            await insuranceService.enrollBasicScheme();
        } catch (insError) {
            console.warn("[authService] Failed to auto-enroll in insurance:", insError);
        }
    }

    // Create notification for successful signup
    try {
        await notificationDispatcher.dispatchAuthEvent('signup', user);
    } catch (error) {
        console.warn("[authService] Failed to create signup notification:", error);
    }

    return { data: user };
}

// Wrapper for consistency
export async function register(userData) {
    try {
        const result = await signUp(userData);
        return {
            success: true,
            data: {
                user: result.data,
                token: result.data.token,
            },
        };
    } catch (error) {
        const errorMessage = (error.message?.includes("|") ? error.message.split("|")[1] : error.message) || "Registration failed";
        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Check if a user exists by email (Public check not supported directly by Supabase for security)
 * @deprecated Do not use this for login flow logic.
 */
export async function checkUserExists(credentials) {
    return {
        success: true,
        data: { exists: false },
    };
}
