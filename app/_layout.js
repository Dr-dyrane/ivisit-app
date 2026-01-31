// app/_layout.js
import "../polyfills";

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";

import { AppProviders } from "../providers/AppProviders";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import ThemeToggle from "../components/ThemeToggle";
import GlobalErrorBoundary from "../components/GlobalErrorBoundary";
import { isProfileComplete } from "../utils/profileCompletion";
import { authService } from "../services/authService";

import { appMigrationsService } from "../services/appMigrationsService";

/**
 * Root layout wraps the entire app with context providers
 * - Refactored to use AppProviders for cleaner modularity
 *
 * File Path: app/_layout.js
 */
export default function RootLayout() {
	const [appIsReady, setAppIsReady] = useState(false);

	useEffect(() => {
		async function prepare() {
			try {
				// Prevent splash screen from auto-hiding
				await SplashScreen.preventAutoHideAsync();
				
				// Run migrations and schema reload on startup
				await appMigrationsService.run();
				
				// Mark app as ready
				setAppIsReady(true);
			} catch (err) {
				console.log("Migration error:", err);
				// Still mark as ready even if migrations fail
				setAppIsReady(true);
			}
		}

		prepare();
	}, []);

	useEffect(() => {
		// Hide splash screen when app is ready
		if (appIsReady) {
			SplashScreen.hideAsync().catch(err => console.log("SplashScreen.hide error:", err));
		}
	}, [appIsReady]);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<GlobalErrorBoundary>
				<AppProviders>
					<View style={{ flex: 1 }}>
						<AuthenticatedStack />
						{/* Theme toggle (optional absolute positioning) */}
						<View className="absolute right-0 top-16 px-2 py-4">
							<ThemeToggle showLabel={false} />
						</View>
					</View>
				</AppProviders>
			</GlobalErrorBoundary>
		</GestureHandlerRootView>
	);
}

/**
 * Stack navigator that observes auth state
 * Redirects automatically to auth/user stacks
 */
function AuthenticatedStack() {
	const { user, login, syncUserData } = useAuth();
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const router = useRouter();
	const segments = useSegments();

	// Deep Link Handling for Magic Links / OAuth
	useEffect(() => {
		const handleDeepLink = async (event) => {
			const url = event.url;
			if (!url) return;

			console.log("[DeepLink] Handling URL:", url);

			// Check if it's an auth callback (Magic Link or OAuth)
			if (url.includes("auth/callback")) {
				try {
					// Let authService parse and handle the session exchange
					const result = await authService.handleOAuthCallback(url);

					if (result?.data?.user) {
						await login(result.data.user);
						await syncUserData();
						showToast("Successfully logged in via email link!", "success");
						
						// Redirect to home after successful auth
						setTimeout(() => {
							router.replace("/(user)/(tabs)");
						}, 500);
					}
				} catch (error) {
					console.error("Deep Link Auth Error:", error);
					showToast("Failed to verify login link: " + error.message, "error");
					
					// Redirect to auth on error
					setTimeout(() => {
						router.replace("/(auth)");
					}, 500);
				}
			} else {
				// Handle unmatched routes - redirect authenticated users to home
				// 🔴 REVERT POINT: Fix deep link infinite loop for localhost URLs
				// PREVIOUS: Redirected all unmatched routes including localhost:8081
				// NEW: Skip localhost development URLs to prevent infinite loops
				// REVERT TO: Remove the localhost check
				if (user?.isAuthenticated && !url.includes("localhost:8081")) {
					console.log("[DeepLink] Unmatched route, redirecting authenticated user to home");
					setTimeout(() => {
						router.replace("/(user)/(tabs)");
					}, 500);
				}
			}
		};

		// Handle initial URL (if app was closed)
		Linking.getInitialURL().then((url) => {
			if (url) handleDeepLink({ url });
		});

		// Listen for new URLs (if app is open/background)
		const subscription = Linking.addEventListener("url", handleDeepLink);

		return () => {
			subscription.remove();
		};
	}, [user?.isAuthenticated, login, syncUserData, showToast, router]);

	// Redirect based on authentication state
	useEffect(() => {
		// Use a small delay to ensure navigation completes properly
		const timer = setTimeout(() => {
			const rootGroup = segments?.[0] ?? null;
			const onCompleteProfile =
				segments?.[0] === "(user)" &&
				segments?.[1] === "(stacks)" &&
				segments?.[2] === "complete-profile";

			if (!user.isAuthenticated) {
				if (rootGroup !== "(auth)") {
					router.replace("/(auth)");
				}
				return;
			}

			const profileComplete = isProfileComplete(user);
			if (!profileComplete && !onCompleteProfile) {
				router.replace("/(user)/(stacks)/complete-profile");
				return;
			}

			if (rootGroup === "(auth)") {
				router.replace("/(user)/(tabs)");
				return;
			}

			if (rootGroup !== "(user)") {
				router.replace("/(user)/(tabs)");
			}
		}, 100);

		return () => clearTimeout(timer);
	}, [segments, user]);

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#0D121D" : "#FFFFFF"}
			/>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(user)" />
			</Stack>
		</>
	);
}
