// app/_layout.js

"use client";

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
		SplashScreen.hideAsync().catch(() => {});
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
		if (user.isAuthenticated) router.replace("(user)");
		else router.replace("(auth)");
	}, [user, router]);

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#0D121D" : "#FFFFFF"}
			/>
			<Stack>
				<Stack.Screen
					name={user.isAuthenticated ? "(user)" : "(auth)"}
					options={{ headerShown: false }}
				/>
			</Stack>
		</>
	);
}
