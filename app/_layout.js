"use client";

import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import ToastProvider from "../contexts/ToastContext";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import * as SplashScreen from "expo-splash-screen";
import ThemeToggle from "../components/ThemeToggle";

// Hide Expo splash immediately on app launch
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
	return (
		<AuthProvider>
			<ThemeProvider>
				<ToastProvider>
					<View style={{ flex: 1 }}>
						<AuthenticatedStack />
						{/* Theme Toggle - Absolute Top Left */}
						{/* <View className="absolute left-0 top-[320px] p-4">
							<ThemeToggle showLabel={false} />
						</View> */}
					</View>
				</ToastProvider>
			</ThemeProvider>
		</AuthProvider>
	);
}

// Separate the Stack logic into its own component so it can use the Auth context
function AuthenticatedStack() {
	const { user } = useAuth(); // Destructure user from the AuthContext
	const { isDarkMode } = useTheme(); // Get theme from ThemeContext
	const router = useRouter(); // Get the router instance

	// Listen for authentication changes and redirect accordingly
	useEffect(() => {
		if (user.isAuthenticated) {
			router.replace("(user)");
		} else {
			router.replace("(auth)");
		}
	}, [user, router]);

	return (
		<>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#0D121D" : "#fff"}
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
