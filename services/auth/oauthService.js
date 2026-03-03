/**
 * OAuth Service
 * Handles OAuth authentication flows (Google, Apple, etc.)
 */

import { supabase } from "../supabase";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { AuthErrors, createAuthError, handleSupabaseError } from "../../utils/authErrorUtils";

const CUSTOM_SCHEME = "ivisit";

/**
 * Get the redirect URL for OAuth and Magic Links
 * Works for both Expo Go and production builds
 */
export const getRedirectUrl = (path = "/auth/callback") => {
    // Normalize path - remove leading slash if present for Linking.createURL
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const redirectUrl = Linking.createURL(normalizedPath);
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    console.log("[oauthService] Generated redirectUrl:", redirectUrl, "| Environment:", isExpoGo ? "Expo Go" : "Dev Client/Build");
    return redirectUrl;
};

/**
 * Resolve the most reliable OAuth redirect URL for the current runtime.
 * Prefers custom scheme when this runtime can open it; otherwise falls back
 * to Linking.createURL (Expo Go exp:// flow).
 */
export const resolveOAuthRedirectUrl = async (path = "/auth/callback") => {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const runtimeRedirectUrl = Linking.createURL(normalizedPath);
    const customSchemeRedirectUrl = `${CUSTOM_SCHEME}://${normalizedPath}`;

    let canUseCustomScheme = false;
    try {
        canUseCustomScheme = await Linking.canOpenURL(customSchemeRedirectUrl);
    } catch (error) {
        console.warn("[oauthService] Linking.canOpenURL(customScheme) failed, falling back to runtime URL");
    }

    const resolvedRedirectUrl = canUseCustomScheme ? customSchemeRedirectUrl : runtimeRedirectUrl;
    console.log("[oauthService] Resolved OAuth redirect URL:", resolvedRedirectUrl, "| customSchemeSupported:", canUseCustomScheme);
    return resolvedRedirectUrl;
};

/**
 * Sign in with OAuth Provider (Google, Twitter/X, Apple)
 * @param {string} provider - 'google', 'twitter', 'apple'
 * @returns {Promise<{ data: { url: string } }>}
 */
export const signInWithProvider = async (provider) => {
    // Resolve a callback URL that this runtime can actually handle.
    const redirectUrl = await resolveOAuthRedirectUrl('auth/callback');
    console.log("[oauthService] signInWithProvider - redirect URL:", redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // We handle opening the URL via WebBrowser
        }
    });

    if (error) throw handleSupabaseError(error);
    console.log("[oauthService] signInWithProvider - OAuth URL generated");
    return { data, redirectUrl };
};

/**
 * Helper to parse URL parameters
 * @param {string} url 
 * @param {boolean} useHash 
 */
export const parseUrlParams = (url, useHash = false) => {
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
};

/**
 * Handle OAuth callback URL from WebBrowser
 * Returns the session data if successful
 * @param {string} url 
 * @returns {Promise<{ session: Object, skipped?: boolean }>}
 */
export const handleOAuthCallback = async (url) => {
    if (!url) throw createAuthError(AuthErrors.INVALID_TOKEN, "No URL returned");
    
    // Log without exposing tokens (just the scheme and path)
    const urlScheme = url.split('://')[0] || 'unknown';
    const hasAccessToken = url.includes('access_token=');
    const hasCode = url.includes('code=');
    console.log("[oauthService] handleOAuthCallback processing:", { scheme: urlScheme, hasAccessToken, hasCode });

    // Check if we already have an active session to avoid redundant exchanges
    const { data: { session: existingSession } } = await supabase.auth.getSession();

    // Check for error in URL
    // e.g. error=access_denied&error_description=...
    if (url.includes('error=')) {
        const params = parseUrlParams(url);
        throw createAuthError(AuthErrors.UNKNOWN_ERROR, params.error_description || params.error || "Login failed");
    }

    // 1. Try PKCE (code) - usually in query params
    const params = parseUrlParams(url);
    if (params.code) {
        console.log("[oauthService] PKCE code found, exchanging for session...");
        try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
            if (error) {
                // If code is already used (e.g. by layout.js listener), check if we have a session now
                if (error.message?.includes("already been used") && existingSession) {
                    console.log("[oauthService] Code already used but session exists, skipping");
                    return { skipped: true, session: existingSession };
                }
                throw handleSupabaseError(error);
            }

            if (data.session) {
                return { session: data.session };
            }
        } catch (err) {
            if (err.message?.includes("already been used") && existingSession) {
                return { skipped: true, session: existingSession };
            }
            throw err;
        }
    }

    // 2. Try Implicit (access_token) - usually in hash
    const hashParams = parseUrlParams(url, true);
    if (hashParams.access_token && hashParams.refresh_token) {
        console.log("[oauthService] Implicit token found, setting session...");
        const { data, error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token,
        });
        if (error) throw handleSupabaseError(error);

        if (data.session) {
            return { session: data.session };
        }
    }

    // 3. Fallback: Check if session was created automatically by Supabase 
    // Or if we already have one from a parallel call
    if (existingSession) {
        console.log("[oauthService] Using existing session as fallback");
        return { session: existingSession, skipped: true };
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
        return { session };
    }

    throw createAuthError(AuthErrors.INVALID_TOKEN, "No valid session data found in callback");
};
