import { supabase } from "../supabase";
import { database, StorageKeys } from "../../database";
import { notificationDispatcher } from "../notificationDispatcher";
import { handleSupabaseError, createAuthError, AuthErrors } from "../../utils/authErrorUtils";
import * as oauthService from "./oauthService";
import { getCurrentUser } from "./authSession";

/**
 * Initiate password reset by email
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export async function forgotPassword(email) {
    // Use oauthService to get consistent redirect URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: oauthService.getRedirectUrl('/auth/reset-password'),
    });
    if (error) throw handleSupabaseError(error);
    return { message: "Password reset instructions sent" };
}

// Reset password (update) with token logic handled by Supabase automatically if session is active
export async function resetPassword({ newPassword, resetToken, email }) {
    // CASE 1: Authenticated User (Changing Password or Set Password via Settings)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw handleSupabaseError(error);

        // Update local cache
        await getCurrentUser();
        return { message: "Password updated successfully" };
    }

    // CASE 2: Unauthenticated User (Forgot Password Flow)
    if (resetToken && email) {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: resetToken,
            type: 'recovery',
        });
        if (error) throw handleSupabaseError(error);

        // Once verified, we have a session. Now update the password.
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw handleSupabaseError(updateError);

        // Update local cache
        await getCurrentUser();
        return { message: "Password reset successfully" };
    }

    throw createAuthError(AuthErrors.INVALID_TOKEN, "Invalid reset flow");
}

// Alias for consistency
export async function setPassword({ password }) {
    try {
        // Update password AND set a metadata flag so we know they have one
        const { data, error } = await supabase.auth.updateUser({
            password,
            data: { has_password: true }
        });

        if (error) {
            const msg = error.message?.toLowerCase() || "";
            if (msg.includes("different from the old")) {
                await supabase.auth.updateUser({ data: { has_password: true } });
            } else {
                throw handleSupabaseError(error);
            }
        }

        // Fetch full profile/user data to return
        const currentUserResult = await getCurrentUser();
        const currentUser = currentUserResult.data;

        // Explicitly set hasPassword to true in the returned data and cache
        const updatedUser = { ...currentUser, hasPassword: true };
        await database.write(StorageKeys.CURRENT_USER, updatedUser);

        try {
            await notificationDispatcher.dispatchAuthEvent('password_change', {});
        } catch (error) {
            console.warn("[authService] Failed to create password change notification:", error);
        }

        return {
            success: true,
            data: {
                user: updatedUser,
                token: updatedUser.token
            }
        };
    } catch (error) {
        const errorMessage = (error.message?.includes("|") ? error.message.split("|")[1] : error.message) || "Failed to set password";
        return {
            success: false,
            error: errorMessage
        };
    }
}

export async function changePassword({ currentPassword, newPassword }) {
    return resetPassword({ newPassword });
}
