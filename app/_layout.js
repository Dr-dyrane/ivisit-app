// app/_layout.js

import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import ToastProvider from "../contexts/ToastContext";
import ThemeToggle from "../components/ThemeToggle";
import { isProfileComplete } from "../utils/profileCompletion";

/**
 * Root layout wraps the entire app with context providers
 * - AuthProvider: Authentication state
 * - ThemeProvider: Dark/Light mode
 * - TabBarVisibilityProvider: Bottom navigation scroll-aware behavior
 * - ScrollAwareHeaderProvider: Header scroll-aware behavior
 * - EmergencyProvider: Emergency/booking state persistence
 * - ToastProvider: Notifications
 * Also includes global StatusBar and Theme toggle
 */
export default function RootLayout() {
	useEffect(() => {
		SplashScreen.preventAutoHideAsync?.().catch(() => {});
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AuthProvider>
				<ThemeProvider>
					<TabBarVisibilityProvider>
						<ScrollAwareHeaderProvider>
							<EmergencyProvider>
								<ToastProvider>
									<View style={{ flex: 1 }}>
										<AuthenticatedStack />
										{/* Theme toggle (optional absolute positioning) */}
										<View className="absolute right-0 top-16 px-2 py-4">
											<ThemeToggle showLabel={false} />
										</View>
									</View>
								</ToastProvider>
							</EmergencyProvider>
						</ScrollAwareHeaderProvider>
					</TabBarVisibilityProvider>
				</ThemeProvider>
			</AuthProvider>
		</GestureHandlerRootView>
	);
}

/**
 * Stack navigator that observes auth state
 * Redirects automatically to auth/user stacks
 */
function AuthenticatedStack() {
	const { user } = useAuth();
	const { isDarkMode } = useTheme();
	const router = useRouter();
	const segments = useSegments();

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
