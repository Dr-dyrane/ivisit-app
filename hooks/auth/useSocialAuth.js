import { useCallback, useContext } from "react";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { authService } from "../../services/authService";
import { supabase } from "../../services/supabase";
import { AuthContext } from "../../contexts/AuthContext";

/**
 * Robust Social Auth Hook
 *
 * Strategy for OAuth redirects across all platforms:
 *
 * 1. Supabase OAuth Request: Uses Linking.createURL() which gives:
 *    - Expo Go: exp://192.168.x.x:8081/--/auth/callback
 *    - Production APK/AAB: ivisit://auth/callback
 *
 * 2. WebBrowser.openAuthSessionAsync: Uses CUSTOM SCHEME (ivisit://auth/callback)
 *    - This is the "return URL" that the browser listens for to close
 *    - Works because the deep link handler in _layout.js catches ALL incoming URLs
 *    - The browser will close when it sees ANY URL starting with ivisit://
 *
 * 3. Deep Link Handler (_layout.js): Catches the actual redirect URL and processes it
 *    - In Expo Go: catches exp://... URL from Supabase redirect
 *    - In Production: catches ivisit://... URL from Supabase redirect
 *
 * Android-Specific Considerations:
 *    - createTask: false - Keeps browser in same task as app for proper redirect handling
 *    - If Google/OAuth app is installed, it may intercept the auth URL instead of Chrome Custom Tabs
 *    - Using preferredBrowserPackage can force Chrome Custom Tabs to handle auth
 *
 * See: docs/flows/auth/OAUTH_TROUBLESHOOTING.md for more details
 */
export function useSocialAuth() {
	const { login } = useContext(AuthContext);

	const signInWithProvider = useCallback(async (provider) => {
		try {
			await WebBrowser.warmUpAsync();
			const { data } = await authService.signInWithProvider(provider);

			if (data?.url) {
				// Log OAuth URL without sensitive data
				console.log("[useSocialAuth] OAuth URL received for provider");

				// Determine the correct browser return URL based on platform
				//
				// iOS: Use custom scheme - Safari closes when it detects ivisit://
				//      The exp:// redirect is caught by deep link handler in _layout.js
				//
				// Android Expo Go: Use the ACTUAL exp:// redirect URL
				//      Chrome Custom Tabs needs to match the exact redirect URL to close properly
				//      Using ivisit:// doesn't work because Supabase redirects to exp://
				//
				// Android Production: Use custom scheme ivisit://
				const isExpoGo = Constants.appOwnership === "expo";
				const isAndroid = Platform.OS === "android";

				let browserReturnUrl;
				if (isAndroid && isExpoGo) {
					// For Android Expo Go, use the actual exp:// URL that Supabase will redirect to
					browserReturnUrl = Linking.createURL("auth/callback");
				} else {
					// For iOS (all) and Android Production, use custom scheme
					browserReturnUrl = "ivisit://auth/callback";
				}

				console.log("[useSocialAuth] Platform:", Platform.OS, "| Expo Go:", isExpoGo, "| Return URL scheme:", isAndroid && isExpoGo ? "exp://" : "ivisit://");

				// Build platform-specific options for WebBrowser
				// Android: createTask: false keeps browser in same task for proper redirect
				// Android: showInRecents: false prevents separate entry in recents
				const browserOptions = {
					preferEphemeralSession: false,
					...(Platform.OS === "android" && {
						createTask: false,
						showInRecents: false,
					}),
					...(Platform.OS === "ios" && {
						showInRecents: true,
					}),
				};

				// Log browser options (no sensitive data)
				console.log("[useSocialAuth] Browser options:", browserOptions);

				const result = await WebBrowser.openAuthSessionAsync(
					data.url,
					browserReturnUrl,
					browserOptions
				);

				// Log result type without exposing tokens
				console.log("[useSocialAuth] WebBrowser result type:", result.type);

				if (result.type === "success" && result.url) {
					console.log("[useSocialAuth] Processing OAuth callback...");
					const callbackResult = await authService.handleOAuthCallback(result.url);

					const { data: authData, skipped } = callbackResult;

					if (skipped) {
						console.log("[useSocialAuth] Auth already handled by deep link listener");
						return { success: true };
					}

					if (authData?.user) {
						console.log("[useSocialAuth] Authentication successful");
						await login(authData.user);
						return { success: true };
					} else {
						return { success: false, error: "Authentication failed" };
					}
				} else if (result.type === "cancel" || result.type === "dismiss") {
					console.log(`[useSocialAuth] Auth ${result.type}, checking for background success...`);

					// Check if the deep link handler in _layout.js already processed the auth
					// This is common in Expo Go where the exp:// URL is handled separately
					const { data: { session } } = await supabase.auth.getSession();
					if (session?.user) {
						console.log("[useSocialAuth] Session found! Deep link handler processed auth.");
						const profile = await authService.getUserProfile(session.user.id);
						const user = authService._formatUser(session.user, session.access_token, profile);
						await login(user);
						return { success: true };
					}

					return { success: false, error: result.type };
				} else {
					return { success: false, error: "Unexpected authentication result" };
				}
			}
			return { success: false, error: "Cancelled or failed" };
		} catch (error) {
			console.error("Social Auth Error:", error);

			let errorMessage = "Failed to initiate login";

			if (error.message) {
				if (error.message.includes("network") || error.message.includes("connection")) {
					errorMessage = "Network connection error. Please check your internet.";
				} else if (error.message.includes("popup") || error.message.includes("blocked")) {
					errorMessage = "Popup was blocked. Please allow popups for this app.";
				} else if (error.message.includes("cancelled") || error.message.includes("dismissed")) {
					errorMessage = "cancelled";
				} else {
					errorMessage = error.message;
				}
			}

			return { success: false, error: errorMessage };
		} finally {
			await WebBrowser.coolDownAsync();
		}
	}, [login]);

	return {
		signInWithProvider,
	};
}
