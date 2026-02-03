// app/_layout.js
import "../polyfills";

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// Use a global to ensure this is truly only called once across re-mounts
let isSplashPrevented = false;

import { AppProviders } from "../providers/AppProviders";
import { GlobalLocationProvider } from "../contexts/GlobalLocationContext";
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
 */
export default function RootLayout() {
	const [appIsReady, setAppIsReady] = useState(false);

	useEffect(() => {
		let isMounted = true;

		async function prepare() {
			try {
				if (!isSplashPrevented) {
					console.log("[RootLayout] Calling SplashScreen.preventAutoHideAsync()");
					await SplashScreen.preventAutoHideAsync().catch(e => {
						console.warn("[RootLayout] SplashScreen.preventAutoHideAsync error:", e.message);
					});
					isSplashPrevented = true;
				}

				// Log deep link info for diagnostics
				console.log("[RootLayout] Linking.createURL('/'):", Linking.createURL("/"));

				// Run migrations and schema reload on startup
				await appMigrationsService.run();

				if (isMounted) setAppIsReady(true);
			} catch (err) {
				console.warn("[RootLayout] Prepare exception:", err);
				if (isMounted) setAppIsReady(true);
			}
		}

		prepare();
		return () => { isMounted = false; };
	}, []);

	useEffect(() => {
		if (appIsReady) {
			const timer = setTimeout(() => {
				console.log("[RootLayout] Attempting to hide SplashScreen");
				SplashScreen.hideAsync().catch(err => {
					console.log("[RootLayout] SplashScreen.hideAsync error:", err.message);
				});
			}, 200);
			return () => clearTimeout(timer);
		}
	}, [appIsReady]);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<GlobalErrorBoundary>
				<GlobalLocationProvider>
					<AppProviders>
						<View style={{ flex: 1 }}>
							<AuthenticatedStack />
							<View className="absolute right-0 top-16 px-2 py-4">
								<ThemeToggle showLabel={false} />
							</View>
						</View>
					</AppProviders>
				</GlobalLocationProvider>
			</GlobalErrorBoundary>
		</GestureHandlerRootView>
	);
}

/**
 * Stack navigator that observes auth state
 */
function AuthenticatedStack() {
	const { user, login, syncUserData, loading } = useAuth();
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const router = useRouter();
	const segments = useSegments();

	useEffect(() => {
		const handleDeepLink = async (event) => {
			const url = event.url;
			if (!url) return;

			// Log URL scheme without exposing tokens
			const urlScheme = url.split('://')[0] || 'unknown';
			console.log("[DeepLink] Received URL with scheme:", urlScheme);

			// Let the dedicated auth callback page handle auth callbacks
			const isAuthCallback = url.includes("auth/callback") || url.includes("code=") || url.includes("access_token=");
			console.log("[DeepLink] URL check:", { scheme: urlScheme, isAuthCallback });

			if (isAuthCallback) {
				console.log("[DeepLink] Redirecting to auth callback page");
				router.replace("/auth/callback");
				return;
			}

			// Prevent loop on base app URLs
			const isRootDevUrl = url.includes(":8081") && !url.includes("?") && !url.includes("#");
			const isBaseUrl =
				url === Linking.createURL("/") ||
				url === Linking.createURL("") ||
				url === "ivisit://" ||
				url.endsWith("/--") ||
				isRootDevUrl;

			if (user?.isAuthenticated && !isBaseUrl && !isAuthCallback) {
				console.log("[DeepLink] Non-auth route received, user is already logged in");
				router.replace("/(user)/(tabs)");
			}
		};

		Linking.getInitialURL().then((url) => {
			if (url) handleDeepLink({ url });
		});

		const subscription = Linking.addEventListener("url", handleDeepLink);
		return () => subscription.remove();
	}, [user?.isAuthenticated, router]);

	useEffect(() => {
		const rootGroup = segments?.[0] ?? null;
		const onCompleteProfile =
			segments?.[0] === "(user)" &&
			segments?.[1] === "(stacks)" &&
			segments?.[2] === "complete-profile";

		// Don't do anything while auth is still loading
		if (loading) {
			return;
		}

		// Only navigate to login if we're sure user is not authenticated
		if (!user.isAuthenticated) {
			if (rootGroup !== "(auth)") {
				router.replace("/(auth)");
			}
			return;
		}

		if (!isProfileComplete(user) && !onCompleteProfile) {
			router.replace("/(user)/(stacks)/complete-profile");
			return;
		}

		if (rootGroup === "(auth)" || rootGroup !== "(user)") {
			router.replace("/(user)/(tabs)");
		}
	}, [segments, user, loading]);

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#0D121D" : "#FFFFFF"}
			/>
			{loading ? (
				<View style={{ 
					flex: 1, 
					justifyContent: 'center', 
					alignItems: 'center',
					backgroundColor: isDarkMode ? '#0D121D' : '#FFFFFF'
				}}>
					<ActivityIndicator size="large" color={isDarkMode ? '#FFFFFF' : '#007AFF'} />
					<Text style={{ 
						marginTop: 20, 
						fontSize: 16, 
						color: isDarkMode ? '#FFFFFF' : '#666',
						textAlign: 'center'
					}}>
						Checking authentication...
					</Text>
				</View>
			) : (
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
					<Stack.Screen name="(auth)" />
					<Stack.Screen name="(user)" />
				</Stack>
			)}
		</>
	);
}
