// app/_layout.js
import "../polyfills";

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
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
import { isProfileComplete, shouldDeferProfileCompletion } from "../utils/profileCompletion";
import { authService } from "../services/authService";
import { appMigrationsService } from "../services/appMigrationsService";
import { useOTAUpdates } from "../hooks/useOTAUpdates";
import UpdateAvailableModal from "../components/ui/UpdateAvailableModal";
import { getWelcomeRootBackground } from "../constants/welcomeTheme";

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
							<ThemeToggle showLabel={false} />
						</View>
					</AppProviders>
				</GlobalLocationProvider>
			</GlobalErrorBoundary>
		</GestureHandlerRootView>
	);
}

function getPublicAuthRouteFromUrl(url) {
	if (typeof url !== "string" || !url) return null;

	try {
		const parsed = Linking.parse(url);
		const normalizedPath = String(parsed?.path || "")
			.replace(/^--\//, "")
			.replace(/^\/+|\/+$/g, "");

		if (normalizedPath === "map-loading") return "/(auth)/map-loading";
		if (normalizedPath === "map") return "/(auth)/map";
		if (normalizedPath === "request-help") return "/(auth)/request-help";
	} catch (error) {
		console.warn("[DeepLink] Failed to parse initial URL:", error?.message || error);
	}

	if (url.includes("/map-loading")) return "/(auth)/map-loading";
	if (url.includes("/map")) return "/(auth)/map";
	if (url.includes("/request-help")) return "/(auth)/request-help";
	return null;
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
	const pathname = usePathname();
	const [initialRouteResolved, setInitialRouteResolved] = useState(false);
	const [startupPublicRoute, setStartupPublicRoute] = useState(null);
	const loadingBackground = Platform.OS === "web"
		? getWelcomeRootBackground(isDarkMode)
		: isDarkMode
			? "#0D121D"
			: "#FFFFFF";
	const loadingIndicator = Platform.OS === "web"
		? isDarkMode ? "#F8FAFC" : "#86100E"
		: isDarkMode
			? "#FFFFFF"
			: "#007AFF";
	const loadingText = Platform.OS === "web"
		? isDarkMode ? "#D6DFEB" : "#5D677A"
		: isDarkMode
			? "#FFFFFF"
			: "#666";

	// Check for OTA updates on app launch
	const { showModal, showSuccessModal, handleRestart, handleLater, handleDismissSuccess } = useOTAUpdates();

	useEffect(() => {
		let isMounted = true;

		const handleDeepLink = async (event) => {
			const url = event.url;
			if (!url) return;

			// Log URL scheme without exposing tokens
			const urlScheme = url.split("://")[0] || "unknown";
			console.log("[DeepLink] Received URL with scheme:", urlScheme);

			// Let the dedicated auth callback page handle auth callbacks
			const isResetPassword = url.includes("auth/reset-password");
			const isAuthCallback = !isResetPassword && (url.includes("auth/callback") || url.includes("code=") || url.includes("access_token="));
			console.log("[DeepLink] URL check:", { scheme: urlScheme, isAuthCallback, isResetPassword });

			if (isResetPassword) {
				router.replace("/auth/reset-password");
				return;
			}

			if (isAuthCallback) {
				console.log("[DeepLink] Redirecting to auth callback page");
				router.replace("/auth/callback");
				return;
			}

			const publicAuthRoute = getPublicAuthRouteFromUrl(url);
			if (publicAuthRoute) {
				console.log("[DeepLink] Restoring public route:", publicAuthRoute);
				if (isMounted) setStartupPublicRoute(publicAuthRoute);
				router.replace(publicAuthRoute);
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

		const hydrateInitialRoute = async () => {
			try {
				const url = await Linking.getInitialURL();
				if (url) {
					await handleDeepLink({ url });
				}
			} finally {
				if (isMounted) setInitialRouteResolved(true);
			}
		};

		hydrateInitialRoute();

		const subscription = Linking.addEventListener("url", (event) => {
			void handleDeepLink(event);
			if (isMounted) setInitialRouteResolved(true);
		});
		return () => {
			isMounted = false;
			subscription.remove();
		};
	}, [user?.isAuthenticated, router]);

	useEffect(() => {
		const rootGroup = segments?.[0] ?? null;
		const onCompleteProfile =
			segments?.[0] === "(user)" &&
			segments?.[1] === "(stacks)" &&
			segments?.[2] === "complete-profile";
		const isPublicMapFlow =
			pathname === "/map-loading" ||
			pathname === "/map" ||
			pathname === "/request-help" ||
			startupPublicRoute === "/(auth)/map-loading" ||
			startupPublicRoute === "/(auth)/map" ||
			startupPublicRoute === "/(auth)/request-help";

		// Don't do anything while auth is still loading or startup route has not resolved yet
		if (loading || !initialRouteResolved) {
			return;
		}

		// Only navigate to login if we're sure user is not authenticated
		if (!user.isAuthenticated) {
			if (!pathname) {
				return;
			}
			if (!isPublicMapFlow && rootGroup !== "(auth)") {
				router.replace("/(auth)");
			}
			return;
		}

		const deferProfileCompletion = shouldDeferProfileCompletion(user);
		const profileComplete = isProfileComplete(user);

		if (!profileComplete && !onCompleteProfile && !deferProfileCompletion) {
			router.replace("/(user)/(stacks)/complete-profile");
			return;
		}

		if (profileComplete && deferProfileCompletion) {
			authService.clearEmergencyProfileCompletionDeferred().catch((error) => {
				console.warn("[RootLayout] Failed to clear deferred profile completion flag:", error);
			});
		}

		if (!isPublicMapFlow && (rootGroup === "(auth)" || rootGroup !== "(user)")) {
			router.replace("/(user)/(tabs)");
		}
	}, [initialRouteResolved, loading, pathname, router, segments, startupPublicRoute, user]);

	useEffect(() => {
		if (!startupPublicRoute) return;
		if (
			(startupPublicRoute === "/(auth)/map-loading" && pathname === "/map-loading") ||
			(startupPublicRoute === "/(auth)/map" && pathname === "/map") ||
			(startupPublicRoute === "/(auth)/request-help" && pathname === "/request-help")
		) {
			setStartupPublicRoute(null);
		}
	}, [pathname, startupPublicRoute]);

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
					backgroundColor: loadingBackground,
				}}>
					<ActivityIndicator size="large" color={loadingIndicator} />
					<Text style={{
						marginTop: 20,
						fontSize: 16,
						color: loadingText,
						textAlign: 'center'
					}}>
						Opening iVisit...
					</Text>
				</View>
			) : (
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
					<Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
					<Stack.Screen name="(auth)" />
					<Stack.Screen name="(user)" />
				</Stack>
			)}

			{/* [OTA-UPDATE-REDESIGN] Custom premium bottom sheet for app updates */}
			<UpdateAvailableModal
				visible={showModal}
				variant="available"
				onRestart={handleRestart}
				onLater={handleLater}
			/>

			{/* [OTA-UPDATE-SUCCESS] Success modal after update is applied */}
			<UpdateAvailableModal
				visible={showSuccessModal}
				variant="completed"
				onDismiss={handleDismissSuccess}
			/>
		</>
	);
}
