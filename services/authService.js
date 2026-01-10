/**
 * Authentication Service (Supabase Implementation)
 *
 * Business logic for authentication operations using Supabase Auth.
 * Automatically manages user sessions and profile syncing.
 */

import { supabase } from "./supabase";
import { database, StorageKeys } from "../database";
import * as Linking from 'expo-linking';
import { notificationDispatcher } from "./notificationDispatcher";

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
		return createAuthError(AuthErrors.INVALID_PASSWORD, error.message);
	}
	if (msg.includes("network")) {
		return createAuthError(AuthErrors.NETWORK_ERROR, "Network connection error");
	}
    if (msg.includes("sms")) {
        return createAuthError(AuthErrors.INVALID_TOKEN, "Failed to send SMS. Please check the number.");
    }
    if (msg.includes("otp") || msg.includes("token")) {
        if (msg.includes("expired")) {
             return createAuthError(AuthErrors.TOKEN_EXPIRED, "The code has expired. Please request a new one.");
        }
        return createAuthError(AuthErrors.INVALID_TOKEN, "Invalid verification code.");
    }
    if (msg.includes("rate limit")) {
         return createAuthError(AuthErrors.UNKNOWN_ERROR, "Too many attempts. Please wait a moment.");
    }

	return createAuthError(AuthErrors.UNKNOWN_ERROR, error.message);
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
		
		const user = this._formatUser(data.user, data.session?.access_token, profile);

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
		};

        if (data.session) {
             await database.write(StorageKeys.CURRENT_USER, user);
             await database.write(StorageKeys.AUTH_TOKEN, data.session.access_token);
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
     * Sign in with OAuth Provider (Google, Twitter/X, Apple)
     * @param {string} provider - 'google', 'twitter', 'apple'
     * @returns {Promise<{ data: { url: string } }>}
     */
    async signInWithProvider(provider) {
        // Construct the redirect URL for the app
        // Use Linking.createURL to handle both Expo Go and Production schemes
        // In Expo Go: exp://192.168.x.x:8081/--/auth/callback
        // In Prod: ivisit://auth/callback
        const redirectUrl = Linking.createURL('/auth/callback');

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true, // We will handle opening the URL
            }
        });

        if (error) throw handleSupabaseError(error);
        return { data };
    },

    /**
     * Handle OAuth callback URL from WebBrowser
     * @param {string} url 
     */
    async handleOAuthCallback(url) {
        if (!url) throw createAuthError(AuthErrors.INVALID_TOKEN, "No URL returned");
        
        // Check for error in URL
        // e.g. error=access_denied&error_description=...
        if (url.includes('error=')) {
             const params = this._parseUrlParams(url);
             throw createAuthError(AuthErrors.UNKNOWN_ERROR, params.error_description || params.error || "Login failed");
        }

        // 1. Try PKCE (code) - usually in query params
        const params = this._parseUrlParams(url);
        if (params.code) {
             const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
             if (error) throw handleSupabaseError(error);
             
             // Save to local storage explicitly to be safe
             if (data.session) {
                 await database.write(StorageKeys.AUTH_TOKEN, data.session.access_token);
                 // Profile fetching happens in login/verifyOtp usually, let's do it here too
                 const profile = await this.getUserProfile(data.user.id);
                 const user = this._formatUser(data.user, data.session.access_token, profile);

                 await database.write(StorageKeys.CURRENT_USER, user);
                 return { data: { session: data.session, user } };
             }
        }
        
        // 2. Try Implicit (access_token) - usually in hash
        const hashParams = this._parseUrlParams(url, true);
        if (hashParams.access_token && hashParams.refresh_token) {
             const { data, error } = await supabase.auth.setSession({
                 access_token: hashParams.access_token,
                 refresh_token: hashParams.refresh_token,
             });
             if (error) throw handleSupabaseError(error);
             
             if (data.session) {
                 await database.write(StorageKeys.AUTH_TOKEN, data.session.access_token);
                 const profile = await this.getUserProfile(data.user.id);
                 const user = this._formatUser(data.user, data.session.access_token, profile);

                 await database.write(StorageKeys.CURRENT_USER, user);
                 return { data: { session: data.session, user } };
             }
        }
        
        // 3. Fallback: Check if session was created automatically by Supabase (sometimes happens if the URL is handled by the listener)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
             await database.write(StorageKeys.AUTH_TOKEN, session.access_token);
             const profile = await this.getUserProfile(session.user.id);
             const user = this._formatUser(session.user, session.access_token, profile);

             await database.write(StorageKeys.CURRENT_USER, user);
             return { data: { session: session, user } };
        }

        throw createAuthError(AuthErrors.INVALID_TOKEN, "No valid session data found in callback");
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
    _formatUser(sessionUser, sessionToken, profile) {
        return {
            ...profile,
            id: sessionUser.id,
            email: sessionUser.email,
            phone: sessionUser.phone,
            emailVerified: !!sessionUser.email_confirmed_at,
            phoneVerified: !!sessionUser.phone_confirmed_at,
            token: sessionToken,
            isAuthenticated: true,
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

		const user = this._formatUser(session.user, session.access_token, profile);

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
        if (newData.firstName) updates.first_name = newData.firstName;
        if (newData.lastName) updates.last_name = newData.lastName;
        if (newData.username) updates.username = newData.username;
        if (newData.phone) updates.phone = newData.phone;
        if (newData.imageUri) updates.image_uri = newData.imageUri;
        if (newData.fullName) updates.full_name = newData.fullName;
        
        // We only attempt to update these if they are present in the table
        // To avoid "Column not found" errors, you must run the migration:
        // supabase/migrations/20260109180000_add_profile_fields.sql
        if (newData.address) updates.address = newData.address;
        if (newData.gender) updates.gender = newData.gender;
        if (newData.dateOfBirth) updates.date_of_birth = newData.dateOfBirth;
        
        // If empty updates, just return current
        if (Object.keys(updates).length === 0) return { data: newData };

        updates.updated_at = new Date();

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
            redirectTo: 'ivisit://auth/reset-password',
        });
		if (error) throw handleSupabaseError(error);
		return { message: "Password reset instructions sent" };
	},

    // Reset password (update)
    async resetPassword({ newPassword }) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw handleSupabaseError(error);
        
		// Create notification for password change
		try {
			await notificationDispatcher.dispatchAuthEvent('password_change', {});
		} catch (error) {
			console.warn("[authService] Failed to create password change notification:", error);
		}

        return { message: "Password updated successfully" };
    },

    // Alias for consistency
    async setPassword({ password }) {
        try {
            // Use updateUser directly to get the result
            const { data, error } = await supabase.auth.updateUser({ password });
            if (error) throw handleSupabaseError(error);

            // Fetch full profile/user data to return
            const currentUser = await this.getCurrentUser();
            
			// Create notification for password change
			try {
				await notificationDispatcher.dispatchAuthEvent('password_change', {});
			} catch (error) {
				console.warn("[authService] Failed to create password change notification:", error);
			}

            return {
                success: true,
                data: {
                    user: currentUser.data,
                    token: currentUser.data.token
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

        // RETRY MECHANISM: If profile is empty (trigger might be slow), wait and retry
        if (!profile.createdAt) {
             console.log("Profile missing, waiting for trigger...");
             await new Promise(r => setTimeout(r, 1000)); // Wait 1s
             profile = await this.getUserProfile(data.user.id);
        }

        // HEURISTIC UPDATE:
        // A user is "Existing" (ready for login) if they have a username.
        // If they only have an ID/Email/Phone (from trigger), they are "New" (need registration).
        const isExistingUser = !!profile.username; 

        const user = this._formatUser(data.user, data.session?.access_token, profile);

        await database.write(StorageKeys.CURRENT_USER, user);
        await database.write(StorageKeys.AUTH_TOKEN, data.session?.access_token);

		return { success: true, data: { ...user, isExistingUser } };
	},
};

export { authService, AuthErrors, createAuthError };
