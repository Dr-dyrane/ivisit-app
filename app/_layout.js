"use client";

import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import ToastProvider from "../contexts/ToastContext";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";


export default function RootLayout() {
	const [appIsReady, setAppIsReady] = useState(false);

	useEffect(() => {
		async function prepareApp() {
			try {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}

		prepareApp();
	}, []);

	if (!appIsReady) {
		return null;
	}

	return (
		<AuthProvider>
			<ThemeProvider>
				<ToastProvider>
					<AuthenticatedStack />
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
		<View className={isDarkMode ? "dark" : ""} style={{ flex: 1 }}>
			<StatusBar
				style={isDarkMode ? "light" : "dark"}
				backgroundColor={isDarkMode ? "#2C2C2C" : "#FCF5F5"}
			/>
			<Stack>
				<Stack.Screen
					name={user.isAuthenticated ? "(user)" : "(auth)"}
					options={{ headerShown: false }}
				/>
			</Stack>
		</View>
	);
}
