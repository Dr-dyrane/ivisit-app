/**
 * Authentication Service (Supabase Implementation)
 *
 * Business logic for authentication operations using Supabase Auth.
 * Automatically manages user sessions and profile syncing.
 */

import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { notificationDispatcher } from "./notificationDispatcher";
import { insuranceService } from "./insuranceService";

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Create a formatted error with code and message
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
const createAuthError = (code, message) => {
    const error = new Error(`${code}|${message}`);
    error.code = code;
    return error;
};

// Error codes mapping
const AuthErrors = {
    USER_NOT_FOUND: "USER_NOT_FOUND",
    INVALID_PASSWORD: "INVALID_PASSWORD",
    NO_PASSWORD: "NO_PASSWORD",
    EMAIL_EXISTS: "EMAIL_EXISTS",
    PHONE_EXISTS: "PHONE_EXISTS",
    INVALID_INPUT: "INVALID_INPUT",
    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    NOT_LOGGED_IN: "NOT_LOGGED_IN",
    PASSWORD_EXISTS: "PASSWORD_EXISTS",
    NETWORK_ERROR: "NETWORK_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
};

/**
 * Map Supabase error to AuthError
 * [AUTH_REFACTOR] Enhanced error mapping to catch specific Supabase/Twilio feedback
 * ensuring user-friendly alerts instead of generic developer logs.
 */
const handleSupabaseError = (error) => {
    console.error("Supabase Auth Error:", error);
    if (!error) return createAuthError(AuthErrors.UNKNOWN_ERROR, "An unknown error occurred");

    const msg = error.message?.toLowerCase() || "";

    if (msg.includes("invalid login credentials")) {
        return createAuthError(AuthErrors.INVALID_PASSWORD, "Invalid email or password");
    }
    if (msg.includes("user not found")) {
        return createAuthError(AuthErrors.USER_NOT_FOUND, "Account not found");
    }
    if (msg.includes("already registered")) {
        return createAuthError(AuthErrors.EMAIL_EXISTS, "User already exists");
    }
    if (msg.includes("password")) {
        if (msg.includes("different from the old")) {
            return createAuthError(AuthErrors.PASSWORD_EXISTS, "New password must be different from the old one");
        }
        return createAuthError(AuthErrors.INVALID_PASSWORD, error.message);
    }
    if (msg.includes("network")) {
        return createAuthError(AuthErrors.NETWORK_ERROR, "Network connection error");
    }

    // Improved Email Validation Error Catching
    if (msg.includes("invalid email") ||
        msg.includes("email address is invalid") ||
        (msg.includes("email") && msg.includes("is invalid"))) {
        return createAuthError(AuthErrors.INVALID_INPUT, "Please enter a valid email address");
    }

    // Improved Phone Validation Error Catching
    if (msg.includes("phone") && (msg.includes("invalid") || msg.includes("format") || msg.includes("is invalid"))) {
        return createAuthError(AuthErrors.INVALID_INPUT, "Invalid phone number format");
    }

    if (msg.includes("email not confirmed")) {
        return createAuthError(AuthErrors.INVALID_TOKEN, "Please verify your email first");
    }

    // Handle Provider-side Failures (e.g. Twilio Authentication error 20003)
    if (msg.includes("error sending confirmation otp") || msg.includes("twilio") || msg.includes("provider: authenticate")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Verification service is currently unavailable. Please try again later.");
    }

    if (msg.includes("sms")) {
        return createAuthError(AuthErrors.INVALID_TOKEN, "Failed to send SMS. Please check the number.");
    }

    if (msg.includes("otp") || msg.includes("token")) {
        if (msg.includes("expired")) {
            return createAuthError(AuthErrors.TOKEN_EXPIRED, "The code has expired. Please request a new one.");
        }
        if (msg.includes("invalid")) {
            return createAuthError(AuthErrors.INVALID_TOKEN, "Invalid verification code.");
        }
        return createAuthError(AuthErrors.INVALID_TOKEN, "Verification code error.");
    }

    if (msg.includes("rate limit") || msg.includes("too many requests")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Too many attempts. Please wait a few minutes and try again.");
    }
    if (msg.includes("signup disabled")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Registration is temporarily disabled");
    }

    // Default to a cleaner unknown error presentation
    const cleanMsg = error.message || "An unexpected error occurred during authentication";
    return createAuthError(AuthErrors.UNKNOWN_ERROR, cleanMsg);
};

