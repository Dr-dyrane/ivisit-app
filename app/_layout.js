// app/_layout.js

import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import ToastProvider from "../contexts/ToastContext";
import ThemeToggle from "../components/ThemeToggle";

/**
 * Root layout wraps the entire app with context providers
 * - AuthProvider: Authentication state
 * - ThemeProvider: Dark/Light mode
 * - ToastProvider: Notifications
 * Also includes global StatusBar and Theme toggle
 */
export default function RootLayout() {
	// Prevent automatic splash screen hide
	useEffect(() => {
		// Prevent the splash screen from auto-hiding so the router or app can hide it when ready
		SplashScreen.preventAutoHideAsync?.().catch(() => {});
	}, []);

	return (
		<AuthProvider>
			<ThemeProvider>
				<ToastProvider>
					<View style={{ flex: 1 }}>
						<AuthenticatedStack />
						{/* Theme toggle (optional absolute positioning) */}
						<View className="absolute right-0 top-16 px-2 py-4">
							<ThemeToggle showLabel={false} />
						</View>
					</View>
				</ToastProvider>
			</ThemeProvider>
		</AuthProvider>
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

	// Redirect based on authentication state
	useEffect(() => {
		// Use a small delay to ensure navigation completes properly
		const timer = setTimeout(() => {
			if (user.isAuthenticated) {
				router.replace("/(user)/(tabs)");
			} else {
				router.replace("/(auth)");
			}
		}, 100);

		return () => clearTimeout(timer);
	}, [user.isAuthenticated]);

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
