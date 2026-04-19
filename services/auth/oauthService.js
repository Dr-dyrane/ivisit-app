/**
 * OAuth Service
 * Handles OAuth authentication flows (Google, Apple, etc.)
 */

import { supabase } from "../supabase";
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { AuthErrors, createAuthError, handleSupabaseError } from "../../utils/authErrorUtils";

const CALLBACK_DEDUP_WINDOW_MS = 8000;
let inFlightCallbackKey = null;
let inFlightCallbackPromise = null;
let lastCompletedCallbackKey = null;
let lastCompletedCallbackAt = 0;

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
 * Sign in with OAuth Provider (Google, Twitter/X, Apple)
 * @param {string} provider - 'google', 'twitter', 'apple'
 * @returns {Promise<{ data: { url: string } }>}
 */
export const signInWithProvider = async (provider) => {
    // Use Linking.createURL to get platform-appropriate redirect
    // This is registered in Supabase's allowed redirect URLs
    const redirectUrl = getRedirectUrl('auth/callback');
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
    return { data };
};

/**
 * Helper to parse URL parameters
 * @param {string} url 
 * @param {boolean} useHash 
 */
export const parseUrlParams = (url, useHash = false) => {
    try {
        if (!url) return {};

        const parsedUrl = new URL(url);
        const source = useHash
            ? (parsedUrl.hash?.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash || '')
            : (parsedUrl.search?.startsWith('?') ? parsedUrl.search.slice(1) : parsedUrl.search || '');

        if (!source) return {};

        const params = new URLSearchParams(source);
        return Array.from(params.entries()).reduce((acc, [key, value]) => {
            if (key && value) {
                acc[key] = value;
            }
            return acc;
        }, {});
    } catch (e) {
        console.error("Error parsing URL:", e);
        return {};
    }
};

const extractOAuthCallbackParams = (url) => {
    const queryParams = parseUrlParams(url, false);
    const hashParams = parseUrlParams(url, true);
    return {
        ...queryParams,
        ...hashParams,
    };
};

const buildCallbackKey = (url, params = {}) => {
    if (params.code) {
        return `code:${params.code}`;
    }

    if (params.access_token) {
        const token = String(params.access_token);
        return `access:${token.slice(0, 24)}:${token.slice(-24)}`;
    }

    return `url:${String(url || "")}`;
};

/**
 * Handle OAuth callback URL from WebBrowser
 * Returns the session data if successful
 * @param {string} url 
 * @returns {Promise<{ session: Object, skipped?: boolean }>}
 */
export const handleOAuthCallback = async (url) => {
    if (!url) throw createAuthError(AuthErrors.INVALID_TOKEN, "No URL returned");

    const callbackParams = extractOAuthCallbackParams(url);
    const callbackKey = buildCallbackKey(url, callbackParams);
    const now = Date.now();

    if (
        callbackKey === inFlightCallbackKey &&
        inFlightCallbackPromise
    ) {
        console.log("[oauthService] Reusing in-flight OAuth callback");
        return inFlightCallbackPromise;
    }
    
    // Log without exposing tokens (just the scheme and path)
    const urlScheme = url.split('://')[0] || 'unknown';
    const hasAccessToken = Boolean(callbackParams.access_token);
    const hasCode = Boolean(callbackParams.code);
    console.log("[oauthService] handleOAuthCallback processing:", { scheme: urlScheme, hasAccessToken, hasCode });

    const executeCallback = async () => {
        // Check if we already have an active session to avoid redundant exchanges
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (
            callbackKey === lastCompletedCallbackKey &&
            now - lastCompletedCallbackAt < CALLBACK_DEDUP_WINDOW_MS &&
            existingSession
        ) {
            console.log("[oauthService] Skipping recently completed OAuth callback");
            return { skipped: true, session: existingSession };
        }

        if (
            existingSession?.access_token &&
            callbackParams.access_token &&
            existingSession.access_token === callbackParams.access_token
        ) {
            console.log("[oauthService] OAuth callback already resolved to active session");
            return { skipped: true, session: existingSession };
        }

        // Check for error in URL
        // e.g. error=access_denied&error_description=...
        if (callbackParams.error) {
            throw createAuthError(
                AuthErrors.UNKNOWN_ERROR,
                callbackParams.error_description || callbackParams.error || "Login failed"
            );
        }

        // 1. Try PKCE (code) - usually in query params
        if (callbackParams.code) {
            console.log("[oauthService] PKCE code found, exchanging for session...");
            try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(callbackParams.code);
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
        if (callbackParams.access_token && callbackParams.refresh_token) {
            const accessTokenSegments = String(callbackParams.access_token).split('.').length;
            if (accessTokenSegments !== 3) {
                throw createAuthError(
                    AuthErrors.INVALID_TOKEN,
                    `Malformed access token in callback (${accessTokenSegments} segments)`
                );
            }

            console.log("[oauthService] Implicit token found, setting session...", {
                accessTokenSegments,
                refreshTokenLength: String(callbackParams.refresh_token).length,
            });
            const { data, error } = await supabase.auth.setSession({
                access_token: callbackParams.access_token,
                refresh_token: callbackParams.refresh_token,
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

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            return { session };
        }

        throw createAuthError(AuthErrors.INVALID_TOKEN, "No valid session data found in callback");
    };

    inFlightCallbackKey = callbackKey;
    inFlightCallbackPromise = executeCallback()
        .finally(() => {
            lastCompletedCallbackKey = callbackKey;
            lastCompletedCallbackAt = Date.now();
            if (inFlightCallbackKey === callbackKey) {
                inFlightCallbackKey = null;
                inFlightCallbackPromise = null;
            }
        });

    return inFlightCallbackPromise;
};