// ============================================
// AUTH SERVICE METHODS
// ============================================

const authService = {
    /**
     * Check if a user exists by email (Public check not supported directly by Supabase for security)
     * @deprecated Do not use this for login flow logic. Supabase does not allow public existence checks.
     * Always proceed to attempt login or signup and handle the error.
     */
    async checkUserExists(credentials) {
        // Supabase doesn't allow checking if a user exists without logging in for security reasons.
        // We return false to be safe, but this should not be relied upon to block UI.
        return {
            success: true,
            data: { exists: false },
        };
    },

    /**
     * Login with email and password
     * @param {Object} credentials - { email, password }
     * @returns {Promise<{ data: Object }>}
     */
    async login({ email, password }) {
        if (!email || !password) {
            throw createAuthError(AuthErrors.INVALID_INPUT, "Email and password are required");
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw handleSupabaseError(error);

        // Fetch detailed profile from public.profiles
        const profile = await this.getUserProfile(data.user.id);

        // Check insurance status
        let hasInsurance = false;
        try {
            const policies = await insuranceService.list();
            hasInsurance = policies && policies.length > 0;
        } catch (e) {
            console.warn("Failed to fetch insurance status during login:", e);
        }

        // HEURISTIC: Check if user has a password.
        // Supabase doesn't expose this directly.
        // 1. If 'encrypted_password' is in app_metadata (sometimes present)
        // 2. Check if they have 'email' provider in identities
        // 3. OR if we have a local flag (we don't persist this yet)

        // Best proxy: Check identities for 'email' provider
        // BUT: Magic Link also uses 'email' provider.
        // So we might need to rely on:
        // A) Did they just login with password? (Yes, if we are in this function) -> hasPassword = true
        const hasPassword = true;

        const user = this._formatUser(data.user, data.session?.access_token, profile, hasInsurance, hasPassword);

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
    },

    /**
     * Login with password (wrapper with standard response format)
     * @param {Object} credentials - { email?, phone?, password }
     */
    async loginWithPassword(credentials) {
        try {
            const result = await this.login(credentials);
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
    },

    /**
     * Sign up a new user
     * @param {Object} credentials
     * @returns {Promise<{ data: Object }>}
     */
    async signUp(credentials) {
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

        // The trigger on public.profiles should handle profile creation.
        // We return the basic user data.
        // Note: For signUp, we might not have a session yet if email confirmation is required.
        const user = {
            id: data.user?.id,
            email: data.user?.email,
            username,
            firstName,
            lastName,
            token: data.session?.access_token,
            emailVerified: !!data.user?.email_confirmed_at,
            phoneVerified: !!data.user?.phone_confirmed_at,
            hasPassword: true, // We just created it with a password
        };

        if (data.session) {
            // If we have a session, format it properly
            const fullUser = this._formatUser(data.user, data.session.access_token, {
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
    },

    // Wrapper for consistency
    async register(userData) {
        try {
            const result = await this.signUp(userData);
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
    },

    /**
     * Get the redirect URL for OAuth and Magic Links
     * Works for both Expo Go and production builds
     *
     * Platform behavior:
     * - Expo Go: exp://192.168.x.x:8081/--/auth/callback
     * - Dev Client: ivisit://auth/callback (uses app scheme)
     * - Production APK/AAB: ivisit://auth/callback
     */
    getRedirectUrl(path = "/auth/callback") {
        // Normalize path - remove leading slash if present for Linking.createURL
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        const redirectUrl = Linking.createURL(normalizedPath);
        const isExpoGo = Constants.executionEnvironment === 'storeClient';
        console.log("[authService] Generated redirectUrl:", redirectUrl, "| Environment:", isExpoGo ? "Expo Go" : "Dev Client/Build");
        return redirectUrl;
    },

    /**
     * Sign in with OAuth Provider (Google, Twitter/X, Apple)
     * @param {string} provider - 'google', 'twitter', 'apple'
     * @returns {Promise<{ data: { url: string } }>}
     *
     * OAuth Flow:
     * 1. Supabase creates OAuth URL with our redirect URL
     * 2. WebBrowser opens the OAuth page
     * 3. After auth, Supabase redirects to our app
     * 4. Deep link handler (_layout.js) catches the redirect
     * 5. Auth session is established
     */
    async signInWithProvider(provider) {
        // Use Linking.createURL to get platform-appropriate redirect
        // This is registered in Supabase's allowed redirect URLs
        const redirectUrl = this.getRedirectUrl('auth/callback');
        console.log("[authService] signInWithProvider - redirect URL:", redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true, // We handle opening the URL via WebBrowser
            }
        });

        if (error) throw handleSupabaseError(error);
        console.log("[authService] signInWithProvider - OAuth URL generated");
        return { data };
    },

    /**
     * Handle OAuth callback URL from WebBrowser
     * @param {string} url 
     */
    async handleOAuthCallback(url) {
        if (!url) throw createAuthError(AuthErrors.INVALID_TOKEN, "No URL returned");
        // Log without exposing tokens (just the scheme and path)
        const urlScheme = url.split('://')[0] || 'unknown';
        const hasAccessToken = url.includes('access_token=');
        const hasCode = url.includes('code=');
        console.log("[authService] handleOAuthCallback processing:", { scheme: urlScheme, hasAccessToken, hasCode });

        // Check if we already have an active session to avoid redundant exchanges
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        // Check for error in URL
        // e.g. error=access_denied&error_description=...
        if (url.includes('error=')) {
            const params = this._parseUrlParams(url);
            throw createAuthError(AuthErrors.UNKNOWN_ERROR, params.error_description || params.error || "Login failed");
        }

        // 1. Try PKCE (code) - usually in query params
        const params = this._parseUrlParams(url);
        if (params.code) {
            console.log("[authService] PKCE code found, exchanging for session...");
            try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
                if (error) {
                    // If code is already used (e.g. by layout.js listener), check if we have a session now
                    if (error.message?.includes("already been used") && existingSession) {
                        console.log("[authService] Code already used but session exists, skipping");
                        const user = await this._getUserFromSession(existingSession);
                        return { skipped: true, data: { session: existingSession, user } };
                    }
                    throw handleSupabaseError(error);
                }

                if (data.session) {
                    const user = await this._processSuccessfulSession(data.session);
                    return { data: { session: data.session, user } };
                }
            } catch (err) {
                if (err.message?.includes("already been used") && existingSession) {
                    return { skipped: true };
                }
                throw err;
            }
        }

        // 2. Try Implicit (access_token) - usually in hash
        const hashParams = this._parseUrlParams(url, true);
        if (hashParams.access_token && hashParams.refresh_token) {
            console.log("[authService] Implicit token found, setting session...");
            const { data, error } = await supabase.auth.setSession({
                access_token: hashParams.access_token,
                refresh_token: hashParams.refresh_token,
            });
            if (error) throw handleSupabaseError(error);

            if (data.session) {
                const user = await this._processSuccessfulSession(data.session);
                return { data: { session: data.session, user } };
            }
        }

        // 3. Fallback: Check if session was created automatically by Supabase 
        // Or if we already have one from a parallel call
        if (existingSession) {
            console.log("[authService] Using existing session as fallback");
            const user = await this._getUserFromSession(existingSession);
            return { data: { session: existingSession, user }, skipped: true };
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
            const user = await this._processSuccessfulSession(session);
            return { data: { session: session, user } };
        }

        throw createAuthError(AuthErrors.INVALID_TOKEN, "No valid session data found in callback");
    },

    /**
     * Helper to process a successful session: save tokens, fetch profile, enroll insurance.
     */
    async _processSuccessfulSession(session) {
        await database.write(StorageKeys.AUTH_TOKEN, session.access_token);
        const profile = await this.getUserProfile(session.user.id);
        const user = this._formatUser(session.user, session.access_token, profile);
        await database.write(StorageKeys.CURRENT_USER, user);

        try {
            await insuranceService.enrollBasicScheme();
        } catch (insError) {
            console.warn("[authService] Auto-enrollment error during session process:", insError);
        }
        return user;
    },

    /**
     * Helper to get formatted user from an existing session
     */
    async _getUserFromSession(session) {
        const profile = await this.getUserProfile(session.user.id);
        return this._formatUser(session.user, session.access_token, profile);
    },

    /**
     * Helper to parse URL parameters
     * @param {string} url 
     * @param {boolean} useHash 
     */
    _parseUrlParams(url, useHash = false) {
        try {
            const splitChar = useHash ? '#' : '?';
            const parts = url.split(splitChar);
            if (parts.length < 2) return {};

            const queryString = parts[1];
            return queryString.split('&').reduce((acc, current) => {
                const [key, value] = current.split('=');
                if (key && value) {
                    // Handle + as space if needed, but decodeURIComponent usually enough
                    acc[key] = decodeURIComponent(value.replace(/\+/g, ' '));
                }
                return acc;
            }, {});
        } catch (e) {
            console.error("Error parsing URL:", e);
            return {};
        }
    },

    /**
     * Helper to format user object consistently
     */
    _formatUser(sessionUser, sessionToken, profile, hasInsurance = false, hasPasswordOverride = null) {
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
    },

    /**
     * Get the currently logged in user
     * @returns {Promise<{ data: Object }>}
     */
    async getCurrentUser() {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            // Try to clear local state if session is invalid
            await database.delete(StorageKeys.AUTH_TOKEN);
            throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No active session");
        }

        const profile = await this.getUserProfile(session.user.id);

        // Check insurance status
        let hasInsurance = false;
        try {
            const policies = await insuranceService.list();
            hasInsurance = policies && policies.length > 0;
        } catch (e) {
            console.warn("Failed to fetch insurance status:", e);
        }

        const user = this._formatUser(session.user, session.access_token, profile, hasInsurance);

        await database.write(StorageKeys.CURRENT_USER, user);

        return { data: user };
    },

    /**
     * Helper to get profile from 'profiles' table
     */
    async getUserProfile(userId) {
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
    },

    /**
     * Update current user's data
     * @param {Object} newData - Data to update
     * @returns {Promise<{ data: Object }>}
     */
    async updateUser(newData) {
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
        // To avoid "Column not found" errors, you must run the migration:
        // supabase/migrations/20260109180000_add_profile_fields.sql
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
    },

    /**
     * Initiate password reset by email
     * @param {string} email
     * @returns {Promise<{ message: string }>}
     */
    async forgotPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: Linking.createURL('/auth/reset-password'),
        });
        if (error) throw handleSupabaseError(error);
        return { message: "Password reset instructions sent" };
    },

    // Reset password (update) with token logic handled by Supabase automatically if session is active
    // OR if we are using the PKCE flow which exchanges the token in the URL for a session.
    async resetPassword({ newPassword, resetToken, email }) {
        // CASE 1: Authenticated User (Changing Password or Set Password via Settings)
        // If we have a session, we just update the user.
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw handleSupabaseError(error);

            // Update local cache
            await this.getCurrentUser();
            return { message: "Password updated successfully" };
        }

        // CASE 2: Unauthenticated User (Forgot Password Flow)
        // If we are here, the user clicked a link in email.
        // Supabase Deep Link: ivisit://auth/reset-password#access_token=...&refresh_token=...&type=recovery
        // When the app opens via deep link, Supabase client automatically detects the hash
        // and sets the session. So by the time we call this, 'session' SHOULD be true (Case 1).

        // HOWEVER, if you are manually handling OTP (6-digit code) instead of deep link:
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
            await this.getCurrentUser();
            return { message: "Password reset successfully" };
        }

        throw createAuthError(AuthErrors.INVALID_TOKEN, "Invalid reset flow");
    },

    // Alias for consistency
    async setPassword({ password }) {
        try {
            // Update password AND set a metadata flag so we know they have one
            // This is crucial for OAuth users who add a password later
            const { data, error } = await supabase.auth.updateUser({
                password,
                data: { has_password: true }
            });

            // Handle specific case: User tries to "create" a password that matches their old one
            if (error) {
                const msg = error.message?.toLowerCase() || "";
                if (msg.includes("different from the old")) {
                    // IMPORTANT: They have the password, but might miss the metadata flag.
                    // Force update the metadata only.
                    await supabase.auth.updateUser({ data: { has_password: true } });
                } else {
                    throw handleSupabaseError(error);
                }
            }

            // Fetch full profile/user data to return
            const currentUser = await this.getCurrentUser();

            // Explicitly set hasPassword to true in the returned data and cache
            const updatedUser = { ...currentUser.data, hasPassword: true };
            await database.write(StorageKeys.CURRENT_USER, updatedUser);

            // Create notification for password change
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
    },

    async changePassword({ currentPassword, newPassword }) {
        // Supabase doesn't require current password for update if logged in, 
        // but for security flows the UI might ask for it. 
        // We'll just update to the new one.
        return this.resetPassword({ newPassword });
    },

    /**
     * Logout current user
     * @returns {Promise<boolean>}
     */
    async logout() {
        // Create notification before logout (so we still have user context)
        try {
            await notificationDispatcher.dispatchAuthEvent('logout', {});
        } catch (error) {
            console.warn("[authService] Failed to create logout notification:", error);
        }

        await supabase.auth.signOut();
        await database.delete(StorageKeys.AUTH_TOKEN);
        await database.delete(StorageKeys.CURRENT_USER);
        return true;
    },

    /**
     * Delete current user's account
     * @returns {Promise<boolean>}
     */
    async deleteUser() {
        try {
            const { error } = await supabase.rpc('delete_user');

            if (error) {
                console.error("Delete user RPC failed:", error);
                // If RPC fails (e.g. not found), we can't do much on client side
                // except log them out.
                throw handleSupabaseError(error);
            }

            await this.logout();
            return true;
        } catch (error) {
            console.warn("Delete user failed or not fully supported:", error);
            await this.logout();
            return true; // We return true to allow UI to proceed to logout screen
        }
    },

    // ============================================
    // PENDING REGISTRATION / OTP
    // ============================================

    async savePendingRegistration(data) {
        await database.write(StorageKeys.PENDING_REGISTRATION, data);
    },

    async getPendingRegistration() {
        return await database.read(StorageKeys.PENDING_REGISTRATION, null);
    },

    async clearPendingRegistration() {
        await database.delete(StorageKeys.PENDING_REGISTRATION);
    },

    /**
     * Request OTP for Email or Phone
     * @param {Object} { email, phone }
     */
    async requestOtp({ email, phone }) {
        if (phone) {
            // Supabase Phone OTP
            const { error } = await supabase.auth.signInWithOtp({
                phone,
            });

            if (error) return { success: false, error: handleSupabaseError(error).message };

            return { success: true, data: { message: "OTP sent to phone" } };
        }

        if (email) {
            // Supabase Email OTP (Magic Link or OTP)
            // By default signInWithOtp sends a Magic Link. 
            // To force OTP (if configured in Supabase), we assume default behavior.
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true, // Create user if not exists (for signup flow)
                }
            });

            if (error) return { success: false, error: handleSupabaseError(error).message };

            return { success: true, data: { message: "Code sent to email" } };
        }

        return { success: false, error: "Email or Phone required" };
    },

    /**
     * Verify OTP
     * @param {Object} { email, phone, otp }
     */
    async verifyOtp({ email, phone, otp }) {
        // Supabase Verify OTP
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            phone,
            token: otp,
            type: phone ? 'sms' : 'email', // 'email' for magic link/otp, 'sms' for phone
        });

        if (error) return { success: false, error: handleSupabaseError(error).message };

        // Verification successful, session created automatically by Supabase client

        // Ensure profile exists or fetch it
        // If it's a new user via OTP, trigger might handle creation, or we might have partial data
        // Check if existing user (by profile)
        let profile = await this.getUserProfile(data.user.id);

        // If profile is empty, return empty profile - let UI handle the "New User" flow
        if (!profile.createdAt) {
            console.log("[authService] Profile not yet available, continuing with defaults");
        }

        // HEURISTIC UPDATE:
        // A user is "Existing" (ready for login) if they have a username.
        // If they only have an ID/Email/Phone (from trigger), they are "New" (need registration).
        const isExistingUser = !!profile.username;

        // Check insurance status (even if new user, they might have just been auto-enrolled by trigger or we do it below)
        let hasInsurance = false;
        try {
            // We can try to list, but if they are brand new, it might be empty until we enroll them below.
            // However, list() queries the DB.
            const policies = await insuranceService.list();
            hasInsurance = policies && policies.length > 0;
        } catch (e) {
            console.warn("Failed to fetch insurance status during OTP verify:", e);
        }

        // If we are about to enroll them, we can optimistically set true if we succeed, 
        // but for now let's stick to truth from DB or enroll first.

        // Auto-enroll FIRST if needed, so we get the correct status
        if (!hasInsurance) {
            try {
                await insuranceService.enrollBasicScheme();
                hasInsurance = true; // Optimistic update
            } catch (insError) {
                console.warn("[authService] Failed to auto-enroll in insurance (OTP):", insError);
            }
        }

        const user = this._formatUser(data.user, data.session?.access_token, profile, hasInsurance);

        await database.write(StorageKeys.CURRENT_USER, user);
        await database.write(StorageKeys.AUTH_TOKEN, data.session?.access_token);

        return { success: true, data: { ...user, isExistingUser } };
    },
};

export { authService, AuthErrors, createAuthError };
